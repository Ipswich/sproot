import { DataPoint, DataSeries } from "@sproot/utility/ChartData";
import { assert } from "chai";
import { OutputListChartData } from "../OutputListChartData";

describe("OutputListChartData", function () {
  describe("constructor", function () {
    it("should create a new OutputListChartData", function () {
      const chartData = new OutputListChartData(3, 5);
      assert.exists(chartData);
      assert.equal(chartData.chartData.limit, 3);
    });
  });

  describe("get", function () {
    it("should return chart data", function () {
      const chartData = new OutputListChartData(3, 5);
      assert.exists(chartData.get());
    });
  });

  describe("loadChartData", function () {
    it("should load chart data", async function () {
      const chartData = new OutputListChartData(3, 5);
      const data = [
        [
          { name: "1/1 12:00 pm" } as DataPoint,
          { name: "1/1 12:05 pm" } as DataPoint,
        ] as DataSeries,
      ] as DataSeries[];
      chartData.loadChartData(data, "test");
      assert.exists(chartData.chartData);
      assert.equal(Object.values(chartData.chartData.get()).length, 2);
    });
  });

  describe("updateChartData", function () {
    it("should update chart data", async function () {
      const chartData = new OutputListChartData(3, 5);
      const data = [
        [{ name: "1/1 12:00 pm", value1: "TEST!" } as DataPoint] as DataSeries,
      ] as DataSeries[];
      chartData.loadChartData(data, "test");
      const newData = [
        [
          { name: "1/1 12:05 pm", value2: "TEST!" } as DataPoint,
          { name: "1/1 12:10 pm", value2: "TEST!" } as DataPoint,
        ] as DataSeries,
        [
          { name: "1/1 12:05 pm", value3: "TEST!" } as DataPoint,
          { name: "1/1 12:10 pm", value3: "TEST!" } as DataPoint,
        ] as DataSeries,
      ] as DataSeries[];
      chartData.updateChartData(newData, "ignored");

      //Empty data should be ignored
      chartData.updateChartData([], "ignored");

      assert.exists(chartData.chartData);
      assert.equal(Object.keys(chartData.chartData.get()).length, 2);
      assert.equal(Object.keys(chartData.chartData.get()[1]!).length, 3);
    });
  });
});
