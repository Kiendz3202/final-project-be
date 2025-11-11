import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsPositive,
  IsUrl,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { MIN_ROYALTY_PERCENT, MAX_ROYALTY_PERCENT } from "@/common/constants";

export class CreateNFTDto {
  @ApiProperty({ description: "NFT name", example: "Cool NFT #123" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "NFT description",
    example: "A very cool digital art piece",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Image URL (upload via presigned URL first)",
    example:
      "https://your-s3-bucket.s3.amazonaws.com/nfts/1234567890-image.jpg",
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({
    description: "Per-NFT royalty percent (0-100). Optional; null by default",
    required: false,
    example: 5,
  })
  @IsInt()
  @Min(MIN_ROYALTY_PERCENT)
  @Max(MAX_ROYALTY_PERCENT)
  @IsOptional()
  royaltyPercent?: number;

  @ApiProperty({
    description: "Price in ETH",
    example: 0.5,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiProperty({
    description: "Whether the NFT is for sale",
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isForSale?: boolean;

  @ApiProperty({
    description: "Contract address on blockchain",
    required: false,
  })
  @IsString()
  @IsOptional()
  contractAddress?: string;

  @ApiProperty({
    description: "Collection ID",
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  collectionId?: number;
}
