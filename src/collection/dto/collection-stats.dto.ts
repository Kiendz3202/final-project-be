import { ApiProperty } from "@nestjs/swagger";

export class CollectionStatsDto {
  @ApiProperty({ description: "Total traded volume in BNB", example: 12.45 })
  totalVolumeBNB: number;

  @ApiProperty({ description: "24h traded volume in BNB", example: 1.2 })
  volume24hBNB: number;

  @ApiProperty({
    description: "Current floor price in BNB (null when no listings)",
    example: 0.08,
    nullable: true,
  })
  floorPriceBNB: number | null;

  @ApiProperty({
    description: "1D floor change percentage (null when not calculated yet)",
    example: null,
    nullable: true,
  })
  floorChange1DPercent: number | null;

  @ApiProperty({ description: "Timestamp when the stats were computed" })
  asOf: string;
}
