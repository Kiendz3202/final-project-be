import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { AdminGuard } from "@/auth/guards/admin.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/entities";
import { PaginationDto } from "@/common/dto/pagination.dto";
import { UsersService } from "@/users/users.service";
import { NFTService } from "@/nft/nft.service";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard) // Apply to all routes in this controller
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly nftService: NFTService
  ) {}

  @Get("users")
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiResponse({ status: 200, description: "List of all users" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Patch("users/:id/role")
  @ApiOperation({ summary: "Update user role (Admin only)" })
  @ApiResponse({ status: 200, description: "User role updated successfully" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async updateUserRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateData: { role: UserRole }
  ) {
    return this.usersService.update(id, { role: updateData.role });
  }

  @Delete("users/:id")
  @ApiOperation({ summary: "Delete user (Admin only)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async deleteUser(@Param("id", ParseIntPipe) id: number) {
    await this.usersService.remove(id);
    return { message: "User deleted successfully" };
  }

  @Get("nfts")
  @ApiOperation({ summary: "Get all NFTs (Admin only)" })
  @ApiResponse({ status: 200, description: "List of all NFTs" })
  async getAllNFTs(@Query() paginationDto: PaginationDto) {
    return this.nftService.findAll(paginationDto);
  }

  @Delete("nfts/:id")
  @ApiOperation({ summary: "Delete any NFT (Admin only)" })
  @ApiResponse({ status: 200, description: "NFT deleted successfully" })
  async deleteNFT(@Param("id", ParseIntPipe) id: number) {
    // Admin can delete any NFT, so we pass 0 as userId (will be overridden in service for admins)
    const nft = await this.nftService.findOne(id);
    await this.nftService.remove(id, nft.ownerId); // Use actual owner ID
    return { message: "NFT deleted successfully" };
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Using the @Roles decorator instead of AdminGuard
  @ApiOperation({ summary: "Get system statistics (Admin only)" })
  @ApiResponse({ status: 200, description: "System statistics" })
  async getSystemStats() {
    const userStats = await this.usersService.getUserStats();
    const allNFTs = await this.nftService.findAll({ page: 1, limit: 1000 });
    const forSaleNFTs = await this.nftService.findForSale();

    return {
      users: userStats,
      nfts: {
        total: allNFTs.meta.total,
        forSale: forSaleNFTs.length,
        notForSale: allNFTs.meta.total - forSaleNFTs.length,
      },
      systemHealth: "OK",
      timestamp: new Date(),
    };
  }
}
