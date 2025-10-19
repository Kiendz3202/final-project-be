import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User, UserRole } from "./user.entity";
import { NFT } from "./nft.entity";

@Entity("collections")
export class Collection {
  @ApiProperty({ description: "Collection ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Collection name" })
  @Column()
  name: string;

  @ApiProperty({ description: "Collection description" })
  @Column({ type: "text" })
  description: string;

  @ApiProperty({ description: "Collection banner image URL" })
  @Column()
  bannerImageUrl: string;

  @ApiProperty({ description: "Collection logo image URL" })
  @Column()
  logoImageUrl: string;

  @ApiProperty({ description: "Collection website URL" })
  @Column({ nullable: true })
  websiteUrl: string;

  @ApiProperty({ description: "Collection Twitter URL" })
  @Column({ nullable: true })
  twitterUrl: string;

  @ApiProperty({ description: "Collection Discord URL" })
  @Column({ nullable: true })
  discordUrl: string;

  @ApiProperty({ description: "Collection creator ID" })
  @Column()
  creatorId: number;

  @ApiProperty({ description: "Is collection verified" })
  @Column({ default: false })
  isVerified: boolean;

  @ApiProperty({
    description: "Chain ID (BSC testnet)",
    example: 97,
  })
  @Column({ type: "int", default: 97 })
  chainId: number;

  @ApiProperty({
    description: "Collection contract address on chain",
    example: "0xabc...",
  })
  @Column({ nullable: true })
  contractAddress: string;

  @ApiProperty({ description: "Collection creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Collection update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => NFT, (nft) => nft.collection)
  nfts: NFT[];

  @OneToMany(() => User, (user) => user.ownedCollections)
  creator: User;
}
