import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { UsersModule } from "@/users/users.module";
import { NFTModule } from "@/nft/nft.module";

@Module({
  imports: [UsersModule, NFTModule],
  controllers: [AdminController],
})
export class AdminModule {}
