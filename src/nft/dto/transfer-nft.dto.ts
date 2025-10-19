import { IsNumber, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class TransferNFTDto {
  @ApiProperty({
    description: "ID of the user to transfer the NFT to",
    example: 123,
  })
  @IsNumber()
  toUserId: number;

  @ApiProperty({
    description: "Blockchain transaction hash (optional)",
    example: "0xabc123def456789...",
    required: false,
  })
  @IsString()
  @IsOptional()
  transactionHash?: string;
}
