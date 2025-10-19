import { IsString, IsOptional, IsNumber, IsPositive } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class GeneratePresignedUrlDto {
  @ApiProperty({
    description: "Original file name",
    example: "my-nft-image.jpg",
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: "MIME type of the file",
    example: "image/jpeg",
  })
  @IsString()
  fileType: string;

  @ApiProperty({
    description: "File size in bytes (optional)",
    example: 1024000,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  fileSize?: number;
}
