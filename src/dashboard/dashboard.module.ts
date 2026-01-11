import { Module } from "@nestjs/common";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { UserDashboardController } from "./user-dashboard.controller";
import { UserDashboardService } from "./user-dashboard.service";
import {
  CollectionRepository,
  NFTEventRepository,
  NFTRepository,
  UserRepository,
} from "@/common/repositories";

@Module({
  imports: [],
  controllers: [AdminDashboardController, UserDashboardController],
  providers: [
    AdminDashboardService,
    UserDashboardService,
    NFTEventRepository,
    NFTRepository,
    CollectionRepository,
    UserRepository,
  ],
})
export class DashboardModule {}
