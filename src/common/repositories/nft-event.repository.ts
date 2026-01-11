import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { NFTEvent, NFTEventType } from "@/common/entities/nft-event.entity";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "@/common/dto/pagination.dto";
import { ethers } from "ethers";

@Injectable()
export class NFTEventRepository extends Repository<NFTEvent> {
  constructor(private dataSource: DataSource) {
    super(NFTEvent, dataSource.createEntityManager());
  }

  async findByNFT(
    nftId: number,
    options?: {
      pagination?: PaginationDto;
      eventType?: NFTEventType;
    }
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    const queryBuilder = this.createQueryBuilder("event")
      .where("event.nftId = :nftId", { nftId })
      .orderBy("event.blockNumber", "DESC")
      .addOrderBy("event.logIndex", "DESC");

    if (options?.eventType) {
      queryBuilder.andWhere("event.eventType = :eventType", {
        eventType: options.eventType,
      });
    }

    if (options?.pagination) {
      const { page = 1, limit = 10 } = options.pagination;
      const skip = (page - 1) * limit;

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

    return queryBuilder.getMany();
  }

  async findByEventType(
    eventType: NFTEventType,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    const queryBuilder = this.createQueryBuilder("event")
      .where("event.eventType = :eventType", { eventType })
      .orderBy("event.blockNumber", "DESC")
      .addOrderBy("event.logIndex", "DESC");

    if (paginationDto) {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

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

    return queryBuilder.getMany();
  }

  async findByAddress(
    address: string,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    const queryBuilder = this.createQueryBuilder("event")
      .where(
        "LOWER(event.fromAddress) = LOWER(:address) OR LOWER(event.toAddress) = LOWER(:address)",
        { address }
      )
      .orderBy("event.blockNumber", "DESC")
      .addOrderBy("event.logIndex", "DESC");

    if (paginationDto) {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

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

    return queryBuilder.getMany();
  }

  async findByCollection(
    collectionId: number,
    options?: {
      pagination?: PaginationDto;
      types?: NFTEventType[];
    }
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    const qb = this.createQueryBuilder("event")
      .innerJoinAndSelect("event.nft", "nft")
      .where("nft.collectionId = :collectionId", { collectionId })
      .orderBy("event.blockNumber", "DESC")
      .addOrderBy("event.logIndex", "DESC");

    if (options?.types && options.types.length > 0) {
      qb.andWhere("event.eventType IN (:...types)", { types: options.types });
    }

    if (options?.pagination) {
      const { page = 1, limit = 10 } = options.pagination;
      const skip = (page - 1) * limit;
      const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
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

    return qb.getMany();
  }

  async createEvent(data: {
    nftId: number;
    eventType: NFTEventType;
    fromAddress: string | null;
    toAddress: string | null;
    priceWei: string | null;
    platformFeeWei?: string | null;
    royaltyAmountWei?: string | null;
    royaltyReceiver?: string | null;
    txHash: string;
    logIndex: number;
    blockNumber: number;
    blockTimestamp: Date;
    chainId?: number;
  }): Promise<NFTEvent> {
    const event = this.create({
      ...data,
      chainId: data.chainId || 97,
    });
    return this.save(event);
  }

  async findByTxHashAndLogIndex(
    txHash: string,
    logIndex: number
  ): Promise<NFTEvent | null> {
    return this.findOne({
      where: { txHash, logIndex },
    });
  }

  async findPriceHistory(
    nftId: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<
    Array<{
      timestamp: Date;
      priceBNB: number;
      priceWei: string;
      eventType: NFTEventType;
      txHash: string;
    }>
  > {
    const queryBuilder = this.createQueryBuilder("event")
      .where("event.nftId = :nftId", { nftId })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .orderBy("event.blockTimestamp", "ASC");

    if (options?.startDate) {
      queryBuilder.andWhere("event.blockTimestamp >= :startDate", {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere("event.blockTimestamp <= :endDate", {
        endDate: options.endDate,
      });
    }

    const events = await queryBuilder.getMany();

    // Convert priceWei to BNB using ethers
    return events
      .filter(
        (event) => event.priceWei !== null && event.priceWei !== undefined
      )
      .map((event) => ({
        timestamp: event.blockTimestamp,
        priceBNB: parseFloat(ethers.utils.formatEther(event.priceWei!)),
        priceWei: event.priceWei!,
        eventType: event.eventType,
        txHash: event.txHash,
      }));
  }
}
