import { NFTEventType } from "@/common/entities";

export interface RevenueByCollectionItem {
  collectionId: number;
  collectionName: string;
  revenueBNB: number;
  transactionCount: number;
}

export interface RevenueTrendPoint {
  date: string; // YYYY-MM-DD
  revenueBNB: number;
  transactionCount: number;
}

export interface TopSaleItem {
  nftId: number;
  nftName: string;
  collectionName: string | null;
  priceBNB: number;
  sellerAddress: string | null;
  buyerAddress: string | null;
  timestamp: string;
  txHash: string;
}

export interface AdminRevenueMetrics {
  totalPlatformRevenueBNB: number;
  revenue24h: number;
  revenue7d: number;
  revenue30d: number;
  revenueByCollection: RevenueByCollectionItem[];
  revenueTrend: RevenueTrendPoint[];
}

export interface AdminTransactionMetrics {
  totalTransactions: number;
  transactions24h: number;
  transactions7d: number;
  transactions30d: number;
  transactionsByType: Record<NFTEventType, number>;
  averageSalePriceBNB: number;
  medianSalePriceBNB: number;
  topSales: TopSaleItem[];
}

export interface TopUserByVolume {
  userId: number;
  walletAddress: string;
  username: string | null;
  totalVolumeBNB: number;
  transactionCount: number;
}

export interface TopCreatorMetrics {
  userId: number;
  walletAddress: string;
  username: string | null;
  nftsCreated: number;
}

export interface AdminUserMetrics {
  totalUsers: number;
  newUsers24h: number;
  newUsers7d: number;
  newUsers30d: number;
  topUsersByVolume: TopUserByVolume[];
  topCreators: TopCreatorMetrics[];
}

export interface TopCollectionByVolume {
  collectionId: number;
  collectionName: string;
  totalVolumeBNB: number;
  floorPriceBNB: number | null;
  nftCount: number;
  transactionCount: number;
}

export interface AdminNFTMetrics {
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
  topCollectionsByVolume: TopCollectionByVolume[];
}

export interface SystemHealthStatus {
  status: "healthy" | "degraded" | "down";
  lastUpdated: string;
  databaseStatus: "connected" | "disconnected";
  blockchainStatus: "connected" | "disconnected";
}

export interface RecentActivityItem {
  type: NFTEventType;
  description: string;
  timestamp: string;
  txHash: string;
  nftId: number;
  nftName: string;
  collectionName: string | null;
  priceBNB: number | null;
}

export interface AdminDashboardData {
  revenue: AdminRevenueMetrics;
  transactions: AdminTransactionMetrics;
  users: AdminUserMetrics;
  nfts: AdminNFTMetrics;
  systemHealth: SystemHealthStatus;
  recentActivity: RecentActivityItem[];
}
