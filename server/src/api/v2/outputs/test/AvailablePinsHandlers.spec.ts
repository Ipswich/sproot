// import { Response } from "express";
// import { getAvailablePinsAsync } from "../handlers/AvailablePinsHandlers";
// import ModelList from "../../../../outputs/ModelList";

// import { assert } from "chai";
// import sinon from "sinon";
// import { OutputList } from "../../../../outputs/list/OutputList";

// describe("SupportedModelsHandler.ts tests", () => {
//   let outputList: sinon.SinonStubbedInstance<OutputList>;

//   beforeEach(() => {
//     outputList = sinon.createStubInstance(OutputList);
//     sinon.stub(outputList, "chartData").value({ get: () => chartData });
//   });

//   afterEach(() => {
//     sinon.restore();
//   });
//   it("should return a 200 and an array of supported models", async () => {
//     const mockResponse = {
//       locals: {
//         defaultProperties: {
//           statusCode: 200,
//           requestId: "1234",
//         },
//       },
//     } as unknown as Response;

//     const request = {
//       app: {
//         get: (_dependency: string) => outputList,
//       },
//       query: { latest: "true" },
//     } as unknown as Request;

//     const supportedModelsResponse = await getAvailablePinsAsync(mockResponse);

//     assert.deepEqual(supportedModelsResponse.content?.data, Object.values(ModelList));
//     assert.equal((supportedModelsResponse.content?.data as Array<string>).length, 2);
//   });
// });
