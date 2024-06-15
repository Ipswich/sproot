import { ChartData, DataPoint, DataSeries } from "@sproot/sproot-common/src/utility/ChartData";

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

    describe("generateEmptyDataSeries", function () {
      it("should generate an empty DataSeries", function () {
        assert.isEmpty(ChartData.cachedEmptyDataSeries);

        let dataSeries = ChartData.generateEmptyDataSeries(10, 5, new Date("2021-01-01T00:00:00Z"));
        const id = ChartData.cachedEmptyDataSeriesID;
        assert.equal(ChartData.cachedEmptyDataSeries.length, 10);
        assert.equal(dataSeries.length, 10);
        for (const value of dataSeries) {
          const lastDigit = value.name.split(" ")[1]?.slice(-1)[0];
          assert.isTrue(lastDigit == "0" || lastDigit == "5");
        }

        dataSeries = ChartData.generateEmptyDataSeries(10, 5, new Date("2021-02-01T00:00:00Z"));
        assert.equal(ChartData.cachedEmptyDataSeries.length, 10);
        assert.equal(dataSeries.length, 10);
        assert.notEqual(ChartData.cachedEmptyDataSeriesID, id);
      });
    });

    describe("generateTimeSpansFromDataSeries", function () {
      it("should generate time spans from a DataSeries", function () {
        const dataSeries = ChartData.generateEmptyDataSeries(2016, 5);
        const timeSpans = ChartData.generateTimeSpansFromDataSeries(dataSeries, 5);
        assert.equal(Object.keys(timeSpans).length, 5);
        assert.equal(timeSpans[0]!.length, 2016);
        assert.equal(timeSpans[6]!.length, 72);
        assert.equal(timeSpans[12]!.length, 144);
        assert.equal(timeSpans[24]!.length, 288);
        assert.equal(timeSpans[72]!.length, 864);
      });
    });

    describe("generateStatsForTimeSpans", function () {
      it("should generate stats for time spans", function () {
        const dataSeries = ChartData.generateEmptyDataSeries(2016, 5);
        const timeSpans = ChartData.generateTimeSpansFromDataSeries(dataSeries, 5);
        const stats = ChartData.generateStatsForTimeSpans(timeSpans);
        assert.equal(Object.keys(stats).length, 5);
      });
    });

    describe("constructor", function () {
      it("should create a new ChartData object", function () {
        let chartData = new ChartData(10, 5, undefined, new Date("2021-01-01T00:00:00Z"));
        assert.equal(chartData.get().length, 10);
        assert.equal(
          chartData.get()[9]?.name,
          ChartData.formatDateForChart(new Date("2021-01-01T00:00:00Z")),
        );
        assert.equal(
          chartData.get()[8]?.name,
          ChartData.formatDateForChart(new Date("2021-12-31T23:55:00Z")),
        );

        // Different length, different interval
        chartData = new ChartData(13, 10, undefined, new Date("2021-01-01T00:00:00Z"));
        assert.equal(chartData.get().length, 13);
        assert.equal(
          chartData.get()[12]?.name,
          ChartData.formatDateForChart(new Date("2021-01-01T00:00:00Z")),
        );
        assert.equal(
          chartData.get()[11]?.name,
          ChartData.formatDateForChart(new Date("2021-12-31T23:50:00Z")),
        );
      });

      it("should copy (not reference) the cache to new ChartData objects", function () {
        const chartData1 = new ChartData(10, 5);
        const chartData2 = new ChartData(10, 5);
        assert.notEqual(chartData1.get(), chartData2.get());
      });

      it("should create a new ChartData object with a DataSeries", function () {
        const dataSeries = [
          {
            name: "test",
            data: 1.234567,
          } as DataPoint,
        ];
        const chartData = new ChartData(10, 5, dataSeries as DataSeries);
        assert.equal(chartData.limit, 10);
        assert.equal(chartData.get().length, 1);
        assert.equal(chartData.get()[0]?.name, "test");
      });
    });

    describe("addDataPoint", function () {
      it("should add a new DataPoint to the ChartData and remove the oldest DataPoint", function () {
        const chartData = new ChartData(2, 5, []);
        assert.equal(chartData.get().length, 0);

        chartData.addDataPoint({ name: "test1" });
        chartData.addDataPoint({ name: "test2" });
        chartData.addDataPoint({ name: "test3" });
        assert.equal(chartData.get().length, 2);
        assert.equal(chartData.get()[0]?.name, "test2");
        assert.equal(chartData.get()[1]?.name, "test3");
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

    describe("generateStatsForDataSeries", function () {
      it("should return a new DataSeriesStats object", function () {
        const series = [
          {
            name: "test1",
            data1: 1.0,
            data2: 2.0,
          } as DataPoint,
          {
            name: "test2",
            data1: 2.0,
            data2: 3.0,
          } as DataPoint,
        ];
        const stats = ChartData.generateStatsForDataSeries(series);

        assert.equal(stats.counts["data1"], 2);
        assert.equal(stats.totals["data1"], 3.0);
        assert.equal(stats.minimums["data1"], 1.0);
        assert.equal(stats.maximums["data1"], 2.0);
        assert.equal(stats.averages["data1"], 1.5);

        assert.equal(stats.counts["data2"], 2);
        assert.equal(stats.totals["data2"], 5.0);
        assert.equal(stats.minimums["data2"], 2.0);
        assert.equal(stats.maximums["data2"], 3.0);
        assert.equal(stats.averages["data2"], 2.5);

        assert.equal(stats.cumulativeMin, 1.0);
        assert.equal(stats.cumulativeMax, 3.0);
        assert.equal(stats.cumulativeAverage, 2.0);
      });
    });
  });
});
