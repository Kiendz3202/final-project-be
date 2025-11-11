import { join } from "path";

export const DEFAULT_CHAIN_ID = 97;
export const DEFAULT_COLLECTION_ROYALTY_PERCENT = 1; // percent
export const MIN_ROYALTY_PERCENT = 0;
export const MAX_ROYALTY_PERCENT = 100;

export const DEFAULT_NFT_IMAGE_URL =
  "https://i2.seadn.io/base/0x41dc69132cce31fcbf6755c84538ca268520246f/f388e3a81c30ae83b73b9a281bb035/f0f388e3a81c30ae83b73b9a281bb035.png?w=1000";
export const DEFAULT_COLLECTION_SYMBOL = "GEN";

// Upload paths
export const UPLOADS_PREFIX = "/uploads";
export const UPLOADS_IMAGES_PATH = "/uploads/images";
// Use absolute path from project root for better reliability
// This works in both dev (from src/) and production (from dist/)
// Note: uploads folder is at the same level as src folder
export const UPLOADS_IMAGES_DIR = join(process.cwd(), "uploads", "images");
