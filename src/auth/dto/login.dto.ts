import { IsEthereumAddress, IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: "Wallet address",
    example: "0x1234567890abcdef1234567890abcdef12345678",
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({
    description: "Original message that was signed",
    example: "Sign this message to authenticate with NFT Marketplace",
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: "Signed message for authentication",
    example: "0x...",
  })
  @IsString()
  @IsOptional()
  signature?: string; // Optional for now, can be used for message signing verification
}
