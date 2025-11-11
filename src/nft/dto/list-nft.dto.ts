import { IsNumber, IsPositive, IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ListNFTDto {
  @ApiProperty({
    description: "Price in ETH",
    example: 0.5,
  })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: "Blockchain transaction hash (optional, for confirmation)",
    example: "0x...",
    required: false,
  })
  @IsString()
  @IsOptional()
  txHash?: string;
}
