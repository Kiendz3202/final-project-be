import {
  IsString,
  IsOptional,
  IsEnum,
  IsEthereumAddress,
  IsUrl,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../common/entities";

export class CreateUserDto {
  @ApiProperty({
    description: "Wallet address",
    example: "0x1234567890abcdef1234567890abcdef12345678",
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({
    description: "Username (optional)",
    example: "john_doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: "User role",
    enum: UserRole,
    default: UserRole.USER,
    required: false,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    description: "User description/bio",
    example: "Digital artist and NFT collector",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "User avatar URL",
    example: "https://example.com/avatar.jpg",
    required: false,
  })
  @IsUrl()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: "Facebook profile URL",
    example: "https://facebook.com/username",
    required: false,
  })
  @IsUrl()
  @IsOptional()
  facebookUrl?: string;

  @ApiProperty({
    description: "Instagram profile URL",
    example: "https://instagram.com/username",
    required: false,
  })
  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @ApiProperty({
    description: "YouTube channel URL",
    example: "https://youtube.com/@username",
    required: false,
  })
  @IsUrl()
  @IsOptional()
  youtubeUrl?: string;
}
