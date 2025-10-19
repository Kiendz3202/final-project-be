import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { NFTHistory } from "../entities/nft-history.entity";

@Injectable()
export class NFTHistoryRepository extends Repository<NFTHistory> {
  constructor(private dataSource: DataSource) {
    super(NFTHistory, dataSource.createEntityManager());
  }

  async findByNFT(nftId: number): Promise<NFTHistory[]> {
    return this.find({
      where: { nftId },
      relations: ["formerOwner", "currentOwner"],
      order: { createdAt: "DESC" },
    });
  }

  async findByUser(userId: number): Promise<NFTHistory[]> {
    return this.find({
      where: [{ formerOwnerId: userId }, { currentOwnerId: userId }],
      relations: ["nft", "formerOwner", "currentOwner"],
      order: { createdAt: "DESC" },
    });
  }

  async findAllSales(): Promise<NFTHistory[]> {
    return this.createQueryBuilder("history")
      .leftJoinAndSelect("history.nft", "nft")
      .leftJoinAndSelect("history.formerOwner", "formerOwner")
      .leftJoinAndSelect("history.currentOwner", "currentOwner")
      .where("history.formerOwnerId IS NOT NULL") // Only sales/transfers, not initial creation
      .orderBy("history.createdAt", "DESC")
      .getMany();
  }

  async getLatestTransactionForNFT(nftId: number): Promise<NFTHistory | null> {
    return this.findOne({
      where: { nftId },
      relations: ["formerOwner", "currentOwner"],
      order: { createdAt: "DESC" },
    });
  }

  async createHistoryRecord(data: {
    nftId: number;
    formerOwnerId?: number;
    currentOwnerId: number;
    price?: number;
    transactionHash?: string;
  }): Promise<NFTHistory> {
    const history = this.create(data);
    return this.save(history);
  }
}
