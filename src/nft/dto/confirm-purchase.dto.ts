import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ConfirmPurchaseDto {
  @ApiProperty({
    description: "Transaction hash of the purchase",
    example: "0x1234...",
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;
}
