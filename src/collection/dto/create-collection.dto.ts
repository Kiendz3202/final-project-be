import {
  IsString,
  IsUrl,
  IsOptional,
  IsNotEmpty,
  IsIn,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCollectionDto {
  @ApiProperty({
    description: "Collection name",
    example: "Cool NFT Collection",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Collection description",
    example: "A collection of amazing digital art pieces",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: "Collection banner image URL",
    example: "https://s3.amazonaws.com/bucket/banner.jpg",
  })
  @IsUrl()
  bannerImageUrl: string;

  @ApiProperty({
    description: "Collection logo image URL",
    example: "https://s3.amazonaws.com/bucket/logo.jpg",
  })
  @IsUrl()
  logoImageUrl: string;

  @ApiProperty({
    description: "Collection website URL",
    example: "https://coolnftcollection.com",
    required: false,
  })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiProperty({
    description: "Collection Twitter URL",
    example: "https://twitter.com/coolnftcollection",
    required: false,
  })
  @IsOptional()
  @IsUrl()
  twitterUrl?: string;

  @ApiProperty({
    description: "Collection Discord URL",
    example: "https://discord.gg/coolnftcollection",
    required: false,
  })
  @IsOptional()
  @IsUrl()
  discordUrl?: string;

  // Chain is fixed to BSC testnet (97); not exposed in DTO

  @ApiProperty({
    description: "Collection contract address",
    example: "0xabc...",
    required: false,
  })
  @IsOptional()
  @IsString()
  contractAddress?: string;
}
