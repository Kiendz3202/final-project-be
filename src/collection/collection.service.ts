import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { Collection } from "@/common/entities";
import { CollectionRepository } from "@/common/repositories/collection.repository";
import { UserRepository } from "@/common/repositories/user.repository";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "@/common/dto/pagination.dto";
import { BlockchainService } from "@/common/services/blockchain.service";
import { DEFAULT_COLLECTION_ROYALTY_PERCENT } from "@/common/constants";
import { NFTRepository, NFTEventRepository } from "@/common/repositories";
import { NFTEventType } from "@/common/entities/nft-event.entity";
import { ethers } from "ethers";
import { CacheService } from "@/common/services/cache.service";

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private userRepository: UserRepository,
    private readonly blockchainService: BlockchainService,
    private readonly nftRepository: NFTRepository,
    private readonly nftEventRepository: NFTEventRepository,
    private cacheService: CacheService
  ) {}

  async create(
    createCollectionDto: CreateCollectionDto,
    creatorId: number
  ): Promise<Collection> {
    // Verify creator exists
    const creator = await this.userRepository.findOne({
      where: { id: creatorId },
    });
    if (!creator) {
      throw new NotFoundException("Creator not found");
    }

    // Create collection
    const collection = this.collectionRepository.create({
      ...createCollectionDto,
      creatorId,
      royaltyPercent:
        createCollectionDto.royaltyPercent !== undefined
          ? createCollectionDto.royaltyPercent
          : DEFAULT_COLLECTION_ROYALTY_PERCENT,
    });

    const savedCollection = await this.collectionRepository.save(collection);

    // Invalidate collection list cache (new collection added)
    await this.cacheService.invalidateAll();

    return savedCollection;
  }

  async findAll(
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<Collection>> {
    const startTime = Date.now();
    const { page = 1, limit = 10, search } = paginationDto;

    // Check if this is a default request (no search) - only cache default requests
    const isDefault = this.cacheService.isCollectionListDefault({
      page,
      limit,
      search,
    });

    // Pre-calculate cache key if default (used for both get and set)
    let cacheKey: string | null = null;
    if (isDefault) {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 8;
      cacheKey = this.cacheService.generateCollectionListDefaultKey(
        pageNum,
        limitNum
      );

      // Try to get from cache
      const cached =
        await this.cacheService.get<PaginatedResponseDto<Collection>>(cacheKey);

      if (cached) {
        const totalTime = Date.now() - startTime;
        console.log(
          `[CACHE] Collection List - HIT - Key: ${cacheKey} - Time: ${totalTime}ms`
        );
        return cached;
      }
    }

    // Query database
    const dbStartTime = Date.now();
    const result =
      await this.collectionRepository.findCollectionsWithPagination(
        paginationDto
      );
    const dbTime = Date.now() - dbStartTime;

    // Cache default requests only (use pre-calculated cacheKey)
    const totalTime = Date.now() - startTime;
    if (isDefault && cacheKey) {
      await this.cacheService.set(cacheKey, result, 60); // 60 seconds TTL
      console.log(
        `[CACHE] Collection List - MISS → SET - Key: ${cacheKey} - DB: ${dbTime}ms - Total: ${totalTime}ms - Items: ${result.data.length}`
      );
    } else {
      console.log(
        `[CACHE] Collection List - No Cache - DB: ${dbTime}ms - Total: ${totalTime}ms - Items: ${result.data.length}`
      );
    }

    return result;
  }

  async findOne(id: number): Promise<Collection> {
    const collection = await this.collectionRepository.findById(id);
    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }
    return collection;
  }

  async findByCreator(creatorId: number): Promise<Collection[]> {
    return this.collectionRepository.findByCreator(creatorId);
  }

  async findByCreatorWithPagination(
    creatorId: number,
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<Collection>> {
    return this.collectionRepository.findByCreatorWithPagination(
      creatorId,
      paginationDto
    );
  }

  async findMyCollectionsForNFT(creatorId: number): Promise<Collection[]> {
    // Return only collections that the user can add NFTs to (their own collections)
    return this.findByCreator(creatorId);
  }

  async canUserAddNFTToCollection(
    collectionId: number,
    userId: number
  ): Promise<boolean> {
    const collection = await this.collectionRepository.findById(collectionId);

    if (!collection) {
      return false;
    }

    return collection.creatorId === userId;
  }

  async update(
    id: number,
    updateCollectionDto: UpdateCollectionDto,
    userId: number
  ): Promise<Collection> {
    const collection = await this.findOne(id);

    // Check if user is the creator
    if (collection.creatorId !== userId) {
      throw new ForbiddenException("You can only update your own collections");
    }

    // Update collection
    await this.collectionRepository.update(id, updateCollectionDto);

    // Invalidate collection list cache (collection metadata changed)
    await this.cacheService.invalidateAll();

    return this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const collection = await this.findOne(id);

    // Check if user is the creator
    if (collection.creatorId !== userId) {
      throw new ForbiddenException("You can only delete your own collections");
    }

    await this.collectionRepository.remove(collection);

    // Invalidate collection list cache (collection deleted)
    await this.cacheService.invalidateAll();
  }

  async confirmDeploy(
    id: number,
    userId: number,
    txHash: string
  ): Promise<void> {
    const collection = await this.findOne(id);
    if (collection.creatorId !== userId) {
      throw new ForbiddenException("You can only update your own collections");
    }

    const receipt = await this.blockchainService.getReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new ForbiddenException("Transaction not found or failed");
    }

    // If this tx directly deployed the contract, receipt.contractAddress will be set
    if (!receipt.contractAddress) {
      throw new ForbiddenException("No contract address found in receipt");
    }

    await this.collectionRepository.update(id, {
      contractAddress: receipt.contractAddress,
      chainId: 97,
    });
  }

  async getStats(collectionId: number) {
    await this.findOne(collectionId);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalRaw, volume24Raw, floorRaw] = await Promise.all([
      this.nftEventRepository
        .createQueryBuilder("event")
        .select("COALESCE(SUM(event.priceWei), 0)", "total")
        .leftJoin("event.nft", "nft")
        .where("nft.collectionId = :collectionId", { collectionId })
        .andWhere("event.eventType = :eventType", {
          eventType: NFTEventType.TRANSFER,
        })
        .andWhere("event.priceWei IS NOT NULL")
        .getRawOne<{ total: string }>(),
      this.nftEventRepository
        .createQueryBuilder("event")
        .select("COALESCE(SUM(event.priceWei), 0)", "total")
        .leftJoin("event.nft", "nft")
        .where("nft.collectionId = :collectionId", { collectionId })
        .andWhere("event.eventType = :eventType", {
          eventType: NFTEventType.TRANSFER,
        })
        .andWhere("event.priceWei IS NOT NULL")
        .andWhere("event.blockTimestamp >= :since", {
          since: twentyFourHoursAgo,
        })
        .getRawOne<{ total: string }>(),
      this.nftRepository
        .createQueryBuilder("nft")
        .select("MIN(nft.price)", "floor")
        .where("nft.collectionId = :collectionId", { collectionId })
        .andWhere("nft.isForSale = :isForSale", { isForSale: true })
        .getRawOne<{ floor: string | null }>(),
    ]);

    const totalWei = totalRaw?.total ?? "0";
    const volume24Wei = volume24Raw?.total ?? "0";

    const totalVolumeBNB = parseFloat(
      ethers.utils.formatEther(BigInt(totalWei))
    );
    const volume24hBNB = parseFloat(
      ethers.utils.formatEther(BigInt(volume24Wei))
    );

    const floorPriceBNB = floorRaw?.floor ? parseFloat(floorRaw.floor) : null;

    return {
      totalVolumeBNB,
      volume24hBNB,
      floorPriceBNB,
      floorChange1DPercent: null,
      asOf: new Date().toISOString(),
    };
  }
}
