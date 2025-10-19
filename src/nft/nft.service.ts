import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { CreateNFTDto } from "./dto/create-nft.dto";
import { UpdateNFTDto } from "./dto/update-nft.dto";
import { NFT } from "../common/entities";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "../common/dto/pagination.dto";
import {
  NFTRepository,
  UserRepository,
  NFTHistoryRepository,
  CollectionRepository,
} from "../common/repositories";
import { S3Service } from "../common/services/s3.service";
import { BlockchainService } from "../common/services/blockchain.service";

@Injectable()
export class NFTService {
  constructor(
    private nftRepository: NFTRepository,
    private userRepository: UserRepository,
    private nftHistoryRepository: NFTHistoryRepository,
    private collectionRepository: CollectionRepository,
    private s3Service: S3Service,
    private blockchainService: BlockchainService
  ) {}

  async create(createNFTDto: CreateNFTDto, ownerId: number): Promise<NFT> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Verify collection exists and user owns it (if collectionId is provided)
    if (createNFTDto.collectionId) {
      const collection = await this.collectionRepository.findOne({
        where: { id: createNFTDto.collectionId },
      });
      if (!collection) {
        throw new NotFoundException("Collection not found");
      }

      if (collection.creatorId !== ownerId) {
        throw new ForbiddenException(
          "You can only add NFTs to your own collections"
        );
      }
    }

    // Generate unique token ID
    const tokenId = this.generateTokenId();

    // Create NFT
    const nft = this.nftRepository.create({
      ...createNFTDto,
      tokenId,
      ownerId,
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
      .orderBy("nft.createdAt", "DESC");

    if (search) {
      queryBuilder.where(
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
      relations: ["owner"],
    });

    if (!nft) {
      throw new NotFoundException(`NFT with ID ${id} not found`);
    }

    return nft;
  }

  async findByOwner(ownerId: number): Promise<NFT[]> {
    return this.nftRepository.findByOwner(ownerId);
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

  async getNFTHistory(
    nftId: number
  ): Promise<import("../common/entities/nft-history.entity").NFTHistory[]> {
    return this.nftHistoryRepository.findByNFT(nftId);
  }

  async getUserTransactionHistory(
    userId: number
  ): Promise<import("../common/entities/nft-history.entity").NFTHistory[]> {
    return this.nftHistoryRepository.findByUser(userId);
  }

  async getSaleHistory(): Promise<
    import("../common/entities/nft-history.entity").NFTHistory[]
  > {
    return this.nftHistoryRepository.findAllSales();
  }

  async transferNFT(
    nftId: number,
    fromUserId: number,
    toUserId: number,
    transactionHash?: string
  ): Promise<void> {
    const nft = await this.findOne(nftId);

    // Check if user owns the NFT
    if (nft.ownerId !== fromUserId) {
      throw new ForbiddenException("You can only transfer your own NFTs");
    }

    // Check if NFT is for sale
    if (!nft.isForSale) {
      throw new ForbiddenException("NFT is not for sale");
    }

    // Verify new owner exists
    const newOwner = await this.userRepository.findOne({
      where: { id: toUserId },
    });
    if (!newOwner) {
      throw new NotFoundException("New owner not found");
    }

    // Update NFT ownership
    await this.nftRepository.update(nftId, {
      ownerId: toUserId,
      isForSale: false, // Remove from sale when transferred
    });

    // Create history record for the transfer/sale using NFT's current price
    await this.nftHistoryRepository.createHistoryRecord({
      nftId,
      formerOwnerId: fromUserId,
      currentOwnerId: toUserId,
      price: nft.price, // Use NFT's current price
      transactionHash,
    });
  }

  async confirmTransfer(
    nftId: number,
    requesterUserId: number,
    txHash: string
  ): Promise<void> {
    const nft = await this.findOne(nftId);

    const fromUser = await this.userRepository.findOne({
      where: { id: nft.ownerId },
    });
    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
    });
    if (!fromUser || !requester) throw new NotFoundException("User not found");

    const receipt = await this.blockchainService.getReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new ForbiddenException("Transaction not found or failed");
    }

    const transfers = this.blockchainService.parseErc721Transfers(
      receipt,
      nft.contractAddress || undefined
    );

    const match = transfers.find(
      (t) =>
        (!nft.contractAddress ||
          t.address.toLowerCase() === nft.contractAddress.toLowerCase()) &&
        t.tokenId === String(nft.tokenId) &&
        t.from.toLowerCase() === fromUser.walletAddress.toLowerCase() &&
        t.to.toLowerCase() === requester.walletAddress.toLowerCase()
    );

    if (!match) {
      throw new ForbiddenException("Receipt does not match expected transfer");
    }

    await this.nftRepository.update(nftId, {
      ownerId: requesterUserId,
      isForSale: false,
    });

    await this.nftHistoryRepository.createHistoryRecord({
      nftId,
      formerOwnerId: fromUser.id,
      currentOwnerId: requesterUserId,
      price: nft.price,
      transactionHash: txHash,
    });
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

    await this.nftRepository.update(nftId, {
      tokenId: mintLog.tokenId,
      contractAddress: mintLog.address,
      ownerId: requesterUserId,
    });
  }

  private generateTokenId(): string {
    // Generate a unique token ID
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
