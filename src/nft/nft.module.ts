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
import { CacheService } from "@/common/services/cache.service";
import { RedisModule } from "@/redis/redis.module";

@Module({
  imports: [RedisModule],
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
    CacheService,
  ],
  exports: [NFTService],
})
export class NFTModule {}
