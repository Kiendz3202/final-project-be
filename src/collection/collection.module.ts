import { Module } from "@nestjs/common";
import { CollectionService } from "./collection.service";
import { CollectionController } from "./collection.controller";
import { CollectionRepository } from "../common/repositories/collection.repository";
import { UserRepository } from "../common/repositories/user.repository";
import { BlockchainService } from "../common/services/blockchain.service";

@Module({
  controllers: [CollectionController],
  providers: [
    CollectionService,
    CollectionRepository,
    UserRepository,
    BlockchainService,
  ],
  exports: [CollectionService],
})
export class CollectionModule {}
