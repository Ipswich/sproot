import { ReadingType } from "../sensors/SensorBase";

interface ChartData {
  name: string;
  units?: string;
  [key: string]: number | string;
}

interface LookbackData extends StatsResult {
  label: string;
}

interface StatsResult {
  average: string;
  min: string;
  max: string;
  chartData: ChartData[];
}

interface ChartDataSubsection {
  filters: string[];
  lookbacks: {
    all: LookbackData;
    sixHours: LookbackData;
    twelveHours: LookbackData;
    twentyFourHours: LookbackData;
    seventyTwoHours: LookbackData;
  };
}

class ChartDataRecord {
  chartData: Record<ReadingType, ChartData[]>;
  units: Record<ReadingType, string>;
  chartSubData: Record<ReadingType, ChartDataSubsection>;
  maxEntries: number;

  constructor(
    chartData: Record<ReadingType, ChartData[]>,
    filters: Record<ReadingType, string[]>,
    maxEntries: number,
  ) {
    this.maxEntries = maxEntries;
    this.chartData = {} as Record<ReadingType, ChartData[]>;
    this.units = {} as Record<ReadingType, string>;
    this.chartSubData = {} as Record<ReadingType, ChartDataSubsection>;
    for (const readingType in chartData) {
      this.chartData[readingType as ReadingType] = [];
      this.chartSubData[readingType as ReadingType] = {
        filters: filters[readingType as ReadingType] || [],
        lookbacks: {
          all: { label: "All", chartData: [], average: "N/A", min: "N/A", max: "N/A" },
          sixHours: { label: "6 Hours", chartData: [], average: "N/A", min: "N/A", max: "N/A" },
          twelveHours: {
            label: "12 Hours",
            chartData: [],
            average: "N/A",
            min: "N/A",
            max: "N/A",
          },
          twentyFourHours: {
            label: "24 Hours",
            chartData: [],
            average: "N/A",
            min: "N/A",
            max: "N/A",
          },
          seventyTwoHours: {
            label: "72 Hours",
            chartData: [],
            average: "N/A",
            min: "N/A",
            max: "N/A",
          },
        },
      };
    }
    this.loadChartData(chartData);
    for (const readingType in chartData) {
      if (
        this.chartData[readingType as ReadingType][0] &&
        this.chartData[readingType as ReadingType][0]!.units
      ) {
        this.units[readingType as ReadingType] =
          this.chartData[readingType as ReadingType][0]!.units!;
      }
    }
  }

  loadChartData(chartData: Record<ReadingType, ChartData[]>): void {
    this.chartData = chartData;
    for (const readingType in this.chartData) {
      while (this.chartData[readingType as ReadingType].length > this.maxEntries) {
        this.chartData[readingType as ReadingType].shift();
      }
    }

    this.updateAllChartDataSubsections();
  }

  addChartData(chartData: Record<ReadingType, ChartData[]>): void {
    for (const readingType in chartData) {
      this.chartData[readingType as ReadingType].push(...chartData[readingType as ReadingType]);
      while (this.chartData[readingType as ReadingType].length > this.maxEntries) {
        this.chartData[readingType as ReadingType].shift();
      }
    }

    this.updateAllChartDataSubsections();
  }

  updateAllChartDataSubsections(): void {
    for (const readingType in this.chartData) {
      this.chartSubData[readingType as ReadingType] = Utils.generateChartDataSubsection(
        this.chartData[readingType as ReadingType],
        this.chartSubData[readingType as ReadingType].filters,
      );
    }
  }
}

class Utils {
  static generateChartDataSubsection(
    chartData: ChartData[],
    filters: string[],
  ): ChartDataSubsection {
    const LookbackIntervals = [72, 144, 288, 864];
    const filteredChartData = Utils.filterChartData(chartData, filters || []);
    const statsData = Utils.getStatisticsAndDataFromAllChartData(
      filteredChartData,
      LookbackIntervals,
    );
    const allData = statsData[-1] ?? { average: "N/A", min: "N/A", max: "N/A", chartData: [] };
    const sixHourData = statsData[72] ?? allData;
    const twelveHourData = statsData[144] ?? allData;
    const twentyFourHourData = statsData[288] ?? allData;
    const seventyTwoHourData = statsData[864] ?? allData;

    return {
      filters,
      lookbacks: {
        all: {
          label: "All",
          chartData: allData.chartData,
          average: allData.average,
          min: allData.min,
          max: allData.max,
        },
        sixHours: {
          label: "6 Hours",
          chartData: sixHourData.chartData,
          average: sixHourData.average,
          min: sixHourData.min,
          max: sixHourData.max,
        },
        twelveHours: {
          label: "12 Hours",
          chartData: twelveHourData.chartData,
          average: twelveHourData.average,
          min: twelveHourData.min,
          max: twelveHourData.max,
        },
        twentyFourHours: {
          label: "24 Hours",
          chartData: twentyFourHourData.chartData,
          average: twentyFourHourData.average,
          min: twentyFourHourData.min,
          max: twentyFourHourData.max,
        },
        seventyTwoHours: {
          label: "72 Hours",
          chartData: seventyTwoHourData.chartData,
          average: seventyTwoHourData.average,
          min: seventyTwoHourData.min,
          max: seventyTwoHourData.max,
        },
      },
    };
  }

