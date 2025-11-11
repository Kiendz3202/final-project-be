import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { User } from "@/common/entities/user.entity";

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  async findAllUsers(): Promise<User[]> {
    return this.find({
      select: [
        "id",
        "walletAddress",
        "username",
        "role",
        "description",
        "avatar",
        "banner",
        "facebookUrl",
        "instagramUrl",
        "youtubeUrl",
        "createdAt",
        "updatedAt",
      ],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({
      where: { username },
    });
  }
}
