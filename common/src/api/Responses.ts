import { SDBReading } from "../database/SDBReading";
import { ISensorBase } from "../sensors/SensorBase";
import { IOutputBase } from "../outputs/OutputBase";
import { ChartData } from "./ChartData";

interface ApiResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  suggestion?: string;
}

interface ApiOutputsResponse extends ApiResponse {
  outputs: Record<string, IOutputBase>;
}

interface ApiOutputResponse extends ApiResponse {
  output: IOutputBase;
}

interface ApiSensorsResponse extends ApiResponse {
  sensors: Record<string, ISensorBase>;
}

interface ApiSensorResponse extends ApiResponse {
  sensor: ISensorBase;
}

interface ApiReadingsResponse extends ApiResponse {
  readings: Record<string, SDBReading[]>;
  moreReadingsAvailable?: boolean;
}

interface ApiChartDataResponse extends ApiResponse {
  chartData: Record<string, Array<ChartData>>;
  moreReadingsAvailable?: boolean;
}

export type {
  ApiResponse,
  ApiOutputsResponse,
  ApiOutputResponse,
  ApiSensorsResponse,
  ApiSensorResponse,
  ApiReadingsResponse,
  ApiChartDataResponse,
};
