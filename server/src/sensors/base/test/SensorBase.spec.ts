// import { MockSprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
// import winston from "winston";

// import { assert } from "chai";
// import * as sinon from "sinon";
// import { ChartData } from "@sproot/sproot-common/src/utility/IChartable";
// const sandbox = sinon.createSandbox();

// describe("SensorBase.ts tests", function () {
//   const mockSprootDB = new MockSprootDB();
//   let logger: winston.Logger;

//   beforeEach(() => {
//     sandbox.stub(winston, "createLogger").callsFake(
//       () =>
//         ({
//           info: () => {},
//           error: () => {},
//           startTimer: () => ({ done: () => {} }) as winston.Profiler,
//         }) as unknown as winston.Logger,
//     );
//     logger = winston.createLogger();
//   });

//   afterEach(() => {
//     sandbox.restore();
//   });

//   describe("SensorBase class", function () {});
// });
