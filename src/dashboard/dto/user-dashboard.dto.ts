import { NFTEventType } from "@/common/entities";
import { RecentActivityItem, RevenueTrendPoint } from "./admin-dashboard.dto";

export interface UserRevenueMetrics {
  totalEarnedBNB: number;
  revenue24h: number;
  revenue7d: number;
  revenue30d: number;
  revenueByCollection: Array<{
    collectionId: number;
    collectionName: string;
    revenueBNB: number;
    transactionCount: number;
  }>;
  revenueTrend: RevenueTrendPoint[];
}

export interface UserTransactionMetrics {
  totalTransactions: number;
  transactions24h: number;
  transactions7d: number;
  transactions30d: number;
  transactionsByType: Record<NFTEventType, number>;
  averagePurchasePriceBNB: number;
  averageSalePriceBNB: number;
  topPurchases: Array<{
    nftId: number;
    nftName: string;
    collectionName: string | null;
    priceBNB: number;
    sellerAddress: string | null;
    timestamp: string;
    txHash: string;
  }>;
  topSales: Array<{
    nftId: number;
    nftName: string;
    collectionName: string | null;
    priceBNB: number;
    buyerAddress: string | null;
    timestamp: string;
    txHash: string;
  }>;
}

export interface UserNFTMetrics {
  totalNFTs: number;
  listedNFTs: number;
  unlistedNFTs: number;
  nftsCreated24h: number;
  nftsCreated7d: number;
  nftsCreated30d: number;
  totalCollections: number;
  collectionsCreated24h: number;
  collectionsCreated7d: number;
  collectionsCreated30d: number;
  topCollectionsByOwned: Array<{
    collectionId: number;
    collectionName: string;
    ownedCount: number;
    listedCount: number;
  }>;
}

export interface UserDashboardData {
  revenue: UserRevenueMetrics;
  transactions: UserTransactionMetrics;
  nfts: UserNFTMetrics;
  recentActivity: RecentActivityItem[];
}
