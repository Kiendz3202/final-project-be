import { Module } from "@nestjs/common";
import { NFTService } from "./nft.service";
import { NFTController } from "./nft.controller";
import {
  NFTRepository,
  UserRepository,
  CollectionRepository,
  NFTEventRepository,
} from "@/common/repositories";
import { S3Service } from "@/common/services/s3.service";
import { CollectionService } from "@/collection/collection.service";
import { BlockchainService } from "@/common/services/blockchain.service";
import { DeploymentService } from "@/common/services/deployment.service";

@Module({
  imports: [],
  controllers: [NFTController],
  providers: [
    NFTService,
    NFTRepository,
    UserRepository,
    CollectionRepository,
    NFTEventRepository,
    CollectionService,
    S3Service,
    BlockchainService,
    DeploymentService,
  ],
  exports: [NFTService],
})
export class NFTModule {}
