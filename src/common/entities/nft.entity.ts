import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "./user.entity";
import { Collection } from "./collection.entity";
import { NFTEvent } from "./nft-event.entity";
import { DEFAULT_NFT_IMAGE_URL } from "@/common/constants";

@Entity("nfts")
export class NFT {
  @ApiProperty({ description: "NFT ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "NFT name", example: "Cool NFT #123" })
  @Column({ update: false })
  name: string;

  @ApiProperty({
    description: "NFT description",
    example: "A very cool digital art piece",
  })
  @Column({ type: "text", nullable: true })
  description: string;

  @ApiProperty({
    description: "Image URL",
    example: "https://s3.amazonaws.com/bucket/image.jpg",
  })
  @Column({ name: "image_url", default: DEFAULT_NFT_IMAGE_URL })
  imageUrl: string; //now allow to update

  @ApiProperty({
    description: "Token ID (unique identifier on blockchain)",
    nullable: true,
  })
  @Column({ nullable: true, name: "token_id" })
  tokenId: string | null;

  @ApiProperty({ description: "Price in ETH", example: "0.5" })
  @Column({ type: "decimal", precision: 18, scale: 8, nullable: true })
  price: number;

  @ApiProperty({ description: "Whether the NFT is for sale" })
  @Column({ default: false, name: "is_for_sale" })
  isForSale: boolean;

  @ApiProperty({ description: "Contract address on blockchain" })
  @Column({ nullable: true, name: "contract_address" })
  contractAddress: string;

  @ApiProperty({ description: "Owner ID" })
  @Column({ name: "owner_id" })
  ownerId: number;

  @ApiProperty({ description: "Creator ID (first minter), immutable" })
  @Column({ name: "creator_id", nullable: true })
  creatorId: number; //now allow to update

  @ApiProperty({
    description: "Per-NFT royalty percent (0-100), immutable",
    required: false,
    nullable: true,
  })
  @Column({
    type: "int",
    name: "royalty_percent",
    nullable: true,
  })
  royaltyPercent: number | null; //now allow to update

  @ApiProperty({ description: "Collection ID" })
  @Column({ nullable: true, name: "collection_id" })
  collectionId: number;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.nfts)
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @ManyToOne(() => User, (user) => user.nfts)
  @JoinColumn({ name: "creator_id" })
  creator: User;

  @ManyToOne(() => Collection, (collection) => collection.nfts)
  @JoinColumn({ name: "collection_id" })
  collection: Collection;

  @OneToMany(() => NFTEvent, (event) => event.nft)
  events: NFTEvent[];
}
