import { SensorList } from "../../../sensors/list/SensorList";
import { SensorBase } from "../../../sensors/base/SensorBase";
import { SensorCondition } from "../SensorCondition";
import { ReadingType } from "@sproot/common/sensors/ReadingType";

import { assert } from "chai";
import sinon from "sinon";
import type { ISensorConditionsRepository } from "../../../database/repositories/automations/conditions/ISensorConditionsRepository";

describe("SensorCondition.ts tests", () => {
  describe("evaluate", () => {
    it("should return true or false, depending on the condition and comparator", () => {
      const sensorCondition = new SensorCondition(
        1,
        "allOf",
        1,
        ReadingType.temperature,
        "equal",
        50,
        null,
      );
      const sensorListMock = sinon.createStubInstance(SensorList);
      const sensorMock = sinon.createStubInstance(SensorBase);
      sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock });

      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "notEqual";
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "greaterOrEqual";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "greater";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "lessOrEqual";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "49",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "less";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "49",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));
    });

    it("tracks the most recent violation for lookback evaluation", async () => {
      const sensorCondition = new SensorCondition(
        1,
        "allOf",
        1,
        ReadingType.temperature,
        "greater",
        50,
        3,
      );
      const sensorListMock = sinon.createStubInstance(SensorList);
      const sensorMock = sinon.createStubInstance(SensorBase);
      const now = new Date();
      sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock });
      const repository = {
        getMostRecentViolationAsync: sinon.stub().resolves(new Date(now.getTime() - 60_000)),
      } as Partial<ISensorConditionsRepository> as ISensorConditionsRepository;

      await sensorCondition.initializeLookbackStateAsync(repository, now);

      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock, now));

      const expiredNow = new Date(now.getTime() + 4 * 60000);
      assert.isTrue(sensorCondition.evaluate(sensorListMock, expiredNow));

      sensorMock.lastReading = {
        temperature: "49",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock, expiredNow));
    });
  });
});
