import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { NFT } from "../entities/nft.entity";

@Injectable()
export class NFTRepository extends Repository<NFT> {
  constructor(private dataSource: DataSource) {
    super(NFT, dataSource.createEntityManager());
  }

  async findByOwner(ownerId: number): Promise<NFT[]> {
    return this.find({
      where: { ownerId },
      relations: ["owner"],
    });
  }

  async findForSale(): Promise<NFT[]> {
    return this.find({
      where: { isForSale: true },
      relations: ["owner"],
    });
  }

  async findByTokenId(tokenId: string): Promise<NFT | null> {
    return this.findOne({
      where: { tokenId },
      relations: ["owner"],
    });
  }
}
