import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Collection } from "@/common/entities/collection.entity";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "@/common/dto/pagination.dto";

@Injectable()
export class CollectionRepository extends Repository<Collection> {
  constructor(private dataSource: DataSource) {
    super(Collection, dataSource.createEntityManager());
  }

  async findCollectionsWithPagination(
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<Collection>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder("collection")
      .leftJoinAndSelect("collection.creator", "creator")
      .orderBy("collection.createdAt", "DESC");

    if (search) {
      queryBuilder.where(
        "collection.name ILIKE :search OR collection.description ILIKE :search",
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

  async findByCreator(creatorId: number): Promise<Collection[]> {
    return this.find({
      where: { creatorId },
      relations: ["creator"],
      order: { createdAt: "DESC" },
    });
  }

  async findByCreatorWithPagination(
    creatorId: number,
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<Collection>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder("collection")
      .leftJoinAndSelect("collection.creator", "creator")
      .where("collection.creatorId = :creatorId", { creatorId })
      .orderBy("collection.createdAt", "DESC");

    if (search) {
      queryBuilder.andWhere(
        "collection.name ILIKE :search OR collection.description ILIKE :search",
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

  async findById(id: number): Promise<Collection | null> {
    return this.createQueryBuilder("collection")
      .leftJoinAndSelect("collection.creator", "creator")
      .leftJoinAndSelect("collection.nfts", "nfts")
      .where("collection.id = :id", { id })
      .getOne();
  }
}
