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

@Entity("nfts")
export class NFT {
  @ApiProperty({ description: "NFT ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "NFT name", example: "Cool NFT #123" })
  @Column()
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
  @Column()
  imageUrl: string;

  @ApiProperty({ description: "Token ID (unique identifier on blockchain)" })
  @Column({ unique: true })
  tokenId: string;

  @ApiProperty({ description: "Price in ETH", example: "0.5" })
  @Column({ type: "decimal", precision: 18, scale: 8, nullable: true })
  price: number;

  @ApiProperty({ description: "Whether the NFT is for sale" })
  @Column({ default: false })
  isForSale: boolean;

  @ApiProperty({ description: "Contract address on blockchain" })
  @Column({ nullable: true })
  contractAddress: string;

  @ApiProperty({ description: "Owner ID" })
  @Column()
  ownerId: number;

  @ApiProperty({ description: "Collection ID" })
  @Column({ nullable: true })
  collectionId: number;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.nfts)
  @JoinColumn({ name: "ownerId" })
  owner: User;

  @ManyToOne(() => Collection, (collection) => collection.nfts)
  @JoinColumn({ name: "collectionId" })
  collection: Collection;

  @OneToMany("NFTHistory", "nft")
  history: any[];
}
