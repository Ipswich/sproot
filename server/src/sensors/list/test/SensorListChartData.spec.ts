import { assert } from "chai";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { ChartData, DataSeries } from "@sproot/sproot-common/src/utility/ChartData";
import { SensorListChartData } from "../SensorListChartData";

describe("SensorListChartData.ts tests", function () {
  describe("constructor", function () {
    it("should create a new SensorListChartData object with default values", function () {
      const sensorChartData = new SensorListChartData(2, 5);

      assert.equal(Object.keys(sensorChartData.getAll()).length, 0);
    });

    it("should create a new SensorListChartData object with custom values", function () {
      const dataSeries = {} as Record<ReadingType, DataSeries>;
      dataSeries.temperature = [
        { name: "6:40 pm", value: 100 },
        { name: "6:45 pm", value: 30 },
      ];
      dataSeries.humidity = [
        { name: "6:40 pm", value: 37 },
        { name: "6:45 pm", value: 20 },
      ];
      const sensorChartData = new SensorListChartData(2, 5, dataSeries);

      assert.equal(sensorChartData.getOne(ReadingType.temperature).length, 2);
      assert.equal(sensorChartData.getOne(ReadingType.temperature)[0]?.name, "6:40 pm");
      assert.equal(sensorChartData.getOne(ReadingType.temperature)[0]!["value"], 100);
      assert.equal(sensorChartData.getOne(ReadingType.temperature)[1]?.name, "6:45 pm");
      assert.equal(sensorChartData.getOne(ReadingType.temperature)[1]!["value"], 30);

      assert.equal(sensorChartData.getOne(ReadingType.humidity).length, 2);
      assert.equal(sensorChartData.getOne(ReadingType.humidity)[0]?.name, "6:40 pm");
      assert.equal(sensorChartData.getOne(ReadingType.humidity)[0]!["value"], 37);
      assert.equal(sensorChartData.getOne(ReadingType.humidity)[1]?.name, "6:45 pm");
      assert.equal(sensorChartData.getOne(ReadingType.humidity)[1]!["value"], 20);
    });
  });
  describe("loadChartData", function () {
    it("should load chart data from the given cache into existing chart data", function () {
      const temperatureDataSeriesRecord = {} as Record<ReadingType, DataSeries>;
      const humidityDataSeriesRecord1 = {} as Record<ReadingType, DataSeries>;
      const humidityDataSeriesRecord2 = {} as Record<ReadingType, DataSeries>;
      const humidityDataSeriesRecord3 = {} as Record<ReadingType, DataSeries>;
      temperatureDataSeriesRecord.temperature = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")), base: 100 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")), base: 30 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")), base: 3 },
      ];
      humidityDataSeriesRecord1.humidity = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")), one: 99 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")), one: 29 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")), one: 2 },
      ];
      humidityDataSeriesRecord2.humidity = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")), two: 98 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")), two: 29 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")), two: 1 },
      ];
      humidityDataSeriesRecord3.humidity = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")), three: 97 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")), three: 29 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")), three: 0 },
      ];

      const sensorListChartData = new SensorListChartData(4, 5, humidityDataSeriesRecord1);

      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[0]?.["one"], 99);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[0]?.["two"], undefined);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[0]?.["three"], undefined);

      //Should be merged and interwoven with the existing set of data
      sensorListChartData.loadChartData(
        [humidityDataSeriesRecord2.humidity, humidityDataSeriesRecord3.humidity],
        "Test",
        ReadingType.humidity,
      );

      assert.equal(Object.keys(sensorListChartData.getAll()).length, 1);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity).length, 3);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[0]?.["one"], 99);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[0]?.["two"], 98);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[0]?.["three"], 97);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[2]?.["one"], 2);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[2]?.["two"], 1);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[2]?.["three"], 0);

      // Should create a new ChartData with the provided set because it doesn't exist.
      sensorListChartData.loadChartData(
        [temperatureDataSeriesRecord.temperature],
        "Test",
        ReadingType.temperature,
      );
      assert.equal(Object.keys(sensorListChartData.getAll()).length, 2);
      assert.equal(sensorListChartData.getOne(ReadingType.temperature).length, 3);
      assert.equal(sensorListChartData.getOne(ReadingType.temperature)[0]?.["base"], 100);
      assert.equal(sensorListChartData.getOne(ReadingType.temperature)[1]?.["base"], 30);
      assert.equal(sensorListChartData.getOne(ReadingType.temperature)[2]?.["base"], 3);
    });
  });

  describe("updateChartData", function () {
    it("should update the chart data with the last entry in the passed dataseries, adding a key with the combined chart if necessary", function () {
      const sensorListChartData = new SensorListChartData(4, 5);

      assert.equal(Object.keys(sensorListChartData.getAll()).length, 0);
      const dataSeriesRecordBase = {} as Record<ReadingType, DataSeries>;
      dataSeriesRecordBase.temperature = [
        {
          name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")),
          base: 100,
          one: 98,
        },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")), base: 30 },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")), base: 3 },
      ];
      dataSeriesRecordBase.humidity = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")), one: 99 },
      ];

      sensorListChartData.updateChartData(
        [dataSeriesRecordBase.humidity],
        "Test",
        ReadingType.humidity,
      );

      dataSeriesRecordBase.humidity.push({
        name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")),
        one: 29,
      });
      sensorListChartData.updateChartData(
        [dataSeriesRecordBase.humidity],
        "Test",
        ReadingType.humidity,
      );

      dataSeriesRecordBase.humidity.push({
        name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")),
        one: 2,
      });
      sensorListChartData.updateChartData(
        [dataSeriesRecordBase.humidity],
        "Test",
        ReadingType.humidity,
      );

      assert.equal(Object.keys(sensorListChartData.getAll()).length, 1);

      sensorListChartData.updateChartData(
        [dataSeriesRecordBase.temperature],
        "Test",
        ReadingType.temperature,
      );

      assert.equal(Object.keys(sensorListChartData.getAll()).length, 2);

      assert.equal(sensorListChartData.getOne(ReadingType.temperature).length, 3);
      assert.equal(sensorListChartData.getOne(ReadingType.temperature)[0]!["base"], 100);
      assert.equal(sensorListChartData.getOne(ReadingType.temperature)[2]!["base"], 3);
      assert.equal(sensorListChartData.getOne(ReadingType.temperature)[0]!["one"], 98);

      assert.equal(sensorListChartData.getOne(ReadingType.humidity).length, 3);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[0]!["one"], 99);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[1]!["one"], 29);
      assert.equal(sensorListChartData.getOne(ReadingType.humidity)[2]!["one"], 2);
    });
  });
});
