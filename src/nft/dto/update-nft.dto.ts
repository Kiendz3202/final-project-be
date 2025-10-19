import { PartialType } from "@nestjs/swagger";
import { CreateNFTDto } from "./create-nft.dto";

export class UpdateNFTDto extends PartialType(CreateNFTDto) {}
