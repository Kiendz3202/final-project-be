import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { NFT } from "@/common/entities/nft.entity";
import {
  PaginationDto,
  PaginatedResponseDto,
} from "@/common/dto/pagination.dto";

@Injectable()
export class NFTRepository extends Repository<NFT> {
  constructor(private dataSource: DataSource) {
    super(NFT, dataSource.createEntityManager());
  }

  async findByOwner(ownerId: number): Promise<NFT[]> {
    return this.find({
      where: { ownerId },
      relations: ["owner", "collection"],
    });
  }

  async findByOwnerWithPagination(
    ownerId: number,
    paginationDto: PaginationDto
  ): Promise<PaginatedResponseDto<NFT>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder("nft")
      .leftJoinAndSelect("nft.owner", "owner")
      .leftJoinAndSelect("nft.collection", "collection")
      .where("nft.ownerId = :ownerId", { ownerId })
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
    return this.find({
      where: { isForSale: true },
      relations: ["owner", "collection"],
    });
  }

  async findByTokenId(tokenId: string): Promise<NFT | null> {
    return this.findOne({
      where: { tokenId },
      relations: ["owner", "collection"],
    });
  }
}
