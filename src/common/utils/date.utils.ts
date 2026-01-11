/**
 * Time window types for filtering data
 */
export type TimeWindow = "24h" | "7d" | "30d";

/**
 * Calculates a date by subtracting a time window from now
 * @param window - Time window: "24h", "7d", or "30d"
 * @returns Date object representing the start of the time window
 */
export function getDateFromWindow(window: TimeWindow): Date {
  const now = Date.now();
  const hours = window === "24h" ? 24 : window === "7d" ? 7 * 24 : 30 * 24;
  return new Date(now - hours * 60 * 60 * 1000);
}

/**
 * Calculates a date by subtracting days from now
 * @param days - Number of days to subtract
 * @returns Date object
 */
export function getDateDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
