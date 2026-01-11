import { ethers } from "ethers";

/**
 * Converts Wei amount to BNB (or ETH on Ethereum)
 * Handles various input types: string, number, null, undefined
 * Also handles decimal strings from database aggregations
 * @param value - Wei amount as string, number, null, or undefined
 * @returns BNB amount as number (0 if value is null/undefined)
 */
export function weiToBNB(value?: string | null | number): number {
  if (value === null || value === undefined) return 0;

  const normalized = typeof value === "string" ? value : value.toString();

  // Handle decimal strings from database aggregations (e.g., AVG, PERCENTILE)
  if (normalized.includes(".")) {
    return parseFloat(normalized) / 1e18;
  }

  // Handle integer wei strings
  return parseFloat(ethers.utils.formatEther(normalized));
}

/**
 * Converts BNB amount to Wei
 * @param bnbAmount - BNB amount as number or string
 * @returns Wei amount as string
 */
export function bnbToWei(bnbAmount: number | string): string {
  return ethers.utils
    .parseEther(
      typeof bnbAmount === "number" ? bnbAmount.toString() : bnbAmount
    )
    .toString();
}