  static getStatisticsFromChartData(chartData: ChartData[]): {
    average: string;
    min: string;
    max: string;
  } {
    let sumTotal = 0;
    let readingCount = 0;
    let min,
      max = undefined;
    for (const datum of chartData) {
      for (const property in datum) {
        // Filter out explicit properties
        if (property === "name" || property === "units") {
          continue;
        }

        const value = Number(datum[property]);
        if (isNaN(value)) {
          continue;
        }
        if (min === undefined || value < min) {
          min = value;
        }
        if (max === undefined || value > max) {
          max = value;
        }

        sumTotal += Number(value);
        readingCount++;
      }
    }
    return {
      average: (sumTotal / readingCount).toFixed(2),
      min: min?.toFixed(2) || "N/A",
      max: max?.toFixed(2) || "N/A",
    };
  }

  static getStatisticsAndDataFromAllChartData(
    chartData: ChartData[],
    intervals: number[],
  ): Record<number, StatsResult> {
    let sumTotal = 0;
    let chartDataCount = 0;
    let readingCount = 0;
    let min,
      max = undefined;
    const results: Record<number, StatsResult> = {};
    const reversedData = chartData.slice().reverse();

    for (const datum of reversedData) {
      for (const property in datum) {
        // Filter out explicit properties
        if (property === "name" || property === "units") {
          continue;
        }

        const value = Number(datum[property]);
        if (isNaN(value)) {
          continue;
        }
        if (min === undefined || value < min) {
          min = value;
        }
        if (max === undefined || value > max) {
          max = value;
        }

        sumTotal += Number(value);
        readingCount++;
      }
      chartDataCount++;
      if (intervals.includes(chartDataCount)) {
        results[chartDataCount] = {
          chartData: reversedData.slice(0, chartDataCount).reverse(),
          average: (sumTotal / readingCount).toFixed(2),
          min: min?.toFixed(2) || "N/A",
          max: max?.toFixed(2) || "N/A",
        };
      }
    }
    results[-1] = {
      chartData: reversedData.slice(0, chartDataCount).reverse(),
      average: (sumTotal / readingCount).toFixed(2),
      min: min?.toFixed(2) || "N/A",
      max: max?.toFixed(2) || "N/A",
    };

    return results;
  }

  static getAllStatisticsFromChartData(chartData: ChartData[]): {
    average: string;
    min: string;
    max: string;
  } {
    let total = 0;
    let count = 0;
    let min,
      max = undefined;
    for (const datum of chartData) {
      for (const property in datum) {
        // Filter out explicit properties
        if (property === "name" || property === "units") {
          continue;
        }

        const value = Number(datum[property]);
        if (isNaN(value)) {
          continue;
        }
        if (min === undefined || value < min) {
          min = value;
        }
        if (max === undefined || value > max) {
          max = value;
        }

        total += Number(value);
        count++;
      }
    }
    return {
      average: (total / count).toFixed(2),
      min: min?.toFixed(2) || "N/A",
      max: max?.toFixed(2) || "N/A",
    };
  }

  static filterChartData(chartData: ChartData[], filters: string[]): ChartData[] {
    const filteredChartData: ChartData[] = [];
    for (const datum of chartData) {
      const cleanObject: ChartData = {} as ChartData;
      for (const property in datum) {
        if (filters.includes(property)) {
          continue;
        }
        cleanObject[property] = datum[property]!;
      }
      filteredChartData.push(cleanObject);
    }
    return filteredChartData;
  }
}

export { ChartDataRecord, Utils };
export type { ChartData, ChartDataSubsection, LookbackData };
