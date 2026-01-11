import { Injectable, NotFoundException } from "@nestjs/common";
import { MoreThan } from "typeorm";
import {
  CollectionRepository,
  NFTEventRepository,
  NFTRepository,
  UserRepository,
} from "@/common/repositories";
import { User, NFTEventType } from "@/common/entities";
import { weiToBNB } from "@/common/utils/blockchain.utils";
import { getDateFromWindow } from "@/common/utils/date.utils";
import {
  UserDashboardData,
  UserRevenueMetrics,
  UserTransactionMetrics,
  UserNFTMetrics,
} from "./dto/user-dashboard.dto";
import { RecentActivityItem } from "./dto/admin-dashboard.dto";

@Injectable()
export class UserDashboardService {
  constructor(
    private readonly nftRepository: NFTRepository,
    private readonly nftEventRepository: NFTEventRepository,
    private readonly userRepository: UserRepository,
    private readonly collectionRepository: CollectionRepository
  ) {}

  async getOverview(userId: number): Promise<UserDashboardData> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const [revenue, transactions, nfts, recentActivity] = await Promise.all([
      this.getRevenueMetrics(user),
      this.getTransactionMetrics(user),
      this.getNFTMetrics(user),
      this.getRecentActivity(user.walletAddress),
    ]);

    return {
      revenue,
      transactions,
      nfts,
      recentActivity,
    };
  }

  private async getRevenueMetrics(user: User): Promise<UserRevenueMetrics> {
    const [total, revenue24h, revenue7d, revenue30d, byCollection, trend] =
      await Promise.all([
        this.getRevenueForPeriod(user.walletAddress),
        this.getRevenueForPeriod(user.walletAddress, getDateFromWindow("24h")),
        this.getRevenueForPeriod(user.walletAddress, getDateFromWindow("7d")),
        this.getRevenueForPeriod(user.walletAddress, getDateFromWindow("30d")),
        this.getRevenueByCollection(user.walletAddress),
        this.getRevenueTrend(user.walletAddress, 30),
      ]);

    return {
      totalEarnedBNB: total.revenueBNB,
      revenue24h: revenue24h.revenueBNB,
      revenue7d: revenue7d.revenueBNB,
      revenue30d: revenue30d.revenueBNB,
      revenueByCollection: byCollection,
      revenueTrend: trend,
    };
  }

  private async getRevenueForPeriod(
    walletAddress: string | null,
    startDate?: Date
  ): Promise<{ revenueBNB: number; transactionCount: number }> {
    if (!walletAddress) {
      return { revenueBNB: 0, transactionCount: 0 };
    }

    const qb = this.nftEventRepository
      .createQueryBuilder("event")
      .select(
        "SUM(GREATEST(CAST(event.priceWei AS NUMERIC) - COALESCE(CAST(event.platformFeeWei AS NUMERIC), 0) - COALESCE(CAST(event.royaltyAmountWei AS NUMERIC), 0), 0))",
        "revenue"
      )
      .addSelect("COUNT(*)", "count")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.fromAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      });

    if (startDate) {
      qb.andWhere("event.blockTimestamp >= :startDate", { startDate });
    }

    const raw = await qb.getRawOne<{ revenue: string | null; count: string }>();

    return {
      revenueBNB: weiToBNB(raw?.revenue ?? "0"),
      transactionCount: Number(raw?.count ?? 0),
    };
  }

  private async getRevenueByCollection(
    walletAddress: string | null
  ): Promise<UserRevenueMetrics["revenueByCollection"]> {
    if (!walletAddress) {
      return [];
    }

    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .innerJoin("event.nft", "nft")
      .innerJoin("nft.collection", "collection")
      .select("collection.id", "collectionId")
      .addSelect("collection.name", "collectionName")
      .addSelect(
        "SUM(GREATEST(CAST(event.priceWei AS NUMERIC) - COALESCE(CAST(event.platformFeeWei AS NUMERIC), 0) - COALESCE(CAST(event.royaltyAmountWei AS NUMERIC), 0), 0))",
        "revenueWei"
      )
      .addSelect("COUNT(*)", "transactionCount")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.fromAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      })
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
    walletAddress: string | null,
    days = 30
  ): Promise<UserRevenueMetrics["revenueTrend"]> {
    if (!walletAddress) {
      return [];
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .select("DATE(event.blockTimestamp)", "date")
      .addSelect(
        "SUM(GREATEST(CAST(event.priceWei AS NUMERIC) - COALESCE(CAST(event.platformFeeWei AS NUMERIC), 0) - COALESCE(CAST(event.royaltyAmountWei AS NUMERIC), 0), 0))",
        "revenueWei"
      )
      .addSelect("COUNT(*)", "transactionCount")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.fromAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      })
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

  private async getTransactionMetrics(
    user: User
  ): Promise<UserTransactionMetrics> {
    const [
      total,
      transactions24h,
      transactions7d,
      transactions30d,
      byType,
      avgPurchase,
      avgSale,
      topPurchases,
      topSales,
    ] = await Promise.all([
      this.countTransactions(user.walletAddress),
      this.countTransactions(user.walletAddress, getDateFromWindow("24h")),
      this.countTransactions(user.walletAddress, getDateFromWindow("7d")),
      this.countTransactions(user.walletAddress, getDateFromWindow("30d")),
      this.getTransactionsByType(user.walletAddress),
      this.getAveragePurchasePrice(user.walletAddress),
      this.getAverageSalePrice(user.walletAddress),
      this.getTopPurchases(user.walletAddress),
      this.getTopSales(user.walletAddress),
    ]);

    return {
      totalTransactions: total,
      transactions24h,
      transactions7d,
      transactions30d,
      transactionsByType: byType,
      averagePurchasePriceBNB: avgPurchase,
      averageSalePriceBNB: avgSale,
      topPurchases,
      topSales,
    };
  }

  private async countTransactions(
    walletAddress: string | null,
    startDate?: Date
  ): Promise<number> {
    if (!walletAddress) {
      return 0;
    }

    const qb = this.nftEventRepository
      .createQueryBuilder("event")
      .where(
        "(LOWER(event.fromAddress) = LOWER(:wallet) OR LOWER(event.toAddress) = LOWER(:wallet))",
        { wallet: walletAddress }
      );

    if (startDate) {
      qb.andWhere("event.blockTimestamp >= :startDate", { startDate });
    }

    return qb.getCount();
  }

  private async getTransactionsByType(
    walletAddress: string | null
  ): Promise<Record<NFTEventType, number>> {
    if (!walletAddress) {
      return {
        [NFTEventType.MINT]: 0,
        [NFTEventType.LISTED]: 0,
        [NFTEventType.UNLISTED]: 0,
        [NFTEventType.TRANSFER]: 0,
      };
    }

    const rows = await this.nftEventRepository
      .createQueryBuilder("event")
      .select("event.eventType", "eventType")
      .addSelect("COUNT(*)", "count")
      .where(
        "(LOWER(event.fromAddress) = LOWER(:wallet) OR LOWER(event.toAddress) = LOWER(:wallet))",
        { wallet: walletAddress }
      )
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

  private async getAveragePurchasePrice(
    walletAddress: string | null
  ): Promise<number> {
    if (!walletAddress) {
      return 0;
    }

    const raw = await this.nftEventRepository
      .createQueryBuilder("event")
      .select("AVG(CAST(event.priceWei AS NUMERIC))", "avg")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.toAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      })
      .getRawOne<{ avg: string | null }>();

    return weiToBNB(raw?.avg ?? null);
  }

  private async getAverageSalePrice(
    walletAddress: string | null
  ): Promise<number> {
    if (!walletAddress) {
      return 0;
    }

    const raw = await this.nftEventRepository
      .createQueryBuilder("event")
      .select(
        "AVG(GREATEST(CAST(event.priceWei AS NUMERIC) - COALESCE(CAST(event.platformFeeWei AS NUMERIC), 0) - COALESCE(CAST(event.royaltyAmountWei AS NUMERIC), 0), 0))",
        "avg"
      )
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.fromAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      })
      .getRawOne<{ avg: string | null }>();

    const rawTest = await this.nftEventRepository
      .createQueryBuilder("event")
      .select("COUNT(*)", "count")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.fromAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      })
      .getRawMany<{ count: string }>();
    console.log("rawwwww", rawTest);
    return weiToBNB(raw?.avg ?? null);
  }

  private async getTopPurchases(
    walletAddress: string | null
  ): Promise<UserTransactionMetrics["topPurchases"]> {
    if (!walletAddress) {
      return [];
    }

    const events = await this.nftEventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.nft", "nft")
      .leftJoinAndSelect("nft.collection", "collection")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.toAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      })
      .orderBy("event.priceWei", "DESC")
      .addOrderBy("event.blockTimestamp", "DESC")
      .limit(5)
      .getMany();

    return events.map((event) => ({
      nftId: event.nftId,
      nftName: event.nft?.name ?? `NFT #${event.nftId}`,
      collectionName: event.nft?.collection?.name ?? null,
      priceBNB: weiToBNB(event.priceWei!),
      sellerAddress: event.fromAddress,
      timestamp: event.blockTimestamp.toISOString(),
      txHash: event.txHash,
    }));
  }

  private async getTopSales(
    walletAddress: string | null
  ): Promise<UserTransactionMetrics["topSales"]> {
    if (!walletAddress) {
      return [];
    }

    const events = await this.nftEventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.nft", "nft")
      .leftJoinAndSelect("nft.collection", "collection")
      .where("event.eventType = :eventType", {
        eventType: NFTEventType.TRANSFER,
      })
      .andWhere("event.priceWei IS NOT NULL")
      .andWhere("LOWER(event.fromAddress) = LOWER(:wallet)", {
        wallet: walletAddress,
      })
      .orderBy("event.priceWei", "DESC")
      .addOrderBy("event.blockTimestamp", "DESC")
      .limit(5)
      .getMany();

    return events.map((event) => ({
      nftId: event.nftId,
      nftName: event.nft?.name ?? `NFT #${event.nftId}`,
      collectionName: event.nft?.collection?.name ?? null,
      priceBNB: weiToBNB(event.priceWei!),
      buyerAddress: event.toAddress,
      timestamp: event.blockTimestamp.toISOString(),
      txHash: event.txHash,
    }));
  }

  private async getNFTMetrics(user: User): Promise<UserNFTMetrics> {
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
      topCollections,
    ] = await Promise.all([
      this.nftRepository.count({ where: { ownerId: user.id } }),
      this.nftRepository.count({
        where: { ownerId: user.id, isForSale: true },
      }),
      this.nftRepository.count({
        where: {
          creatorId: user.id,
          createdAt: MoreThan(getDateFromWindow("24h")),
        },
      }),
      this.nftRepository.count({
        where: {
          creatorId: user.id,
          createdAt: MoreThan(getDateFromWindow("7d")),
        },
      }),
      this.nftRepository.count({
        where: {
          creatorId: user.id,
          createdAt: MoreThan(getDateFromWindow("30d")),
        },
      }),
      this.collectionRepository.count({
        where: { creatorId: user.id },
      }),
      this.countCollectionsCreated(user.id, getDateFromWindow("24h")),
      this.countCollectionsCreated(user.id, getDateFromWindow("7d")),
      this.countCollectionsCreated(user.id, getDateFromWindow("30d")),
      this.getTopCollectionsByOwned(user.id),
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
      topCollectionsByOwned: topCollections,
    };
  }

  private async countCollectionsCreated(
    userId: number,
    startDate: Date
  ): Promise<number> {
    // Count collections where user is creator and created after startDate
    return this.collectionRepository.count({
      where: {
        creatorId: userId,
        createdAt: MoreThan(startDate),
      },
    });
  }

  private async getTopCollectionsByOwned(
    userId: number
  ): Promise<UserNFTMetrics["topCollectionsByOwned"]> {
    const rows = await this.nftRepository
      .createQueryBuilder("nft")
      .leftJoin("nft.collection", "collection")
      .select("collection.id", "collectionId")
      .addSelect("collection.name", "collectionName")
      .addSelect("COUNT(nft.id)", "ownedCount")
      .addSelect(
        "SUM(CASE WHEN nft.isForSale THEN 1 ELSE 0 END)",
        "listedCount"
      )
      .where("nft.ownerId = :userId", { userId })
      .groupBy("collection.id")
      .addGroupBy("collection.name")
      .orderBy("COUNT(nft.id)", "DESC")
      .limit(5)
      .getRawMany<{
        collectionId: number | null;
        collectionName: string | null;
        ownedCount: string;
        listedCount: string | null;
      }>();

    return rows.map((row) => ({
      collectionId: row.collectionId ?? 0,
      collectionName: row.collectionName ?? "Uncategorized",
      ownedCount: Number(row.ownedCount),
      listedCount: Number(row.listedCount ?? 0),
    }));
  }

  private async getRecentActivity(
    walletAddress: string | null
  ): Promise<RecentActivityItem[]> {
    if (!walletAddress) {
      return [];
    }

    const events = await this.nftEventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.nft", "nft")
      .leftJoinAndSelect("nft.collection", "collection")
      .where(
        "(LOWER(event.fromAddress) = LOWER(:wallet) OR LOWER(event.toAddress) = LOWER(:wallet))",
        { wallet: walletAddress }
      )
      .orderBy("event.blockTimestamp", "DESC")
      .addOrderBy("event.logIndex", "DESC")
      .limit(10)
      .getMany();

    return events.map((event) => {
      let priceBNB: number | null = null;
      if (
        event.priceWei &&
        (event.eventType === NFTEventType.TRANSFER ||
          event.eventType === NFTEventType.LISTED)
      ) {
        priceBNB = weiToBNB(event.priceWei);
      }

      return {
        type: event.eventType,
        description: `${event.eventType} - ${
          event.nft?.name ?? `NFT #${event.nftId}`
        }`,
        timestamp: event.blockTimestamp.toISOString(),
        txHash: event.txHash,
        nftId: event.nftId,
        nftName: event.nft?.name ?? `NFT #${event.nftId}`,
        collectionName: event.nft?.collection?.name ?? null,
        priceBNB,
      };
    });
  }
}
