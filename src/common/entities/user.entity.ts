import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { NFT } from "./nft.entity";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

@Entity("users")
export class User {
  @ApiProperty({ description: "User ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Wallet address",
    example: "0x1234567890abcdef1234567890abcdef12345678",
  })
  @Column({ unique: true })
  walletAddress: string;

  @ApiProperty({
    description: "Username",
    example: "john_doe",
    required: false,
  })
  @Column({ nullable: true })
  username: string;

  @ApiProperty({
    description: "User role",
    enum: UserRole,
    default: UserRole.USER,
  })
  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: "User description/bio",
    example: "Digital artist and NFT collector",
    required: false,
  })
  @Column({ type: "text", nullable: true })
  description: string;

  @ApiProperty({
    description: "User avatar URL",
    example: "https://example.com/avatar.jpg",
    required: false,
  })
  @Column({ nullable: true })
  avatar: string;

  @ApiProperty({
    description: "Facebook profile URL",
    example: "https://facebook.com/username",
    required: false,
  })
  @Column({ nullable: true })
  facebookUrl: string;

  @ApiProperty({
    description: "Instagram profile URL",
    example: "https://instagram.com/username",
    required: false,
  })
  @Column({ nullable: true })
  instagramUrl: string;

  @ApiProperty({
    description: "YouTube channel URL",
    example: "https://youtube.com/@username",
    required: false,
  })
  @Column({ nullable: true })
  youtubeUrl: string;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NFT, (nft) => nft.owner)
  nfts: NFT[];

  @OneToMany("Collection", "creator")
  ownedCollections: any[];
}
