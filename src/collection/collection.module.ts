import { Module } from "@nestjs/common";
import { CollectionService } from "./collection.service";
import { CollectionController } from "./collection.controller";
import { CollectionRepository } from "@/common/repositories/collection.repository";
import { UserRepository } from "@/common/repositories/user.repository";
import { BlockchainService } from "@/common/services/blockchain.service";
import { NFTRepository, NFTEventRepository } from "@/common/repositories";
import { CacheService } from "@/common/services/cache.service";
import { RedisModule } from "@/redis/redis.module";

@Module({
  imports: [RedisModule],
  controllers: [CollectionController],
  providers: [
    CollectionService,
    CollectionRepository,
    UserRepository,
    BlockchainService,
    NFTRepository,
    NFTEventRepository,
    CacheService,
  ],
  exports: [CollectionService],
})
export class CollectionModule {}
