import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "@/users/users.service";
import { LoginDto } from "./dto/login.dto";
import { VerifyDto, VerifyResponseDto } from "./dto/verify.dto";
import { NonceResponseDto } from "./dto/nonce.dto";
import { User, UserRole } from "@/common/entities";
import { SiweMessage } from "siwe";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) { }

  async login(
    loginDto: LoginDto
  ): Promise<{ access_token: string; user: any }> {
    const { walletAddress, message, signature } = loginDto;

    // Normalize wallet address
    const normalizedAddress = walletAddress.toLowerCase();

    // If signature and message are provided, verify the signature
    if (signature && message) {
      const isValidSignature = await this.verifyWalletSignature(
        normalizedAddress,
        signature,
        message
      );

      if (!isValidSignature) {
        throw new UnauthorizedException("Invalid signature");
      }
    }

    // Find user by wallet address
    let user = await this.usersService.findByWalletAddress(normalizedAddress);

    // If user doesn't exist, create a new one automatically
    if (!user) {
      user = await this.usersService.create({
        walletAddress: normalizedAddress,
        role: UserRole.USER,
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException(
        "Your account has been deactivated. Please contact support."
      );
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        role: user.role,
        description: user.description,
        avatar: user.avatar,
        banner: user.banner,
        facebookUrl: user.facebookUrl,
        instagramUrl: user.instagramUrl,
        youtubeUrl: user.youtubeUrl,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  async validateUser(userId: string | number): Promise<any> {
    // Convert to number if it's a string
    const numericUserId =
      typeof userId === "string" ? parseInt(userId, 10) : userId;

    if (isNaN(numericUserId)) {
      return null;
    }

    const user = await this.usersService.findOne(numericUserId);
    if (user) {
      return {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        role: user.role,
        description: user.description,
        avatar: user.avatar,
        banner: user.banner,
        facebookUrl: user.facebookUrl,
        instagramUrl: user.instagramUrl,
        youtubeUrl: user.youtubeUrl,
      };
    }
    return null;
  }

  async logout(userId: number): Promise<{ message: string }> {
    return { message: "Logged out successfully" };
  }

  async getProfile(userId: number): Promise<User> {
    const user = await this.usersService.findOne(userId);
    return user;
  }

  // Generate nonce for SIWE authentication
  async generateNonce(): Promise<NonceResponseDto> {
    const nonce =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    return { nonce };
  }

  // Verify SIWE message and signature
  async verifySiweMessage(verifyDto: VerifyDto): Promise<VerifyResponseDto> {
    const { message, signature } = verifyDto;

    try {
      // Parse the SIWE message
      const siweMessage = new SiweMessage(message);

      // Verify the signature
      const result = await siweMessage.verify({ signature });

      if (!result.success) {
        throw new UnauthorizedException("Invalid signature");
      }

      // Extract wallet address from the verified message
      const walletAddress = siweMessage.address.toLowerCase();

      // Find or create user
      let user = await this.usersService.findByWalletAddress(walletAddress);

      if (!user) {
        user = await this.usersService.create({
          walletAddress: walletAddress,
          role: UserRole.USER,
        });
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException(
          "Your account has been deactivated. Please contact support."
        );
      }

      // Generate JWT token
      const payload = {
        sub: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      };

      const access_token = this.jwtService.sign(payload);

      return {
        access_token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          role: user.role,
          description: user.description,
          avatar: user.avatar,
          banner: user.banner,
          facebookUrl: user.facebookUrl,
          instagramUrl: user.instagramUrl,
          youtubeUrl: user.youtubeUrl,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      console.error("SIWE verification error:", error);
      throw new UnauthorizedException("Invalid SIWE message or signature");
    }
  }

  // Helper method to verify wallet signature
  async verifyWalletSignature(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      const { ethers } = await import("ethers");

      // Recover the address from the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);

      // Compare with the provided wallet address (case-insensitive)
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }
}
