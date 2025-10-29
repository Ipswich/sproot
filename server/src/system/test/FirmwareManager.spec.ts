// import * as assert from "assert";
// import sinon from "sinon";
import { FirmwareManager } from "../FirmwareManager";

describe("FirmwareManager.ts tests", function () {
  describe("listEspDevicesAsync", function () {
    it("should return a list of ESP devices", async function () {
      const devices = await FirmwareManager.ESP32.listEspDevicesAsync();
      console.log(devices);
      // assert.ok(Array.isArray(devices));
      // Further assertions can be made based on expected device properties
    });
  });
});
