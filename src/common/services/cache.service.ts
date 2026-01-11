import { Injectable } from "@nestjs/common";
import { RedisService } from "@/redis/redis.service";

@Injectable()
export class CacheService {
  private readonly TTL = {
    NFT_LIST_DEFAULT: 60, // 60 seconds
    COLLECTION_LIST_DEFAULT: 60, // 60 seconds
  };

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generic cache methods
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redisService.getObject<T>(key);
    } catch (error) {
      console.error(`[CACHE] Redis GET Error - Key: ${key}:`, error);
      return null; // Fail silently, fallback to database
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.redisService.setObject(key, value, ttl);
    } catch (error) {
      console.error(`[CACHE] Redis SET Error - Key: ${key}:`, error);
      // Fail silently, don't break the request
    }
  }

  /**
   * Generate cache key for NFT list (default params only)
   */
  generateNFTListDefaultKey(page: number, limit: number): string {
    return `nft:list:page:${page}:limit:${limit}`;
  }

  /**
   * Generate cache key for Collection list (default params only)
   */
  generateCollectionListDefaultKey(page: number, limit: number): string {
    return `collections:list:page:${page}:limit:${limit}`;
  }

  /**
   * Check if params are default (no filters)
   * Only checks for filters, not specific page/limit values
   * Handles both string and number types for page/limit (query params come as strings)
   */
  isNFTListDefault(params: {
    page?: number | string;
    limit?: number | string;
    search?: string;
    isForSale?: boolean;
    ownerId?: number;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
  }): boolean {
    // Check if no filters are applied (regardless of page/limit values)
    return (
      !params.search &&
      params.isForSale === undefined &&
      params.ownerId === undefined &&
      params.minPrice === undefined &&
      params.maxPrice === undefined &&
      !params.sort
    );
  }

  /**
   * Check if params are default (no search)
   * Only checks for search filter, not specific page/limit values
   */
  isCollectionListDefault(params: {
    page?: number | string;
    limit?: number | string;
    search?: string;
  }): boolean {
    // Check if no search filter is applied (regardless of page/limit values)
    return !params.search;
  }

  /**
   * Invalidate all cache (NFT and Collection)
   * Called when any mutation happens
   * Uses FLUSHDB for simplicity - deletes all keys in Redis
   * WARNING: Only use if Redis is dedicated to caching
   */
  async invalidateAll(): Promise<void> {
    try {
      console.log(`[CACHE] Invalidating all cache keys`);
      await this.redisService.flushAll();
      console.log(`[CACHE] Flushed all cache keys`);
    } catch (error) {
      console.error(`[CACHE] Flush all error:`, error);
    }
  }
}
