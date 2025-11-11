import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { NFT } from "./nft.entity";

export enum NFTEventType {
  MINT = "MINT",
  LISTED = "LISTED",
  UNLISTED = "UNLISTED",
  TRANSFER = "TRANSFER",
}

@Entity("nft_events")
@Unique(["txHash", "logIndex"])
export class NFTEvent {
  @ApiProperty({ description: "Event ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "NFT ID" })
  @Column({ name: "nft_id" })
  nftId: number;

  @ApiProperty({
    description: "Event type",
    enum: NFTEventType,
    example: NFTEventType.MINT,
  })
  @Column({
    type: "varchar",
    length: 20,
    name: "event_type",
  })
  eventType: NFTEventType;

  @ApiProperty({
    description: "From address (NULL for MINT)",
    nullable: true,
    example: "0x123...",
  })
  @Column({ nullable: true, name: "from_address", length: 42 })
  fromAddress: string | null;

  @ApiProperty({
    description: "To address (NULL for LISTED, UNLISTED)",
    nullable: true,
    example: "0x456...",
  })
  @Column({ nullable: true, name: "to_address", length: 42 })
  toAddress: string | null;

  @ApiProperty({
    description: "Price in wei (NULL for MINT, UNLISTED, non-sale TRANSFER)",
    nullable: true,
    example: "1000000000000000000",
  })
  @Column({
    type: "numeric",
    precision: 78,
    scale: 0,
    nullable: true,
    name: "price_wei",
  })
  priceWei: string | null;

  @ApiProperty({
    description: "Transaction hash",
    example: "0xabc123...",
  })
  @Column({ name: "tx_hash", length: 66 })
  txHash: string;

  @ApiProperty({
    description: "Log index in transaction",
    example: 0,
  })
  @Column({ name: "log_index", type: "int" })
  logIndex: number;

  @ApiProperty({
    description: "Block number",
    example: 12345678,
  })
  @Column({ name: "block_number", type: "bigint" })
  blockNumber: number;

  @ApiProperty({
    description: "Block timestamp",
    example: "2024-01-01T00:00:00Z",
  })
  @Column({ name: "block_timestamp", type: "timestamp" })
  blockTimestamp: Date;

  @ApiProperty({
    description: "Chain ID",
    example: 97,
    default: 97,
  })
  @Column({ name: "chain_id", type: "int", default: 97 })
  chainId: number;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  // Relations
  @ManyToOne(() => NFT, { onDelete: "CASCADE" })
  @JoinColumn({ name: "nft_id" })
  nft: NFT;
}
