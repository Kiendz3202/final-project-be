import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User, UserRole } from "./user.entity";
import { NFT } from "./nft.entity";
import { IsNotEmpty, IsString } from "class-validator";
import {
  DEFAULT_CHAIN_ID,
  DEFAULT_COLLECTION_SYMBOL,
} from "@/common/constants";

@Entity("collections")
export class Collection {
  @ApiProperty({ description: "Collection ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Collection name" })
  @Column()
  name: string; //now allow to update

  @ApiProperty({ description: "Collection symbol (immutable)" })
  @Column({ default: DEFAULT_COLLECTION_SYMBOL })
  symbol: string; //now allow to update

  @ApiProperty({ description: "Collection description" })
  @Column({ type: "text" })
  description: string;

  @ApiProperty({
    description: "Collection image URL",
    example:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=300&fit=crop",
  })
  @Column({
    name: "image_url",
    default:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=300&fit=crop",
  })
  imageUrl: string;

  @ApiProperty({
    description: "Default royalty percent (0-100), immutable",
    example: 1,
  })
  @Column({ type: "int", default: 1, name: "royalty_percent" })
  royaltyPercent: number; //now allow to update

  @ApiProperty({ description: "Collection creator ID" })
  @Column({ name: "creator_id" })
  creatorId: number;

  @ApiProperty({
    description: "Chain ID (BSC testnet)",
    example: 97,
  })
  @Column({ type: "int", default: DEFAULT_CHAIN_ID, name: "chain_id" })
  chainId: number;

  @ApiProperty({
    description: "Collection contract address on chain",
    example: "0xabc...",
  })
  @Column({ name: "contract_address", nullable: false })
  @IsNotEmpty()
  @IsString()
  contractAddress: string;

  @ApiProperty({ description: "Collection creation timestamp" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Collection update timestamp" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations
  @OneToMany(() => NFT, (nft) => nft.collection)
  nfts: NFT[];

  @ManyToOne(() => User, (user) => user.ownedCollections)
  @JoinColumn({ name: "creator_id" })
  creator: User;
}
