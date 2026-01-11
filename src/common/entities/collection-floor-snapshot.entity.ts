import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Collection } from "./collection.entity";

@Entity("collection_floor_snapshots")
@Unique(["collectionId", "snapshotAt"])
@Index(["collectionId", "snapshotAt"])
export class CollectionFloorSnapshot {
  @ApiProperty({ description: "Snapshot ID" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Collection ID" })
  @Column({ name: "collection_id" })
  collectionId: number;

  @ApiProperty({
    description: "Floor price in BNB at snapshot time",
    example: 0.08,
    nullable: true,
  })
  @Column({
    type: "decimal",
    precision: 18,
    scale: 8,
    nullable: true,
    name: "floor_price",
  })
  floorPrice: number | null;

  @ApiProperty({ description: "Snapshot timestamp" })
  @Column({ name: "snapshot_at", type: "timestamp" })
  snapshotAt: Date;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => Collection)
  @JoinColumn({ name: "collection_id" })
  collection: Collection;
}
