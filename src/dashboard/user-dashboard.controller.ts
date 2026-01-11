import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { UserDashboardService } from "./user-dashboard.service";
import { UserDashboardData } from "./dto/user-dashboard.dto";

@ApiTags("User Dashboard")
@Controller("dashboard/user")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserDashboardController {
  constructor(private readonly userDashboardService: UserDashboardService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get dashboard overview for current user" })
  async getOverview(@Request() req): Promise<UserDashboardData> {
    return this.userDashboardService.getOverview(req.user.id);
  }
}
