import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "./user.entity";
import { NFT } from "./nft.entity";

@Entity("nft_history")
export class NFTHistory {
  @ApiProperty({ description: "History record ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "NFT ID" })
  @Column()
  nftId: number;

  @ApiProperty({ description: "Former owner ID (null for first creation)" })
  @Column({ nullable: true })
  formerOwnerId: number;

  @ApiProperty({ description: "Current owner ID" })
  @Column()
  currentOwnerId: number;

  @ApiProperty({ description: "NFT price at the time of purchase" })
  @Column({ type: "decimal", precision: 18, scale: 8, nullable: true })
  price: number;

  @ApiProperty({ description: "Transaction hash on blockchain" })
  @Column({ nullable: true })
  transactionHash: string;

  @ApiProperty({ description: "Transaction timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => NFT, { onDelete: "CASCADE" })
  @JoinColumn({ name: "nftId" })
  nft: NFT;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "formerOwnerId" })
  formerOwner: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "currentOwnerId" })
  currentOwner: User;
}
