declare module "bme280" {
  interface OpenOptions {
    i2cBusNumber?: number;
    i2cAddress?: number;
    humidityOversampling?: number;
    pressureOversampling?: number;
    temperatureOversampling?: number;
    filterCoefficient?: number;
    forcedMode?: boolean;
    standby?: number;
  }

  type data = {
    temperature?: number;
    humidity?: number;
    pressure?: number;
  };

  interface Bme280 {
    read(): Promise<data>;
    close(): Promise<void>;
    triggerForcedMeasurement(): Promise<void>;
    typicalMeasurementTime(): number;
    maximumMeasurementTime(): number;
  }

  namespace bme280 {
    export const OVERSAMPLE: {
      X1: number;
      X2: number;
      X4: number;
      X8: number;
      X16: number;
    };
    export const FILTER: {
      F1: number;
      F2: number;
      F4: number;
      F8: number;
      F16: number;
    };
    export const STANDBY: {
      MS_0_5: number;
      MS_62_5: number;
      MS_125: number;
      MS_250: number;
      MS_500: number;
      MS_1000: number;
      MS_2000: number;
      MS_4000: number;
      MS_6000: number;
      MS_7000: number;
      MS_8000: number;
    };
    export function open(options?: OpenOptions): Promise<Bme280>;
    export { Bme280 as Bme280 };
    export { data };
  }

  export = bme280;
  export { Bme280 };
}
