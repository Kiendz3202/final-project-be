import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateCollectionDto } from "./create-collection.dto";

// Immutable: name, symbol, royaltyPercent, contractAddress
export class UpdateCollectionDto extends PartialType(
  OmitType(CreateCollectionDto, [
    "name",
    "symbol",
    "royaltyPercent",
    "contractAddress",
  ] as const)
) {}
