import {
  IsString,
  IsUrl,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { MIN_ROYALTY_PERCENT, MAX_ROYALTY_PERCENT } from "@/common/constants";

export class CreateCollectionDto {
  @ApiProperty({
    description: "Collection name",
    example: "Cool NFT Collection",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Collection symbol", example: "GEN" })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({
    description: "Collection description",
    example: "A collection of amazing digital art pieces",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: "Collection image URL",
    example:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=300&fit=crop",
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  // Chain is fixed to BSC testnet (97); not exposed in DTO

  @ApiProperty({
    description: "Default royalty percent (0-100). Defaults to 1% if omitted",
    example: 1,
    required: false,
  })
  @IsInt()
  @Min(MIN_ROYALTY_PERCENT)
  @Max(MAX_ROYALTY_PERCENT)
  @IsOptional()
  royaltyPercent?: number;

  @ApiProperty({
    description: "Collection contract address",
    example: "0xabc...",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  contractAddress: string;
}
