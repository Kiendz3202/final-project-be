import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateNFTDto } from "./create-nft.dto";

// Immutable: name, imageUrl, royaltyPercent, contractAddress, tokenId, creatorId, collectionId
export class UpdateNFTDto extends PartialType(
  OmitType(CreateNFTDto, [
    "name",
    "imageUrl",
    "royaltyPercent",
    "contractAddress",
    "collectionId",
  ] as const)
) {}
