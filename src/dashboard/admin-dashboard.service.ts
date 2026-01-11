import { Injectable } from "@nestjs/common";
import { NFTEventType, User } from "@/common/entities";
import {
  NFTEventRepository,
  NFTRepository,
  CollectionRepository,
  UserRepository,
} from "@/common/repositories";
import { weiToBNB } from "@/common/utils/blockchain.utils";
import { getDateFromWindow, TimeWindow } from "@/common/utils/date.utils";
import {
  AdminDashboardData,
  AdminNFTMetrics,
  AdminRevenueMetrics,
  AdminTransactionMetrics,
  AdminUserMetrics,
  RecentActivityItem,
  TopCollectionByVolume,
  TopCreatorMetrics,
  TopSaleItem,
  TopUserByVolume,
} from "./dto/admin-dashboard.dto";
import { In, MoreThan } from "typeorm";

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly nftEventRepository: NFTEventRepository,
    private readonly nftRepository: NFTRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly userRepository: UserRepository
  ) {}

  async getOverview(): Promise<AdminDashboardData> {
    const [revenue, transactions, users, nfts, recentActivity] =
      await Promise.all([
        this.getRevenueMetrics(),
        this.getTransactionMetrics(),
        this.getUserMetrics(),
        this.getNFTMetrics(),
        this.getRecentActivity(),
      ]);

    return {
      revenue,
      transactions,
      users,
      nfts,
      systemHealth: this.getSystemHealth(),
      recentActivity,
    };
  }

  private getSystemHealth() {
    return {
      status: "healthy",
      lastUpdated: new Date().toISOString(),
      databaseStatus: "connected",
      blockchainStatus: "connected",
    } as const;
  }

  private async getRevenueForPeriod(startDate?: Date) {
    // Calculate revenue: use platformFeeWei if available, otherwise calculate from priceWei (2.5% platform fee)
    const qb = this.nftEventRepository
      .createQueryBuilder("event")
      .select(
        "SUM(COALESCE(event.platformFeeWei, CAST(event.priceWei AS NUMERIC) * 250 / 10000))",
        "fee"
      )
      .addSelect("COUNT(*)", "count")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL");

    if (startDate) {
      qb.andWhere("event.blockTimestamp >= :startDate", { startDate });
    }

    const raw = await qb.getRawOne<{ fee: string | null; count: string }>();

    return {
      revenueBNB: weiToBNB(raw?.fee ?? "0"),
      transactionCount: Number(raw?.count ?? 0),
    };
  }

  private async getRevenueByCollection(): Promise<
    AdminRevenueMetrics["revenueByCollection"]
  > {
    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .innerJoin("event.nft", "nft")
      .innerJoin("nft.collection", "collection")
      .select("collection.id", "collectionId")
      .addSelect("collection.name", "collectionName")
      .addSelect(
        "SUM(COALESCE(event.platformFeeWei, CAST(event.priceWei AS NUMERIC) * 250 / 10000))",
        "revenueWei"
      )
      .addSelect("COUNT(*)", "transactionCount")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .groupBy("collection.id")
      .addGroupBy("collection.name")
      .orderBy('"revenueWei"', "DESC")
      .limit(5)
      .getRawMany<{
        collectionId: number;
        collectionName: string;
        revenueWei: string | null;
        transactionCount: string;
      }>();

    return rows.map((row) => ({
      collectionId: Number(row.collectionId),
      collectionName: row.collectionName,
      revenueBNB: weiToBNB(row.revenueWei ?? "0"),
      transactionCount: Number(row.transactionCount),
    }));
  }

  private async getRevenueTrend(
    days = 30
  ): Promise<AdminRevenueMetrics["revenueTrend"]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .select("DATE(event.blockTimestamp)", "date")
      .addSelect(
        "SUM(COALESCE(event.platformFeeWei, CAST(event.priceWei AS NUMERIC) * 250 / 10000))",
        "revenueWei"
      )
      .addSelect("COUNT(*)", "transactionCount")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("event.blockTimestamp >= :startDate", { startDate })
      .groupBy("DATE(event.blockTimestamp)")
      .orderBy("DATE(event.blockTimestamp)", "ASC")
      .getRawMany<{
        date: string;
        revenueWei: string | null;
        transactionCount: string;
      }>();
    return rows.map((row) => ({
      date: row.date,
      revenueBNB: weiToBNB(row.revenueWei ?? "0"),
      transactionCount: Number(row.transactionCount),
    }));
  }

  private async getRevenueMetrics(): Promise<AdminRevenueMetrics> {
    const [
      total,
      revenue24h,
      revenue7d,
      revenue30d,
      revenueByCollection,
      trend,
    ] = await Promise.all([
      this.getRevenueForPeriod(),
      this.getRevenueForPeriod(getDateFromWindow("24h")),
      this.getRevenueForPeriod(getDateFromWindow("7d")),
      this.getRevenueForPeriod(getDateFromWindow("30d")),
      this.getRevenueByCollection(),
      this.getRevenueTrend(),
    ]);

    return {
      totalPlatformRevenueBNB: total.revenueBNB,
      revenue24h: revenue24h.revenueBNB,
      revenue7d: revenue7d.revenueBNB,
      revenue30d: revenue30d.revenueBNB,
      revenueByCollection,
      revenueTrend: trend,
    };
  }

  private async countTransactionsSince(startDate: Date): Promise<number> {
    return this.nftEventRepository
      .createQueryBuilder("event")
      .where("event.blockTimestamp >= :startDate", { startDate })
      .getCount();
  }

  private async getTransactionsByType() {
    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .select("event.eventType", "eventType")
      .addSelect("COUNT(*)", "count")
      .groupBy("event.eventType")
      .getRawMany<{ eventType: NFTEventType; count: string }>();

    const base: Record<NFTEventType, number> = {
      [NFTEventType.MINT]: 0,
      [NFTEventType.LISTED]: 0,
      [NFTEventType.UNLISTED]: 0,
      [NFTEventType.TRANSFER]: 0,
    };

    rows.forEach((row) => {
      base[row.eventType] = Number(row.count);
    });

    return base;
  }

  private async getAverageSalePrice(): Promise<number> {
    const raw = await this.nftEventRepository
      .createQueryBuilder("event")
      .select("AVG(event.priceWei)", "avg")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .getRawOne<{ avg: string | null }>();

    return weiToBNB(raw?.avg ?? null);
  }

  private async getMedianSalePrice(): Promise<number> {
    const [result] = await this.nftEventRepository.query(
      `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(price_wei AS NUMERIC)) AS median_price
       FROM nft_events
       WHERE event_type = 'TRANSFER' AND price_wei IS NOT NULL`
    );
    return weiToBNB(result?.median_price ?? null);
  }

  private async getTopSales(): Promise<TopSaleItem[]> {
    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.nft", "nft")
      .leftJoinAndSelect("nft.collection", "collection")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .orderBy("event.priceWei", "DESC")
      .addOrderBy("event.blockTimestamp", "DESC")
      .limit(5)
      .getMany();

    return rows.map((event) => ({
      nftId: event.nftId,
      nftName: event.nft?.name ?? `NFT #${event.nftId}`,
      collectionName: event.nft?.collection?.name ?? null,
      priceBNB: weiToBNB(event.priceWei),
      sellerAddress: event.fromAddress,
      buyerAddress: event.toAddress,
      timestamp: event.blockTimestamp.toISOString(),
      txHash: event.txHash,
    }));
  }

  private async getTransactionMetrics(): Promise<AdminTransactionMetrics> {
    const [
      totalTransactions,
      transactions24h,
      transactions7d,
      transactions30d,
      transactionsByType,
      averageSalePriceBNB,
      medianSalePriceBNB,
      topSales,
    ] = await Promise.all([
      this.nftEventRepository.count(),
      this.countTransactionsSince(getDateFromWindow("24h")),
      this.countTransactionsSince(getDateFromWindow("7d")),
      this.countTransactionsSince(getDateFromWindow("30d")),
      this.getTransactionsByType(),
      this.getAverageSalePrice(),
      this.getMedianSalePrice(),
      this.getTopSales(),
    ]);

    return {
      totalTransactions,
      transactions24h,
      transactions7d,
      transactions30d,
      transactionsByType,
      averageSalePriceBNB,
      medianSalePriceBNB,
      topSales,
    };
  }

  private async getRecentActivity(): Promise<RecentActivityItem[]> {
    const events = await this.nftEventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.nft", "nft")
      .leftJoinAndSelect("nft.collection", "collection")
      .orderBy("event.blockTimestamp", "DESC")
      .addOrderBy("event.logIndex", "DESC")
      .limit(10)
      .getMany();

    return events.map((event) => {
      // Show price for TRANSFER (sales) and LISTED events with valid priceWei
      let priceBNB: number | null = null;
      if (
        (event.eventType === NFTEventType.TRANSFER ||
          event.eventType === NFTEventType.LISTED) &&
        event.priceWei !== null &&
        event.priceWei !== undefined &&
        event.priceWei !== "0"
      ) {
        const converted = weiToBNB(event.priceWei);
        // Only set price if conversion resulted in a non-zero value
        if (converted > 0) {
          priceBNB = converted;
        }
      }

      return {
        type: event.eventType,
        description: `${event.eventType} - ${event.nft?.name ?? `NFT #${event.nftId}`}`,
        timestamp: event.blockTimestamp.toISOString(),
        txHash: event.txHash,
        nftId: event.nftId,
        nftName: event.nft?.name ?? `NFT #${event.nftId}`,
        collectionName: event.nft?.collection?.name ?? null,
        priceBNB,
      };
    });
  }

  private async getTopUsersByVolume(): Promise<TopUserByVolume[]> {
    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .innerJoin(
        User,
        "user",
        "LOWER(user.walletAddress) = LOWER(event.fromAddress)"
      )
      .select("user.id", "userId")
      .addSelect("user.walletAddress", "walletAddress")
      .addSelect("user.username", "username")
      .addSelect("COALESCE(SUM(event.priceWei), 0)", "volumeWei")
      .addSelect("COUNT(*)", "transactionCount")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .groupBy("user.id")
      .addGroupBy("user.walletAddress")
      .addGroupBy("user.username")
      .orderBy('"volumeWei"', "DESC")
      .limit(5)
      .getRawMany<{
        userId: number;
        walletAddress: string;
        username: string | null;
        volumeWei: string;
        transactionCount: string;
      }>();

    return rows.map((row) => ({
      userId: Number(row.userId),
      walletAddress: row.walletAddress,
      username: row.username,
      totalVolumeBNB: weiToBNB(row.volumeWei),
      transactionCount: Number(row.transactionCount),
    }));
  }

  private async getTopCreators(): Promise<TopCreatorMetrics[]> {
    const creatorStats = await this.nftRepository
      .createQueryBuilder("nft")
      .select("nft.creatorId", "creatorId")
      .addSelect("COUNT(nft.id)", "nftsCreated")
      .where("nft.creatorId IS NOT NULL")
      .groupBy("nft.creatorId")
      .orderBy("COUNT(nft.id)", "DESC")
      .limit(5)
      .getRawMany<{
        creatorId: number;
        nftsCreated: string;
      }>();

    if (!creatorStats.length) {
      return [];
    }

    const creatorIds = creatorStats.map((stat) => Number(stat.creatorId));

    const users = creatorIds.length
      ? await this.userRepository.find({
          where: { id: In(creatorIds) },
        })
      : [];
    const userMap = new Map<number, User>();
    users.forEach((user) => userMap.set(user.id, user));

    return creatorStats.map((stat) => {
      const creatorId = Number(stat.creatorId);
      const user = userMap.get(creatorId);
      return {
        userId: creatorId,
        walletAddress: user?.walletAddress ?? "",
        username: user?.username ?? null,
        nftsCreated: Number(stat.nftsCreated),
      };
    });
  }

  private async getUserMetrics(): Promise<AdminUserMetrics> {
    const [
      totalUsers,
      newUsers24h,
      newUsers7d,
      newUsers30d,
      topUsersByVolume,
      topCreators,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("24h")) },
      }),
      this.userRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("7d")) },
      }),
      this.userRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("30d")) },
      }),
      this.getTopUsersByVolume(),
      this.getTopCreators(),
    ]);

    return {
      totalUsers,
      newUsers24h,
      newUsers7d,
      newUsers30d,
      topUsersByVolume,
      topCreators,
    };
  }

  private async getFloorPriceForCollection(
    collectionId: number
  ): Promise<number | null> {
    const raw = await this.nftRepository
      .createQueryBuilder("nft")
      .select("MIN(nft.price)", "floorPrice")
      .where("nft.collectionId = :collectionId", { collectionId })
      .andWhere("nft.isForSale = :isForSale", { isForSale: true })
      .andWhere("nft.price IS NOT NULL")
      .getRawOne<{ floorPrice: string | null }>();

    if (!raw?.floorPrice) {
      return null;
    }
    return Number(raw.floorPrice);
  }

  private async getTopCollectionsByVolume(): Promise<TopCollectionByVolume[]> {
    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .innerJoin("event.nft", "nft")
      .innerJoin("nft.collection", "collection")
      .select("collection.id", "collectionId")
      .addSelect("collection.name", "collectionName")
      .addSelect("COALESCE(SUM(event.priceWei), 0)", "volumeWei")
      .addSelect("COUNT(*)", "transactionCount")
      .addSelect("COUNT(DISTINCT nft.id)", "nftCount")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .groupBy("collection.id")
      .addGroupBy("collection.name")
      .orderBy('"volumeWei"', "DESC")
      .limit(5)
      .getRawMany<{
        collectionId: number;
        collectionName: string;
        volumeWei: string;
        transactionCount: string;
        nftCount: string;
      }>();

    const results: TopCollectionByVolume[] = [];
    for (const row of rows) {
      const floorPriceBNB = await this.getFloorPriceForCollection(
        Number(row.collectionId)
      );
      results.push({
        collectionId: Number(row.collectionId),
        collectionName: row.collectionName,
        totalVolumeBNB: weiToBNB(row.volumeWei),
        floorPriceBNB,
        nftCount: Number(row.nftCount),
        transactionCount: Number(row.transactionCount),
      });
    }

    return results;
  }

  private async getNFTMetrics(): Promise<AdminNFTMetrics> {
    const [
      totalNFTs,
      listedNFTs,
      nftsCreated24h,
      nftsCreated7d,
      nftsCreated30d,
      totalCollections,
      collectionsCreated24h,
      collectionsCreated7d,
      collectionsCreated30d,
      topCollectionsByVolume,
    ] = await Promise.all([
      this.nftRepository.count(),
      this.nftRepository.count({ where: { isForSale: true } }),
      this.nftRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("24h")) },
      }),
      this.nftRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("7d")) },
      }),
      this.nftRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("30d")) },
      }),
      this.collectionRepository.count(),
      this.collectionRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("24h")) },
      }),
      this.collectionRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("7d")) },
      }),
      this.collectionRepository.count({
        where: { createdAt: MoreThan(getDateFromWindow("30d")) },
      }),
      this.getTopCollectionsByVolume(),
    ]);

    const unlistedNFTs = totalNFTs - listedNFTs;

    return {
      totalNFTs,
      listedNFTs,
      unlistedNFTs,
      nftsCreated24h,
      nftsCreated7d,
      nftsCreated30d,
      totalCollections,
      collectionsCreated24h,
      collectionsCreated7d,
      collectionsCreated30d,
      topCollectionsByVolume,
    };
  }
}
