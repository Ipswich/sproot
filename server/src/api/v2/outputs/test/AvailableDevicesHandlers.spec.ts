// // import { Response } from "express";
// // import { getAvailableDevices } from "../handlers/AvailableDevicesHandlers";
// import { OutputList } from "../../../../outputs/list/OutputList";
// import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
// import { UdpServer, Device as SimulatedDevice } from "tplink-smarthome-simulator";
// // import { Plug } from "tplink-smarthome-api";

// // import { assert } from "chai";
// import sinon from "sinon";
// import winston from "winston";
// const mockSprootDB = new MockSprootDB();

// describe("AvailableDevicesHandlers.ts tests", function() {
//   sinon
//     .stub(winston, "createLogger")
//     .callsFake(() => ({ info: () => { }, error: () => { } }) as unknown as winston.Logger);
//   const logger = winston.createLogger();
//   const simulatedHS300 = new SimulatedDevice({
//     model: "hs300",
//     address: "127.0.0.2",
//     port: 9999,
//     responseDelay: 0,
//   });
//   simulatedHS300.start();
//   UdpServer.start();
//   this.afterAll(() => {
//     simulatedHS300.stop();
//     UdpServer.stop();
//   });
//   afterEach(() => {
//     sinon.restore();
//   });
//   // Helper function, some of these take a very small blip to pick up the mocked devices
//   function delay(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   it("should return a 200 and a list of available devices", async () => {
//     const outputList = new OutputList(mockSprootDB, 5, 5, 5, 5, logger);
//     await delay(20)
//     console.log(outputList.getAvailableDevices("tplink-smart-plug"))

//   });
// });
