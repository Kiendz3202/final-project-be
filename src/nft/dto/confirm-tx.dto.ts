import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ConfirmTxDto {
  @ApiProperty({ description: "Blockchain transaction hash", example: "0x..." })
  @IsString()
  txHash: string;
}


