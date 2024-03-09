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
        //Because timezones suck butts, use regex to verify it's the proper shape.
        const regex = /(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2}) (am|pm)/;

        assert.isTrue(regex.test(ChartData.formatDateForChart(dateString)));
        assert.isTrue(regex.test(ChartData.formatDateForChart(date)));

        dateString = "2021-01-01T12:00:00Z";
        date = new Date(dateString);
        assert.isTrue(regex.test(ChartData.formatDateForChart(dateString)));
        assert.isTrue(regex.test(ChartData.formatDateForChart(date)));
      });
    });

    describe("formatDecimalReadingForDisplay", function () {
      it("should format a decimal reading for display", function () {
        assert.equal(ChartData.formatDecimalReadingForDisplay("1.234567"), "1.235");
        assert.equal(ChartData.formatDecimalReadingForDisplay("1.2"), "1.200");
        assert.equal(ChartData.formatDecimalReadingForDisplay("1"), "1.000");
      });
    });

    describe("generateEmptyDataSeries", function() {
      it("should generate an empty DataSeries", function() {
        assert.isEmpty(ChartData.cachedEmptyDataSeries)
        let dataSeries = ChartData.generateEmptyDataSeries(10, new Date("2021-01-01T00:00:00Z"));
        const id = ChartData.cachedEmptyDataSeriesID;
        assert.equal(ChartData.cachedEmptyDataSeries.length, 10)
        assert.equal(dataSeries.length, 10);

        dataSeries = ChartData.generateEmptyDataSeries(10, new Date("2021-02-01T00:00:00Z"));
        assert.equal(ChartData.cachedEmptyDataSeries.length, 10)
        assert.equal(dataSeries.length, 10);
        assert.notEqual(ChartData.cachedEmptyDataSeriesID, id);
      });
    })

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

    describe("combineDataSeries", function () {
      it("should return a new DataSeries object with the combined data", function () {
        const series1 = [
          {
            name: "test1",
            data1: 1.234567,
          } as DataPoint,
          {
            name: "test2",
            data1: 2.345678,
          } as DataPoint,
        ];
        const series2 = [
          {
            name: "test1",
            data2: 1.234567,
          } as DataPoint,
          {
            name: "test2",
            data2: 2.345678,
          } as DataPoint,
        ];
        const combinedDataSeries = ChartData.combineDataSeries([series1, series2]);
        assert.equal(combinedDataSeries.length, 2);
        assert.equal(combinedDataSeries[0]?.name, "test1");
        assert.equal(combinedDataSeries[0]?.["data1"], 1.234567);
        assert.equal(combinedDataSeries[0]?.["data2"], 1.234567);
        assert.equal(combinedDataSeries[1]?.name, "test2");
        assert.equal(combinedDataSeries[1]?.["data1"], 2.345678);
        assert.equal(combinedDataSeries[1]?.["data2"], 2.345678);
        assert.isFalse(series1[0] === combinedDataSeries[0]);
      });
    });
  });
});
