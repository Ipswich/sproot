import { ChartData, DataPoint, DataSeries } from "@sproot/sproot-common/src/utility/IChartable";

import { assert } from "chai";
import * as sinon from "sinon";
const sandbox = sinon.createSandbox();

describe("IChartable.ts tests", function () {
  afterEach(() => {
    sandbox.restore();
  });

  describe("ChartData class", function () {
    describe("formatDateForChart", function () {
      it("should format a date for the chart", function () {
        let dateString = "2021-01-01T00:00:00Z";
        let date = new Date(dateString);
        assert.equal(ChartData.formatDateForChart(dateString), "12/31 4:00 pm");
        assert.equal(ChartData.formatDateForChart(date), "12/31 4:00 pm");

        dateString = "2021-01-01T12:00:00Z";
        date = new Date(dateString);
        assert.equal(ChartData.formatDateForChart(dateString), "1/1 4:00 am");
        assert.equal(ChartData.formatDateForChart(date), "1/1 4:00 am");
      });
    });

    describe("formatDecimalReadingForDisplay", function () {
      it("should format a decimal reading for display", function () {
        assert.equal(ChartData.formatDecimalReadingForDisplay("1.234567"), "1.235");
        assert.equal(ChartData.formatDecimalReadingForDisplay("1.2"), "1.200");
        assert.equal(ChartData.formatDecimalReadingForDisplay("1"), "1.000");
      });
    });

    describe("constructor", function () {
      it("should create a new ChartData object", function () {
        const chartData = new ChartData(10, undefined, new Date("2021-01-01T00:00:00Z"));
        assert.equal(chartData.limit, 10);
        assert.equal(chartData.dataSeries.length, 10);
        assert.equal(
          chartData.dataSeries[9]?.name,
          ChartData.formatDateForChart(new Date("2021-01-01T00:00:00Z")),
        );
        assert.equal(
          chartData.dataSeries[8]?.name,
          ChartData.formatDateForChart(new Date("2021-12-31T23:55:00Z")),
        );
      });

      it("should create a new ChartData object with a DataSeries", function () {
        const dataSeries = [
          {
            name: "test",
            data: 1.234567,
          } as DataPoint,
        ];
        const chartData = new ChartData(10, dataSeries as DataSeries);
        assert.equal(chartData.limit, 10);
        assert.equal(chartData.dataSeries.length, 1);
        assert.equal(chartData.dataSeries[0]?.name, "test");
      });
    });

    describe("addDataPoint", function () {
      it("should add a new DataPoint to the ChartData and remove the oldest DataPoint", function () {
        const chartData = new ChartData(2, []);
        assert.equal(chartData.dataSeries.length, 0);

        chartData.addDataPoint({ name: "test1" });
        chartData.addDataPoint({ name: "test2" });
        chartData.addDataPoint({ name: "test3" });
        assert.equal(chartData.dataSeries.length, 2);
        assert.equal(chartData.dataSeries[0]?.name, "test2");
        assert.equal(chartData.dataSeries[1]?.name, "test3");
      });
    });
  });
});
