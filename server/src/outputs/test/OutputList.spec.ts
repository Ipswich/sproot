import "dotenv/config";
import { OutputList, OutputListChartData } from "@sproot/sproot-server/src/outputs/OutputList";
import { SDBOutput } from "@sproot/sproot-common/src/database/SDBOutput";
import { MockSprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import Pca9685Driver from "pca9685";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
import { DataPoint, DataSeries } from "@sproot/utility/IChartable";
const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();

describe("OutputList.ts tests", function () {
  afterEach(() => {
    sandbox.restore();
  });

  describe("OutputList", function () {
    describe("initializeOrRegnerateAsync", function () {
      it("should create, update, and delete outputs.", async function () {
        sandbox.createStubInstance(Pca9685Driver);

        const getOutputsAsyncStub = sandbox
          .stub(MockSprootDB.prototype, "getOutputsAsync")
          .resolves([
            {
              id: 1,
              model: "pca9685",
              address: "0x40",
              name: "test output 1",
              pin: 0,
              isPwm: true,
              isInvertedPwm: false,
              color: "blue",
            } as SDBOutput,
            {
              id: 2,
              model: "pca9685",
              address: "0x40",
              name: "test output 2",
              pin: 1,
              isPwm: false,
              isInvertedPwm: false,
            } as SDBOutput,
            {
              id: 3,
              model: "pca9685",
              address: "0x40",
              name: "test output 3",
              pin: 2,
              isPwm: true,
              isInvertedPwm: true,
            } as SDBOutput,
            {
              id: 4,
              model: "pca9685",
              address: "0x40",
              name: "test output 4",
              pin: 3,
              isPwm: false,
              isInvertedPwm: true,
            } as SDBOutput,
          ]);
        sandbox.stub(winston, "createLogger").callsFake(
          () =>
            ({
              info: () => {},
              error: () => {},
              startTimer: () => ({ done: () => {} }) as winston.Profiler,
            }) as unknown as winston.Logger,
        );
        const logger = winston.createLogger();

        const outputList = new OutputList(mockSprootDB, 5, 5, logger);
        // Create
        await outputList.initializeOrRegenerateAsync();
        assert.equal(Object.keys(outputList.outputs).length, 4);
        assert.equal("lime", outputList.outputs["2"]!.color);
        assert.equal("green", outputList.outputs["3"]!.color);

        // Update and delete
        getOutputsAsyncStub.resolves([
          {
            id: 1,
            model: "pca9685",
            address: "0x40",
            name: "1 tuptuo tset",
            pin: 0,
            isPwm: false,
            isInvertedPwm: true,
            color: "pink",
          } as SDBOutput,
        ]);
        await outputList.initializeOrRegenerateAsync();

        assert.equal(Object.keys(outputList.outputs).length, 1);
        assert.equal(outputList.outputs["1"]!.name, "1 tuptuo tset");
        assert.equal(outputList.outputs["1"]!.isPwm, false);
        assert.equal(outputList.outputs["1"]!.isInvertedPwm, true);
        assert.equal(outputList.outputs["1"]!.color, "pink");
      });
    });

    describe("outputData", function () {
      it("should return output data (no functions)", async function () {
        sandbox.createStubInstance(Pca9685Driver);

        sandbox.stub(MockSprootDB.prototype, "getOutputsAsync").resolves([
          {
            id: 1,
            model: "pca9685",
            address: "0x40",
            name: "test output 1",
            pin: 0,
            isPwm: true,
            isInvertedPwm: false,
          } as SDBOutput,
        ]);
        sandbox.stub(winston, "createLogger").callsFake(
          () =>
            ({
              info: () => {},
              error: () => {},
              startTimer: () => ({ done: () => {} }) as winston.Profiler,
            }) as unknown as winston.Logger,
        );
        const logger = winston.createLogger();

        const outputList = new OutputList(mockSprootDB, 5, 5, logger);
        await outputList.initializeOrRegenerateAsync();
        const outputData = outputList.outputData;

        assert.equal(outputData["1"]!["name"], "test output 1");
        assert.equal(outputData["1"]!["pin"], 0);
        assert.equal(outputData["1"]!["isPwm"], true);
        assert.equal(outputData["1"]!["isInvertedPwm"], false);
        assert.exists(outputList.outputs["1"]!["sprootDB"]);
      });
    });

    describe("dispose", function () {
      it("should dispose of all outputs", async function () {
        sandbox.createStubInstance(Pca9685Driver);

        sandbox.stub(Pca9685Driver.prototype, "dispose").callsFake(() => {});
        sandbox.stub(MockSprootDB.prototype, "getOutputsAsync").resolves([
          {
            id: 1,
            model: "pca9685",
            address: "0x40",
            name: "test output 1",
            pin: 0,
            isPwm: true,
            isInvertedPwm: false,
            color: "pink",
          } as SDBOutput,
          {
            id: 2,
            model: "pca9685",
            address: "0x40",
            name: "test output 2",
            pin: 1,
            isPwm: false,
            isInvertedPwm: false,
          } as SDBOutput,
          {
            id: 3,
            model: "pca9685",
            address: "0x40",
            name: "test output 3",
            pin: 2,
            isPwm: true,
            isInvertedPwm: true,
            color: "red",
          } as SDBOutput,
          {
            id: 4,
            model: "pca9685",
            address: "0x40",
            name: "test output 4",
            pin: 3,
            isPwm: false,
            isInvertedPwm: true,
          } as SDBOutput,
        ]);
        sandbox.stub(winston, "createLogger").callsFake(
          () =>
            ({
              info: () => {},
              error: () => {},
              startTimer: () => ({ done: () => {} }) as winston.Profiler,
            }) as unknown as winston.Logger,
        );
        const logger = winston.createLogger();
        const outputList = new OutputList(mockSprootDB, 5, 5, logger);

        // Create
        await outputList.initializeOrRegenerateAsync();
        outputList.dispose();
        assert.isEmpty(outputList.outputs);
      });
    });
  });

  describe("OutputListChart", function () {
    describe("constructor", function () {
      it("should create a new OutputListChart", function () {
        const chartData = new OutputListChartData(3, 5);
        assert.exists(chartData);
        assert.equal(chartData.chartData.limit, 3);
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
        assert.exists(chartData.chartData);
        assert.equal(Object.keys(chartData.chartData.get()).length, 2);
        assert.equal(Object.keys(chartData.chartData.get()[1]!).length, 3);
      });
    });
  });
});
