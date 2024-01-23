import { ReadingType } from "../sensors/SensorBase";

interface ChartData {
  name: string;
  units: string;
  [key: string]: number | string;
}

interface LookbackData {
  label: string;
  chartData: ChartData[];
  average: string;
  max: string;
  min: string;
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
          sixHours: { label: "Six Hours", chartData: [], average: "N/A", min: "N/A", max: "N/A" },
          twelveHours: {
            label: "Twelve Hours",
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
          this.chartData[readingType as ReadingType][0]!.units;
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
    const allLookback = Utils.filterChartData(chartData, filters || []);
    const allStats = Utils.getStatisticsFromChartData(allLookback);

    const sixHourLookback = allLookback.slice(-72);
    const sixHourStats = Utils.getStatisticsFromChartData(sixHourLookback);

    const twelveHourLookback = allLookback.slice(-144);
    const twelveHourStats = Utils.getStatisticsFromChartData(twelveHourLookback);

    const twentyFourHourLookback = allLookback.slice(-288);
    const twentyFourHourStats = Utils.getStatisticsFromChartData(twentyFourHourLookback);

    const seventyTwoHourLookback = allLookback.slice(-864);
    const seventyTwoHourStats = Utils.getStatisticsFromChartData(seventyTwoHourLookback);

    return {
      filters,
      lookbacks: {
        all: {
          label: "All",
          chartData: allLookback,
          average: allStats.average,
          min: allStats.min,
          max: allStats.max,
        },
        sixHours: {
          label: "Six Hours",
          chartData: sixHourLookback,
          average: sixHourStats.average,
          min: sixHourStats.min,
          max: sixHourStats.max,
        },
        twelveHours: {
          label: "Twelve Hours",
          chartData: twelveHourLookback,
          average: twelveHourStats.average,
          min: twelveHourStats.min,
          max: twelveHourStats.max,
        },
        twentyFourHours: {
          label: "24 Hours",
          chartData: twentyFourHourLookback,
          average: twentyFourHourStats.average,
          min: twentyFourHourStats.min,
          max: twentyFourHourStats.max,
        },
        seventyTwoHours: {
          label: "72 Hours",
          chartData: seventyTwoHourLookback,
          average: seventyTwoHourStats.average,
          min: seventyTwoHourStats.min,
          max: seventyTwoHourStats.max,
        },
      },
    };
  }

  static getStatisticsFromChartData(chartData: ChartData[]): {
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
