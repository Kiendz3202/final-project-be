import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Collection } from "../entities/collection.entity";
import { PaginationDto, PaginatedResponseDto } from "../dto/pagination.dto";

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
      .leftJoinAndSelect("collection.nfts", "nfts")
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
      relations: ["creator", "nfts"],
      order: { createdAt: "DESC" },
    });
  }

  async findWithStats(id: number): Promise<Collection | null> {
    return this.createQueryBuilder("collection")
      .leftJoinAndSelect("collection.creator", "creator")
      .leftJoinAndSelect("collection.nfts", "nfts")
      .leftJoin("collection.nfts", "nft")
      .addSelect("COUNT(nft.id)", "nftCount")
      .addSelect(
        "COUNT(CASE WHEN nft.isForSale = true THEN 1 END)",
        "forSaleCount"
      )
      .addSelect(
        "AVG(CASE WHEN nft.isForSale = true THEN nft.price END)",
        "avgPrice"
      )
      .where("collection.id = :id", { id })
      .groupBy("collection.id")
      .getOne();
  }
}


