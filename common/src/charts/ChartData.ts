import { ReadingType } from "../sensors/ReadingType";

interface DataPoint {
  name: string;
  units?: string;
  [key: string]: number | string;
}

type DataSeries = DataPoint[];

interface StatsResult {
  average: string;
  min: string;
  max: string;
  dataSeries: DataSeries;
}

interface LookbackData extends StatsResult {
  label: string;
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
  chartData: Record<ReadingType, DataSeries>;
  units: Record<ReadingType, string>;
  chartSubData: Record<ReadingType, ChartDataSubsection>;
  maxEntries: number;

  constructor(
    chartData: Record<ReadingType, DataSeries>,
    filters: Record<ReadingType, string[]>,
    maxEntries: number,
  ) {
    this.maxEntries = maxEntries;
    this.chartData = {} as Record<ReadingType, DataSeries>;
    this.units = {} as Record<ReadingType, string>;
    this.chartSubData = {} as Record<ReadingType, ChartDataSubsection>;
    for (const readingType in chartData) {
      this.chartData[readingType as ReadingType] = [];
      this.chartSubData[readingType as ReadingType] = {
        filters: filters[readingType as ReadingType] || [],
        lookbacks: {
          all: { label: "All", dataSeries: [], average: "N/A", min: "N/A", max: "N/A" },
          sixHours: { label: "6 Hours", dataSeries: [], average: "N/A", min: "N/A", max: "N/A" },
          twelveHours: {
            label: "12 Hours",
            dataSeries: [],
            average: "N/A",
            min: "N/A",
            max: "N/A",
          },
          twentyFourHours: {
            label: "24 Hours",
            dataSeries: [],
            average: "N/A",
            min: "N/A",
            max: "N/A",
          },
          seventyTwoHours: {
            label: "72 Hours",
            dataSeries: [],
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

  loadChartData(chartData: Record<ReadingType, DataSeries>): void {
    this.chartData = chartData;
    for (const readingType in this.chartData) {
      while (this.chartData[readingType as ReadingType].length > this.maxEntries) {
        this.chartData[readingType as ReadingType].shift();
      }
    }

    this.updateAllChartDataSubsections();
  }

  addChartData(chartData: Record<ReadingType, DataSeries>): void {
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
    chartData: DataSeries,
    filters: string[],
  ): ChartDataSubsection {
    const LookbackIntervals = [72, 144, 288, 864];
    const filteredChartData = Utils.filterChartData(chartData, filters || []);
    const statsData = Utils.getStatisticsAndDataFromAllChartData(
      filteredChartData,
      LookbackIntervals,
    );
    const allData = statsData[-1] ?? { average: "N/A", min: "N/A", max: "N/A", dataSeries: [] };
    const sixHourData = statsData[72] ?? allData;
    const twelveHourData = statsData[144] ?? allData;
    const twentyFourHourData = statsData[288] ?? allData;
    const seventyTwoHourData = statsData[864] ?? allData;

    return {
      filters,
      lookbacks: {
        all: {
          label: "All",
          dataSeries: allData.dataSeries,
          average: allData.average,
          min: allData.min,
          max: allData.max,
        },
        sixHours: {
          label: "6 Hours",
          dataSeries: sixHourData.dataSeries,
          average: sixHourData.average,
          min: sixHourData.min,
          max: sixHourData.max,
        },
        twelveHours: {
          label: "12 Hours",
          dataSeries: twelveHourData.dataSeries,
          average: twelveHourData.average,
          min: twelveHourData.min,
          max: twelveHourData.max,
        },
        twentyFourHours: {
          label: "24 Hours",
          dataSeries: twentyFourHourData.dataSeries,
          average: twentyFourHourData.average,
          min: twentyFourHourData.min,
          max: twentyFourHourData.max,
        },
        seventyTwoHours: {
          label: "72 Hours",
          dataSeries: seventyTwoHourData.dataSeries,
          average: seventyTwoHourData.average,
          min: seventyTwoHourData.min,
          max: seventyTwoHourData.max,
        },
      },
    };
  }

  static getStatisticsFromChartData(chartData: DataSeries): {
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
    chartData: DataSeries,
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
          dataSeries: reversedData.slice(0, chartDataCount).reverse(),
          average: (sumTotal / readingCount).toFixed(2),
          min: min?.toFixed(2) || "N/A",
          max: max?.toFixed(2) || "N/A",
        };
      }
    }
    results[-1] = {
      dataSeries: reversedData.slice(0, chartDataCount).reverse(),
      average: (sumTotal / readingCount).toFixed(2),
      min: min?.toFixed(2) || "N/A",
      max: max?.toFixed(2) || "N/A",
    };

    return results;
  }

  static getAllStatisticsFromChartData(chartData: DataSeries): {
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

  static filterChartData(chartData: DataSeries, filters: string[]): DataSeries {
    const filteredChartData: DataSeries = [];
    for (const datum of chartData) {
      const cleanObject: DataPoint = {} as DataPoint;
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
export type { DataPoint, DataSeries, ChartDataSubsection, LookbackData };
