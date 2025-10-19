import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyDto {
  @ApiProperty({
    description: "SIWE message that was signed",
    example: "localhost:3000 wants you to sign in with your Ethereum account:",
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: "Signature of the SIWE message",
    example: "0x1234567890abcdef...",
  })
  @IsString()
  signature: string;
}

export class VerifyResponseDto {
  @ApiProperty({
    description: "JWT access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  access_token: string;

  @ApiProperty({
    description: "User information",
    type: "object",
    properties: {
      id: { type: "number" },
      walletAddress: { type: "string" },
      username: { type: "string" },
      role: { type: "string" },
      description: { type: "string" },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
    },
  })
  user: {
    id: number;
    walletAddress: string;
    username?: string;
    role: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
}

