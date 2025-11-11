import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ethers } from "ethers";
import { CreateNFTDto } from "./dto/create-nft.dto";
import { UpdateNFTDto } from "./dto/update-nft.dto";
import { NFT } from "@/common/entities";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "@/common/dto/pagination.dto";
import {
  NFTRepository,
  UserRepository,
  CollectionRepository,
  NFTEventRepository,
} from "@/common/repositories";
import { NFTEvent, NFTEventType } from "@/common/entities";
import { S3Service } from "@/common/services/s3.service";
import { BlockchainService } from "@/common/services/blockchain.service";
import { DeploymentService } from "@/common/services/deployment.service";

@Injectable()
export class NFTService {
  constructor(
    private nftRepository: NFTRepository,
    private userRepository: UserRepository,
    private collectionRepository: CollectionRepository,
    private nftEventRepository: NFTEventRepository,
    private s3Service: S3Service,
    private blockchainService: BlockchainService,
    private deploymentService: DeploymentService
  ) {}

  /**
   * Helper method to create NFT event
   */
  private async createNFTEvent(
    nftId: number,
    eventType: NFTEventType,
    fromAddress: string | null,
    toAddress: string | null,
    priceWei: string | null,
    txHash: string,
    receipt: ethers.providers.TransactionReceipt,
    logIndex?: number
  ): Promise<void> {
    // Check if event already exists (idempotency)
    const existingEvent = await this.nftEventRepository.findByTxHashAndLogIndex(
      txHash,
      logIndex ?? 0
    );
    if (existingEvent) {
      return; // Event already exists, skip creation
    }

    const blockTimestamp = await this.blockchainService.getBlockTimestamp(
      receipt.blockNumber
    );

    await this.nftEventRepository.createEvent({
      nftId,
      eventType,
      fromAddress,
      toAddress,
      priceWei,
      txHash,
      logIndex: logIndex ?? 0,
      blockNumber: receipt.blockNumber,
      blockTimestamp,
      chainId: 97, // BSC Testnet
    });
  }

  async create(createNFTDto: CreateNFTDto, ownerId: number): Promise<NFT> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify collection exists and user owns it (if collectionId is provided)
    let collectionRoyalty: number | null = null;
    let collectionCreatorId: number | null = null;
    let collectionContractAddress: string | null = null;
    if (createNFTDto.collectionId) {
      const collection = await this.collectionRepository.findById(
        createNFTDto.collectionId
      );
      if (!collection) {
        throw new NotFoundException("Collection not found");
      }

      if (collection.creatorId !== ownerId) {
        throw new ForbiddenException(
          "You can only add NFTs to your own collections"
        );
      }

      collectionRoyalty = collection.royaltyPercent ?? null;
      collectionCreatorId = collection.creatorId;
      collectionContractAddress = collection.contractAddress;
    }

    // Create NFT (tokenId will be set later in confirmMint)
    const nft = this.nftRepository.create({
      ...createNFTDto,
      tokenId: null, // Will be set when confirming mint
      contractAddress: collectionContractAddress, // Set from collection
      ownerId,
      creatorId: collectionCreatorId ?? ownerId,
      royaltyPercent:
        createNFTDto.royaltyPercent !== undefined
          ? createNFTDto.royaltyPercent
          : collectionRoyalty,
    });

    const savedNFT = await this.nftRepository.save(nft);

