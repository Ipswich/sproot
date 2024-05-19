import { SDBReading } from "@sproot/sproot-common/src/database/SDBReading";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ReadingType } from "../sensors/ReadingType";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { ChartData } from "@sproot/sproot-common/src/api/ChartData";
import { DataSeries } from "@sproot/sproot-common/src/utility/IChartable";

interface ApiResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  suggestion?: string;
}

interface ApiSupportedModelsResponse extends ApiResponse {
  supportedModels: string[];
}

interface ApiOutputsResponse extends ApiResponse {
  outputs: Record<string, IOutputBase>;
}

interface ApiSensorsResponse extends ApiResponse {
  sensors: Record<string, ISensorBase>;
}

interface ApiReadingsResponse extends ApiResponse {
  readings: Record<string, SDBReading[]>;
  moreReadingsAvailable?: boolean;
}

interface ApiChartDataResponse extends ApiResponse {
  chartData: Record<ReadingType, Array<ChartData>>;
  moreReadingsAvailable?: boolean;
}

interface ApiOutputsChartDataResponse extends ApiResponse {
  chartData: DataSeries;
}

export type {
  ApiResponse,
  ApiSupportedModelsResponse,
  ApiOutputsResponse,
  ApiSensorsResponse,
  ApiReadingsResponse,
  ApiChartDataResponse,
  ApiOutputsChartDataResponse,
};
