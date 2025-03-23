export const DATABASE_NAME = "sproot";

// Cron Job Schedules
export const CRON = {
  EVERY_SECOND: "* * * * * *",
  EVERY_MINUTE: "0 * * * * *",
};

// Cache Constants
export const INITIAL_CACHE_LOOKBACK = 10080;
export const MAX_CACHE_SIZE = 10080;

// Chart Constants
export const CHART_DATA_POINT_INTERVAL = 5; // minutes between each data point
export const MAX_CHART_DATA_POINTS = 2016; // 7 days of 5 minute intervals (24 * 60 * 7 / 5)