    return savedNFT;
  }

  async findAll(
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.nftRepository
      .createQueryBuilder("nft")
      .leftJoinAndSelect("nft.owner", "owner")
      .leftJoinAndSelect("nft.collection", "collection")
      .where("nft.isForSale = :isForSale", { isForSale: true })
      .orderBy("nft.createdAt", "DESC");

    if (search) {
      queryBuilder.andWhere(
        "nft.name ILIKE :search OR nft.description ILIKE :search",
        { search: `%${search}%` }
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findByCollection(
    collectionId: number,
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.nftRepository
      .createQueryBuilder("nft")
      .leftJoinAndSelect("nft.owner", "owner")
      .leftJoinAndSelect("nft.collection", "collection")
      .where("nft.collectionId = :collectionId", { collectionId })
      .orderBy("nft.createdAt", "DESC");

    if (search) {
      queryBuilder.andWhere(
        "nft.name ILIKE :search OR nft.description ILIKE :search",
        { search: `%${search}%` }
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findForSale(): Promise<NFT[]> {
    return this.nftRepository.findForSale();
  }

  async findOne(id: number): Promise<NFT> {
    const nft = await this.nftRepository.findOne({
      where: { id },
      relations: ["owner", "collection"],
    });

    if (!nft) {
      throw new NotFoundException(`NFT with ID ${id} not found`);
    }

    return nft;
  }

  async findByOwner(ownerId: number): Promise<NFT[]> {
    return this.nftRepository.findByOwner(ownerId);
  }

  async findByOwnerWithPagination(
    ownerId: number,
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    return this.nftRepository.findByOwnerWithPagination(ownerId, paginationDto);
  }

  async update(
    id: number,
    updateNFTDto: UpdateNFTDto,
    userId: number
  ): Promise<NFT> {
    const nft = await this.findOne(id);

    // Check if user owns the NFT
    if (nft.ownerId !== userId) {
      throw new ForbiddenException("You can only update your own NFTs");
    }

    // Update NFT (no history tracking for simple updates)
    await this.nftRepository.update(id, updateNFTDto);

    return this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const nft = await this.findOne(id);

    // Check if user owns the NFT
    if (nft.ownerId !== userId) {
      throw new ForbiddenException("You can only delete your own NFTs");
    }

    // Delete image from S3 (when implemented)
    // await this.s3Service.deleteFile(nft.imageUrl);

    await this.nftRepository.remove(nft);
  }

  async confirmMint(
    nftId: number,
    requesterUserId: number,
    txHash: string
  ): Promise<void> {
    const nft = await this.findOne(nftId);
    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!requester) throw new NotFoundException("User not found");

    const receipt = await this.blockchainService.getReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new ForbiddenException("Transaction not found or failed");
    }

    const transfers = this.blockchainService.parseErc721Transfers(receipt);
    const zero = "0x0000000000000000000000000000000000000000";
    const mintLog = transfers.find(
      (t) =>
        t.from.toLowerCase() === zero &&
        t.to.toLowerCase() === requester.walletAddress.toLowerCase()
    );

    if (!mintLog) {
      throw new ForbiddenException("No matching mint found in receipt");
    }

    const onChainTokenId = mintLog.tokenId;
    const onChainContractAddress = mintLog.address;

    // Idempotency check: if NFT already has the correct tokenId and contractAddress, skip update
    if (
      nft.tokenId === onChainTokenId &&
      nft.contractAddress?.toLowerCase() ===
        onChainContractAddress.toLowerCase()
    ) {
      return; // Already confirmed, no update needed
    }

    // Update NFT with on-chain data (tokenId is no longer unique, so no need to check for conflicts)
    await this.nftRepository.update(nftId, {
      tokenId: onChainTokenId,
      contractAddress: onChainContractAddress,
      ownerId: requesterUserId,
    });

    // Create MINT event
    // Find the log index for the mint transfer
    const mintLogIndex = receipt.logs.findIndex(
      (log) =>
        log.address.toLowerCase() === onChainContractAddress.toLowerCase() &&
        log.topics?.[0] ===
          ethers.utils.id("Transfer(address,address,uint256)") &&
        ethers.utils
          .getAddress("0x" + log.topics[1].slice(26))
          .toLowerCase() ===
          "0x0000000000000000000000000000000000000000".toLowerCase() &&
        ethers.utils
          .getAddress("0x" + log.topics[2].slice(26))
          .toLowerCase() === requester.walletAddress.toLowerCase()
    );

    await this.createNFTEvent(
      nftId,
      NFTEventType.MINT,
      null, // fromAddress is null for MINT
      requester.walletAddress.toLowerCase(), // toAddress is minter
      null, // priceWei is null for MINT
      txHash,
      receipt,
      mintLogIndex >= 0 ? mintLogIndex : 0
    );
  }

  async confirmList(
    nftId: number,
    requesterUserId: number,
    txHash: string,
    price: number
  ): Promise<void> {
    const nft = await this.findOne(nftId);

    // Validate ownership
    if (nft.ownerId !== requesterUserId) {
      throw new ForbiddenException("You can only list your own NFTs");
    }

    // NFT must have tokenId and contractAddress to confirm listing
    if (!nft.tokenId || !nft.contractAddress) {
      throw new BadRequestException(
        "NFT must be confirmed (minted) before it can be listed"
      );
    }

    // Validate user exists
    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!requester) {
      throw new NotFoundException("User not found");
    }

    // Validate transaction
    const receipt = await this.blockchainService.getReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new ForbiddenException("Transaction not found or failed");
    }

    // Get marketplace address
    const marketplaceAddress = this.deploymentService.getMarketplaceAddress();

    // Parse and validate listing event
    const listedEvent = this.blockchainService.parseNFTListedEvent(
      receipt,
      marketplaceAddress
    );

    if (!listedEvent) {
      throw new ForbiddenException(
        "NFTListed event not found in transaction receipt"
      );
    }

    // Verify event matches this NFT and seller
    const eventMatches =
      listedEvent.nft.toLowerCase() === nft.contractAddress.toLowerCase() &&
      listedEvent.tokenId === nft.tokenId &&
      listedEvent.seller.toLowerCase() ===
        requester.walletAddress.toLowerCase();

    if (!eventMatches) {
      throw new ForbiddenException(
        "Transaction receipt does not match expected listing details"
      );
    }

    // Update NFT to listed status
    await this.nftRepository.update(nftId, {
      isForSale: true,
      price: price,
    });

    // Create LISTED event
    // Find the log index for the NFTListed event
    const marketplaceInterface = new ethers.utils.Interface([
      "event NFTListed(address indexed seller, address indexed nft, uint256 indexed tokenId, uint256 price)",
    ]);
    const NFTListedTopic = marketplaceInterface.getEventTopic("NFTListed");
    const listedLogIndex = receipt.logs.findIndex(
      (l) =>
        l.address.toLowerCase() === marketplaceAddress.toLowerCase() &&
        l.topics?.[0] === NFTListedTopic
    );

    const priceWei = ethers.utils.parseEther(price.toString()).toString();

    await this.createNFTEvent(
      nftId,
      NFTEventType.LISTED,
      requester.walletAddress.toLowerCase(), // fromAddress is seller
      null, // toAddress is null for LISTED
      priceWei, // priceWei is listing price
      txHash,
      receipt,
      listedLogIndex >= 0 ? listedLogIndex : 0
    );
  }

  async confirmUnlist(
    nftId: number,
    requesterUserId: number,
    txHash: string
  ): Promise<void> {
    const nft = await this.findOne(nftId);

    // Validate ownership
    if (nft.ownerId !== requesterUserId) {
      throw new ForbiddenException("You can only unlist your own NFTs");
    }

    // NFT must have tokenId and contractAddress to confirm unlisting
    if (!nft.tokenId || !nft.contractAddress) {
      throw new BadRequestException(
        "NFT must be confirmed (minted) before it can be unlisted"
      );
    }

    // Validate user exists
    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!requester) {
      throw new NotFoundException("User not found");
    }

    // Validate transaction
    const receipt = await this.blockchainService.getReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new ForbiddenException("Transaction not found or failed");
    }

    // Get marketplace address
    const marketplaceAddress = this.deploymentService.getMarketplaceAddress();

    // Parse and validate unlisting event
    const unlistedEvent = this.blockchainService.parseNFTUnlistedEvent(
      receipt,
      marketplaceAddress
    );

    if (!unlistedEvent) {
      throw new ForbiddenException(
        "NFTUnlisted event not found in transaction receipt"
      );
    }

    // Verify event matches this NFT and seller
    const eventMatches =
      unlistedEvent.nft.toLowerCase() === nft.contractAddress.toLowerCase() &&
      unlistedEvent.tokenId === nft.tokenId &&
      unlistedEvent.seller.toLowerCase() ===
        requester.walletAddress.toLowerCase();

    if (!eventMatches) {
      throw new ForbiddenException(
        "Transaction receipt does not match expected unlisting details"
      );
    }

    // Update NFT to unlisted status
    // Keep the price so user can relist with same price or change it when unlisted
    await this.nftRepository.update(nftId, {
      isForSale: false,
      // Don't set price to null - preserve it for potential relisting
    });

    // Create UNLISTED event
    // Find the log index for the NFTUnlisted event
    const marketplaceInterface = new ethers.utils.Interface([
      "event NFTUnlisted(address indexed seller, address indexed nft, uint256 indexed tokenId)",
    ]);
    const NFTUnlistedTopic = marketplaceInterface.getEventTopic("NFTUnlisted");
    const unlistedLogIndex = receipt.logs.findIndex(
      (l) =>
        l.address.toLowerCase() === marketplaceAddress.toLowerCase() &&
        l.topics?.[0] === NFTUnlistedTopic
    );

    await this.createNFTEvent(
      nftId,
      NFTEventType.UNLISTED,
      requester.walletAddress.toLowerCase(), // fromAddress is seller
      null, // toAddress is null for UNLISTED
      null, // priceWei is null for UNLISTED
      txHash,
      receipt,
      unlistedLogIndex >= 0 ? unlistedLogIndex : 0
    );
  }

  /**
   * Sync NFT listing status from blockchain to database
   * Useful when SC state and DB state are out of sync
   */
  /**
   * Confirm NFT purchase from on-chain transaction
   * Updates NFT owner, creates history record, and marks as unlisted
   */
  async confirmPurchase(
    nftId: number,
    buyerUserId: number,
    txHash: string
  ): Promise<void> {
    const nft = await this.findOne(nftId);

    // NFT must have tokenId and contractAddress to confirm purchase
    if (!nft.tokenId || !nft.contractAddress) {
      throw new BadRequestException(
        "NFT must be confirmed (minted) before purchase can be confirmed"
      );
    }

    // Validate buyer exists
    const buyer = await this.userRepository.findOne({
      where: { id: buyerUserId },
    });
    if (!buyer) {
      throw new NotFoundException("Buyer not found");
    }

    // Get transaction receipt
    const receipt = await this.blockchainService.getReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new ForbiddenException("Transaction not found or failed");
    }

    // Get marketplace address
    const marketplaceAddress = this.deploymentService.getMarketplaceAddress();

    // Parse NFTPurchased event
    const purchasedEvent = this.blockchainService.parseNFTPurchasedEvent(
      receipt,
      marketplaceAddress
    );

    if (!purchasedEvent) {
      throw new ForbiddenException(
        "NFTPurchased event not found in transaction receipt"
      );
    }

    // Verify event matches this NFT and buyer
    const eventMatches =
      purchasedEvent.nft.toLowerCase() === nft.contractAddress.toLowerCase() &&
      purchasedEvent.tokenId === nft.tokenId &&
      purchasedEvent.buyer.toLowerCase() === buyer.walletAddress.toLowerCase();

    if (!eventMatches) {
      throw new ForbiddenException(
        "Transaction receipt does not match expected purchase details"
      );
    }

    // Get seller user from wallet address
    const seller = await this.userRepository.findOne({
      where: {
        walletAddress: purchasedEvent.seller.toLowerCase(),
      },
    });

    if (!seller) {
      throw new NotFoundException(
        `Seller with wallet address ${purchasedEvent.seller} not found`
      );
    }

    // Verify seller was the owner
    if (nft.ownerId !== seller.id) {
      throw new BadRequestException(
        "NFT owner mismatch. The seller in the transaction is not the current owner in the database."
      );
    }

    // Update NFT: new owner, unlisted
    await this.nftRepository.update(nftId, {
      ownerId: buyerUserId,
      isForSale: false,
    });

    // Create TRANSFER event
    // Find the log index for the NFTPurchased event
    const marketplaceInterface = new ethers.utils.Interface([
      "event NFTPurchased(address indexed buyer, address indexed seller, address indexed nft, uint256 tokenId, uint256 price, address royaltyReceiver, uint256 royaltyAmount, uint256 platformFee)",
    ]);
    const NFTPurchasedTopic =
      marketplaceInterface.getEventTopic("NFTPurchased");
    const purchasedLogIndex = receipt.logs.findIndex(
      (l) =>
        l.address.toLowerCase() === marketplaceAddress.toLowerCase() &&
        l.topics?.[0] === NFTPurchasedTopic
    );

    await this.createNFTEvent(
      nftId,
      NFTEventType.TRANSFER,
      seller.walletAddress.toLowerCase(), // fromAddress is seller
      buyer.walletAddress.toLowerCase(), // toAddress is buyer
      purchasedEvent.price, // priceWei is purchase price
      txHash,
      receipt,
      purchasedLogIndex >= 0 ? purchasedLogIndex : 0
    );
  }

  async syncListingStatus(
    nftId: number,
    requesterUserId: number
  ): Promise<{ synced: boolean; isListed: boolean; price?: number }> {
    const nft = await this.findOne(nftId);

    // Validate ownership
    if (nft.ownerId !== requesterUserId) {
      throw new ForbiddenException("You can only sync your own NFTs");
    }

    // Validate user exists
    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!requester) {
      throw new NotFoundException("User not found");
    }

    // Validate NFT has contract info
    if (!nft.contractAddress || !nft.tokenId) {
      throw new ForbiddenException(
        "NFT contract information is missing. Cannot sync listing status."
      );
    }

    // Get marketplace address
    const marketplaceAddress = this.deploymentService.getMarketplaceAddress();

    // Get listing from contract
    const listing = await this.blockchainService.getListingFromContract(
      marketplaceAddress,
      nft.contractAddress,
      nft.tokenId
    );

    if (!listing) {
      // Could not fetch from contract - assume not listed
      // Keep existing price when syncing to unlisted state
      await this.nftRepository.update(nftId, {
        isForSale: false,
        // Don't set price to null - preserve existing price
      });
      return { synced: true, isListed: false };
    }

    // Verify seller matches
    if (
      listing.isActive &&
      listing.seller.toLowerCase() !== requester.walletAddress.toLowerCase()
    ) {
      throw new ForbiddenException(
        "NFT is listed by a different seller. Cannot sync."
      );
    }

    // Update database to match blockchain state
    let syncedPrice: number | undefined;
    if (listing.isActive) {
      // If listed on SC, sync the price from SC
      syncedPrice = parseFloat(ethers.utils.formatEther(listing.price));
      await this.nftRepository.update(nftId, {
        isForSale: true,
        price: syncedPrice,
      });
    } else {
      // If unlisted on SC, keep existing price (don't set to null)
      // This allows user to relist with same price or change it
      await this.nftRepository.update(nftId, {
        isForSale: false,
        // Don't update price - preserve existing value
      });
      // Get current price from DB for return value
      const updatedNft = await this.findOne(nftId);
      syncedPrice = updatedNft.price || undefined;
    }

    return {
      synced: true,
      isListed: listing.isActive,
      price: syncedPrice,
    };
  }

  async getNFTEvents(
    nftId: number,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    return this.nftEventRepository.findByNFT(nftId, paginationDto);
  }

  async getEventsByAddress(
    address: string,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    return this.nftEventRepository.findByAddress(address, paginationDto);
  }

  async getEventsByType(
    eventType: NFTEventType,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    return this.nftEventRepository.findByEventType(eventType, paginationDto);
  }
}
