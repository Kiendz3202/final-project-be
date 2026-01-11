import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { AdminGuard } from "@/auth/guards/admin.guard";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminDashboardData } from "./dto/admin-dashboard.dto";

@ApiTags("Dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("dashboard/admin")
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get admin dashboard overview" })
  @ApiResponse({
    status: 200,
    description: "Aggregated dashboard metrics",
    type: Object,
  })
  async getOverview(): Promise<AdminDashboardData> {
    return this.adminDashboardService.getOverview();
  }
}
