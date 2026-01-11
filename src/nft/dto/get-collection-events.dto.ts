import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "@/common/dto/pagination.dto";

export class GetCollectionEventsDto extends PaginationDto {
  @ApiProperty({
    description:
      "Comma-separated list of event types to filter (e.g., MINT,LISTED,UNLISTED,TRANSFER)",
    required: false,
    example: "MINT,LISTED",
  })
  @IsOptional()
  @IsString()
  types?: string;
}
