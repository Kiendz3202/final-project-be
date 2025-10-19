import { ApiProperty } from "@nestjs/swagger";

export class NonceResponseDto {
  @ApiProperty({
    description: "Unique nonce for SIWE authentication",
    example: "abc123def456ghi789",
  })
  nonce: string;
}

