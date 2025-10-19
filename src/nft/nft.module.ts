import { Module } from "@nestjs/common";
import { NFTService } from "./nft.service";
import { NFTController } from "./nft.controller";
import {
  NFTRepository,
  UserRepository,
  NFTHistoryRepository,
  CollectionRepository,
} from "../common/repositories";
import { S3Service } from "../common/services/s3.service";
import { CollectionService } from "../collection/collection.service";
import { BlockchainService } from "../common/services/blockchain.service";

@Module({
  imports: [],
  controllers: [NFTController],
  providers: [
    NFTService,
    NFTRepository,
    UserRepository,
    NFTHistoryRepository,
    CollectionRepository,
    CollectionService,
    S3Service,
    BlockchainService,
  ],
  exports: [NFTService],
})
export class NFTModule {}
