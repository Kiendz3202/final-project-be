import { PaginationDto } from "@/common/dto/pagination.dto";
import { NFTEventType } from "@/common/entities";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export class GetNFTEventsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Filter by a specific event type",
    enum: NFTEventType,
    example: NFTEventType.TRANSFER,
  })
  @IsOptional()
  @IsEnum(NFTEventType)
  eventType?: NFTEventType;
}
