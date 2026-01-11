import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User, UserRole } from "@/common/entities";
import { UserRepository } from "@/common/repositories";

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Normalize wallet address to lowercase
    const walletAddress = createUserDto.walletAddress.toLowerCase();

    // Check if user exists
    const existingUser =
      await this.userRepository.findByWalletAddress(walletAddress);

    if (existingUser) {
      throw new ConflictException(
        "User with this wallet address already exists"
      );
    }

    // Check if username is taken (if provided)
    if (createUserDto.username) {
      const existingUsername = await this.userRepository.findByUsername(
        createUserDto.username
      );
      if (existingUsername) {
        throw new ConflictException("Username is already taken");
      }
    }

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      walletAddress,
      role: createUserDto.role || UserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }

  async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return {
      data: users,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        "id",
        "walletAddress",
        "username",
        "role",
        "isActive",
        "description",
        "avatar",
        "banner",
        "facebookUrl",
        "instagramUrl",
        "youtubeUrl",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const normalizedAddress = walletAddress.toLowerCase();
    return this.userRepository.findByWalletAddress(normalizedAddress);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser?: User
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Permission checks if currentUser context is available
    if (currentUser) {
      // 1. Only Admins can change roles
      if (updateUserDto.role && currentUser.role !== UserRole.ADMIN) {
        throw new ConflictException("Only admins can change roles");
      }

      // 2. Prevent modifying own Role or Status
      if (currentUser.id === id) {
        if (updateUserDto.role) {
          throw new ConflictException("You cannot change your own role");
        }
        if (updateUserDto.isActive !== undefined && updateUserDto.isActive !== user.isActive) {
          throw new ConflictException("You cannot change your own active status");
        }
      }
    } else {
      // Legacy safety fallback if no user context
      if (user.role === UserRole.ADMIN) {
        throw new ConflictException(
          "Admin users cannot be modified through this endpoint without auth context"
        );
      }
    }

    // Check if new username is taken (if provided)
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.userRepository.findByUsername(
        updateUserDto.username
      );
      if (existingUsername) {
        throw new ConflictException("Username is already taken");
      }
    }

    // Update user
    await this.userRepository.update(id, updateUserDto);

    // Get updated user
    const updatedUser = await this.userRepository.findOne({
      where: { id },
      select: [
        "id",
        "walletAddress",
        "username",
        "role",
        "isActive",
        "description",
        "avatar",
        "banner",
        "facebookUrl",
        "instagramUrl",
        "youtubeUrl",
        "createdAt",
        "updatedAt",
      ],
    });

    return updatedUser;
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.remove(user);
  }

  async getUserStats(): Promise<any> {
    const totalUsers = await this.userRepository.count();
    const adminUsers = await this.userRepository.count({
      where: { role: UserRole.ADMIN },
    });
    const regularUsers = totalUsers - adminUsers;

    const stats = {
      totalUsers,
      adminUsers,
      regularUsers,
      lastUpdated: new Date(),
    };

    return stats;
  }
}
