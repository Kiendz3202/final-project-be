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
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User, UserRole } from "@/common/entities";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { OwnerOrAdminGuard } from "@/auth/guards/owner-or-admin.guard";
import { Roles } from "@/auth/decorators/roles.decorator";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({
    status: 201,
    description: "User created successfully",
    type: User,
  })
  @ApiResponse({ status: 409, description: "User already exists" })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Only admins can see all users
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiResponse({ status: 200, description: "List of all users", type: [User] })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user statistics" })
  @ApiResponse({ status: 200, description: "User statistics" })
  async getStats(): Promise<any> {
    return this.usersService.getUserStats();
  }

  @Get("wallet/:walletAddress")
  @ApiOperation({ summary: "Get user by wallet address (public)" })
  @ApiResponse({ status: 200, description: "User found", type: User })
  @ApiResponse({ status: 404, description: "User not found" })
  async findByWalletAddress(
    @Param("walletAddress") walletAddress: string
  ): Promise<User> {
    const user = await this.usersService.findByWalletAddress(walletAddress);
    if (!user) {
      throw new NotFoundException(
        `User with wallet address ${walletAddress} not found`
      );
    }
    // Return user with same fields as findOne
    return this.usersService.findOne(user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({ status: 200, description: "User found", type: User })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user by ID (Owner or Admin only)" })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    type: User,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Can only update your own profile",
  })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Only admins can delete users
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete user by ID (Admin only)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  async remove(
    @Param("id", ParseIntPipe) id: number
  ): Promise<{ message: string }> {
    await this.usersService.remove(id);
    return { message: "User deleted successfully" };
  }
}
