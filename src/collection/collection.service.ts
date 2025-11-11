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

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private userRepository: UserRepository,
    private readonly blockchainService: BlockchainService
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

    return this.collectionRepository.save(collection);
  }

  async findAll(
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<Collection>> {
    return this.collectionRepository.findCollectionsWithPagination(
      paginationDto
    );
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

    return this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const collection = await this.findOne(id);

    // Check if user is the creator
    if (collection.creatorId !== userId) {
      throw new ForbiddenException("You can only delete your own collections");
    }

    await this.collectionRepository.remove(collection);
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
}
