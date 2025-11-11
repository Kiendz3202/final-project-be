import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { NFTEvent, NFTEventType } from "@/common/entities/nft-event.entity";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "@/common/dto/pagination.dto";

@Injectable()
export class NFTEventRepository extends Repository<NFTEvent> {
  constructor(private dataSource: DataSource) {
    super(NFTEvent, dataSource.createEntityManager());
  }

  async findByNFT(
    nftId: number,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResponseDto<NFTEvent> | NFTEvent[]> {
    const queryBuilder = this.createQueryBuilder("event")
      .where("event.nftId = :nftId", { nftId })
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

  async createEvent(data: {
    nftId: number;
    eventType: NFTEventType;
    fromAddress: string | null;
    toAddress: string | null;
    priceWei: string | null;
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
}
