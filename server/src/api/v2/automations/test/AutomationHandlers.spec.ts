// import { Request, Response } from "express";
// import { OutputList } from "../../../../../outputs/list/OutputList";
// import { AutomationOperator, IAutomation } from "@sproot/automation/IAutomation";
// import { addAsync, deleteAsync, get, updateAsync } from "../handlers/AutomationHandlers";

// import { assert } from "chai";
// import sinon from "sinon";
// import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
// import { OutputAutomation } from "../../../../../automation/outputs/OutputAutomation";
// import { SprootDB } from "../../../../../database/SprootDB";

// describe("AutomationHandlers.ts", () => {
//   describe("get", () => {
//     const sprootDB = sinon.createStubInstance(SprootDB);
//     let outputList: sinon.SinonStubbedInstance<OutputList>;
//     const mockResponse = {
//       locals: {
//         defaultProperties: {
//           timestamp: new Date().toISOString(),
//           requestId: "1234",
//         },
//       },
//     } as unknown as Response;
//     const automations = {
//       1: new OutputAutomation(1, "test", 50, "or", sprootDB),
//       2: new OutputAutomation(2, "test1", 51, "and", sprootDB),
//     }

//     beforeEach(() => {
//       outputList = sinon.createStubInstance(OutputList);
//       outputList.getAutomations.returns({ 1: automations as unknown as Record<string, OutputAutomation> });
//       sinon.stub(outputList, "outputs").value({
//         "1": {
//           id: "1",
//           model: "PCA9685",
//           address: 0x40,
//           name: "test",
//           pin: 0,
//           isPwm: true,
//           isInvertedPwm: false,
//           color: "red",
//           state: 0,
//           getAutomations: function () {
//             return automations
//           },
//         }
//       });
//     });
//     afterEach(() => {
//       sinon.restore();
//     });

//     it("should return a 200 and one automation for an output", () => {
//       const mockRequest = {
//         app: { get: (_dependency: string) => outputList },
//         params: {
//           outputId: "1",
//           automationId: "1",
//         },
//       } as unknown as Request;
//       const success = get(mockRequest, mockResponse) as SuccessResponse;

//       assert.equal(success.statusCode, 200);
//       assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal((success.content?.data as Array<OutputAutomation>).length, 1);
//       assert.deepEqual(success.content?.data, [{...automations[1], conditions: automations[1].conditions.groupedConditions}]);
//     });

//     it("should return a 200 and all automations for an output", () => {
//       const mockRequest = {
//         app: { get: (_dependency: string) => outputList },
//         params: {
//           outputId: "1",
//         },
//       } as unknown as Request;
//       const success = get(mockRequest, mockResponse) as SuccessResponse;

//       assert.equal(success.statusCode, 200);
//       assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal((success.content?.data as Array<IAutomation>).length, 2);
//       assert.deepEqual(success.content?.data, Object.values(automations).map((a) => ({...a, conditions: a.conditions.groupedConditions})));
//     });

//     it("should return a 200 and all automations", () => {
//       const mockRequest = {
//         app: { get: (_dependency: string) => outputList },
//         params: {},
//       } as unknown as Request;
//       const success = get(mockRequest, mockResponse) as SuccessResponse;

//       assert.equal(success.statusCode, 200);
//       assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(Object.keys(success.content?.data).length, 1);
//       assert.deepEqual(success.content?.data, { "1": Object.values(automations).map((a) => ({...a, conditions: a.conditions.groupedConditions})) });
//     })

//     it("should return a 404 and a 'Not Found' error (no output)", () => {
//       const mockRequest = {
//         app: { get: (_dependency: string) => outputList },
//         originalUrl: "/api/v2/outputs/-1/automations",
//         params: {
//           outputId: "-1",
//           automationId: "1",
//         },
//       } as unknown as Request;
//       const error = get(mockRequest, mockResponse) as ErrorResponse;

//       assert.equal(error.statusCode, 404);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Not Found");
//       assert.equal(error.error.url, "/api/v2/outputs/-1/automations");
//       assert.equal(error.error["details"].at(0), "Output with ID -1 not found.");
//     });

//     it("should return a 404 and a 'Not Found' error (no automation)", () => {
//       const mockRequest = {
//         app: { get: (_dependency: string) => outputList },
//         originalUrl: "/api/v2/outputs/1/automations/-1",
//         params: {
//           outputId: "1",
//           automationId: "-1",
//         },
//       } as unknown as Request;
//       const error = get(mockRequest, mockResponse) as ErrorResponse;

//       assert.equal(error.statusCode, 404);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Not Found");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/-1");
//       assert.equal(error.error["details"].at(0), "Automation with ID -1 not found.");
//     });
//   });

//   describe("addAsync", () => {
//     let outputList: sinon.SinonStubbedInstance<OutputList>;

//     beforeEach(() => {
//       outputList = sinon.createStubInstance(OutputList);
//       sinon.stub(outputList, "outputs").value({
//         "1": {
//           id: "1",
//           model: "PCA9685",
//           address: 0x40,
//           name: "test",
//           pin: 0,
//           isPwm: false,
//           isInvertedPwm: false,
//           color: "red",
//           state: 0,
//           getAutomations: function () {
//             return {}
//           },
//           addAutomationAsync: function (name: string, value: number, operator: string) {
//             return Promise.resolve({
//               name, value, operator, conditions: {
//                 sensor: {
//                   allOf: [],
//                   anyOf: [],
//                   oneOf: [],
//                 },
//                 output: {
//                   allOf: [],
//                   anyOf: [],
//                   oneOf: [],
//                 },
//                 time: {
//                   allOf: [],
//                   anyOf: [],
//                   oneOf: [],
//                 }
//               }, id: 1
//             } as unknown as OutputAutomation);
//           }
//         }
//       });
//     });

//     afterEach(() => {
//       sinon.restore();
//     });

//     const mockResponse = {
//       locals: {
//         defaultProperties: {
//           timestamp: new Date().toISOString(),
//           requestId: "1234",
//         },
//       },
//     } as unknown as Response;

//     it("should return a 201 and add a new automation", async () => {
//       const newAutomation = {
//         name: "test",
//         value: 100,
//         operator: "or"
//       };

//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1"
//         },
//         body: newAutomation,
//       } as unknown as Request;

//       const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
//       assert.equal(success.statusCode, 201);
//       assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(success.content?.data?.name, newAutomation.name);
//       assert.equal(success.content?.data?.value, newAutomation.value);
//       assert.equal(success.content?.data?.operator, newAutomation.operator);
//       assert.equal(Object.values(success.content?.data?.conditions).length, 3);
//       assert.equal(Object.values(success.content?.data?.conditions.sensor).length, 3);
//     });

//     it("should return a 404 and a 'Not Found' error", async () => {
//       const newAutomation = {
//         name: "test",
//         value: 50,
//         operator: "or"
//       };

//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "-1"
//         },
//         originalUrl: "/api/v2/outputs/-1/automations",
//         body: newAutomation,
//       } as unknown as Request;

//       const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 404);
//       assert.equal(error.error.name, "Not Found");
//       assert.equal(error.error.url, "/api/v2/outputs/-1/automations");
//       assert.equal(error.error["details"].at(0), "Output with ID -1 not found.");
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//     });

//     it("should return a 400 and details for each missing required field", async () => {
//       const newAutomation = {} as IAutomation;

//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//         },
//         originalUrl: "/api/v2/outputs/1/automations",
//         body: newAutomation,
//       } as unknown as Request;
//       let error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;

//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations");
//       assert.deepEqual(error.error["details"], ["Invalid or missing output ID."]);


//       mockRequest.params = { outputId: "1" };
//       error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;

//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations");
//       assert.deepEqual(error.error["details"], [
//         "Missing required field: name",
//         "Missing required field: value",
//         "Missing required field: operator",
//       ]);

//       newAutomation.name = "test";
//       newAutomation.value = 50
//       error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;

//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations");
//       assert.deepEqual(error.error["details"], [
//         "Invalid value (output is not PWM): must be a number equal to 0 and 100",
//         "Missing required field: operator",
//       ]);

//       newAutomation.value = 101;
//       newAutomation.operator = "huh?" as AutomationOperator;
//       error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;

//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations");
//       assert.deepEqual(error.error["details"], [
//         "Invalid value: must be a number between 0 and 100",
//         "Invalid value for operator: must be 'and' or 'or'"
//       ]);
//     });

//     it("should return a 503 if the database is unreachable", async () => {
//       const newAutomation = {
//         name: "test",
//         value: 100,
//         operator: "or"
//       };

//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1"
//         },
//         originalUrl: "/api/v2/outputs/1/automations",
//         body: newAutomation,
//       } as unknown as Request;

//       outputList.outputs["1"]!.addAutomationAsync = function () {
//         return Promise.reject(new Error("Database Unreachable"));
//       }

//       const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 503);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Service Unreachable");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations");
//       assert.equal(error.error["details"].at(0), "Failed to add automation to database.");
//     });
//   });

//   describe("updateAsync", () => {
//     let outputList: sinon.SinonStubbedInstance<OutputList>;
//     const mockResponse = {
//       locals: {
//         defaultProperties: {
//           timestamp: new Date().toISOString(),
//           requestId: "1234",
//         },
//       },
//     } as unknown as Response;
//     const automations = {
//       1: {
//         id: 1,
//         name: "test",
//         value: 50,
//         operator: "or",
//         conditions: {
//           allOf: [],
//           anyOf: [],
//           oneOf: [],
//         }
//       } as IAutomation,
//       2: {
//         id: 2,
//         name: "test1",
//         value: 51,
//         operator: "and",
//         conditions: {
//           allOf: [],
//           anyOf: [],
//           oneOf: [],
//         }
//       } as IAutomation,
//     }

//     beforeEach(() => {
//       outputList = sinon.createStubInstance(OutputList);
//       outputList.getAutomations.returns({ 1: automations as unknown as Record<string, OutputAutomation> });
//       sinon.stub(outputList, "outputs").value({
//         "1": {
//           id: "1",
//           model: "PCA9685",
//           address: 0x40,
//           name: "test",
//           pin: 0,
//           isPwm: true,
//           isInvertedPwm: false,
//           color: "red",
//           state: 0,
//           getAutomations: function () {
//             return automations
//           },
//         }
//       });
//     });

//     afterEach(() => {
//       sinon.restore();
//     });

//     it("should return 200 and update an automation", async () => {
//       const outputList = sinon.createStubInstance(OutputList);
//       const automation = {
//         id: 1,
//         name: "test",
//         value: 50,
//         operator: "or",
//         conditions: {
//           allOf: [],
//           anyOf: [],
//           oneOf: [],
//         }
//       } as IAutomation;

//       sinon.stub(outputList, "outputs").value({
//         "1": {
//           id: "1",
//           model: "PCA9685",
//           address: 0x40,
//           name: "test",
//           pin: 0,
//           isPwm: false,
//           isInvertedPwm: false,
//           color: "red",
//           state: 0,
//           getAutomations: function () {
//             return { 1: automation as unknown as OutputAutomation }
//           },
//           updateAutomationAsync: function () {
//             return Promise.resolve()
//           }
//         }
//       });

//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//           automationId: "1",
//         },
//         body: {
//           name: "test",
//           value: 100,
//           operator: "or"
//         },
//       } as unknown as Request;

//       const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
//       assert.equal(success.statusCode, 200);
//       assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//     });

//     it("should return a 400 and details for the invalid request (invalid output ID)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           automationId: "1",
//         },
//         originalUrl: "/api/v2/outputs/1/automations/1",
//       } as unknown as Request;

//       const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.deepEqual(error.error["details"], ["Invalid or missing output ID."]);
//     });

//     it("should return a 400 and details for the invalid request (invalid automation ID)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//         },
//         originalUrl: "/api/v2/outputs/1/automations/1",
//       } as unknown as Request;

//       const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.deepEqual(error.error["details"], ["Invalid or missing automation ID."]);
//     });

//     it("should return a 400 and details for the invalid request", async () => {
//       sinon.stub(outputList, "outputs").value({
//         "1": {
//           id: "1",
//           model: "PCA9685",
//           address: 0x40,
//           name: "test",
//           pin: 0,
//           isPwm: false,
//           isInvertedPwm: false,
//           color: "red",
//           state: 0,
//           getAutomations: function () {
//             return { 1: { ...automations[1] } as unknown as OutputAutomation }
//           },
//           updateAutomationAsync: function () {
//             return Promise.resolve()
//           }
//         }
//       });
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//           automationId: "1",
//         },
//         body: {
//         },
//         originalUrl: "/api/v2/outputs/1/automations/1",
//       } as unknown as Request;

//       let error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.deepEqual(error.error["details"], [
//         "Invalid value (output is not PWM): must be a number equal to 0 and 100",
//       ]);

//       mockRequest.body.value = 101,

//         error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.deepEqual(error.error["details"], [
//         "Invalid value: must be a number between 0 and 100",
//       ]);

//       mockRequest.body.value = 50;
//       mockRequest.body.operator = "huh?" as AutomationOperator;

//       error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.deepEqual(error.error["details"], [
//         "Invalid value (output is not PWM): must be a number equal to 0 and 100",
//         "Invalid value for operator: must be 'and' or 'or'",
//       ]);
//     });

//     it("should return a 404 and a 'Not Found' error (no output)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "-1",
//           automationId: "1",
//         },
//         originalUrl: "/api/v2/outputs/-1/automations/1",
//       } as unknown as Request;

//       const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 404);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Not Found");
//       assert.equal(error.error.url, "/api/v2/outputs/-1/automations/1");
//       assert.equal(error.error["details"].at(0), "Output with ID -1 not found.");
//     });

//     it("should return a 404 and a 'Not Found' error (no automation)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//           automationId: "-1",
//         },
//         originalUrl: "/api/v2/outputs/1/automations/-1",
//       } as unknown as Request;

//       const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 404);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Not Found");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/-1");
//       assert.equal(error.error["details"].at(0), "Automation with ID -1 not found.");
//     });

//     it("should return a 503 if the database is unreachable", async () => {
//       const outputList = sinon.createStubInstance(OutputList);
//       const automation = {
//         id: 1,
//         name: "test",
//         value: 50,
//         operator: "or",
//       } as IAutomation;

//       sinon.stub(outputList, "outputs").value({
//         "1": {
//           id: "1",
//           model: "PCA9685",
//           address: 0x40,
//           name: "test",
//           pin: 0,
//           isPwm: false,
//           isInvertedPwm: false,
//           color: "red",
//           state: 0,
//           getAutomations: function () {
//             return { 1: automation as unknown as OutputAutomation }
//           },
//           updateAutomationAsync: function () {
//             return Promise.reject(new Error("Database Unreachable"));
//           }
//         }
//       });

//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         originalUrl: "/api/v2/outputs/1/automations/1",
//         params: {
//           outputId: "1",
//           automationId: "1",
//         },
//         body: {
//           name: "test",
//           value: 100,
//           operator: "or"
//         },
//       } as unknown as Request;

//       const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 503);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Service Unreachable");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.equal(error.error["details"].at(0), "Failed to update automation in database.");
//     });
//   });

//   describe("deleteAsync", () => {
//     let outputList: sinon.SinonStubbedInstance<OutputList>;
//     const automations = {
//       1: {
//         id: 1,
//         name: "test",
//         value: 50,
//         operator: "or",
//         conditions: {
//           allOf: [],
//           anyOf: [],
//           oneOf: [],
//         }
//       } as IAutomation,
//       2: {
//         id: 2,
//         name: "test1",
//         value: 51,
//         operator: "and",
//         conditions: {
//           allOf: [],
//           anyOf: [],
//           oneOf: [],
//         }
//       } as IAutomation,
//     }

//     beforeEach(() => {
//       outputList = sinon.createStubInstance(OutputList);
//       sinon.stub(outputList, "outputs").value({
//         "1": {
//           id: "1",
//           model: "PCA9685",
//           address: 0x40,
//           name: "test",
//           pin: 0,
//           isPwm: false,
//           isInvertedPwm: false,
//           color: "red",
//           state: 0,
//           getAutomations: function () {
//             return automations
//           },
//           deleteAutomationAsync: function () {
//             return Promise.resolve()
//           }
//         }
//       });
//     });

//     afterEach(() => {
//       sinon.restore();
//     });

//     const mockResponse = {
//       locals: {
//         defaultProperties: {
//           timestamp: new Date().toISOString(),
//           requestId: "1234",
//         },
//       },
//     } as unknown as Response;

//     it("should return a 200 and delete an automation", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//           automationId: "1",
//         },
//       } as unknown as Request;

//       const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
//       assert.equal(success.statusCode, 200);
//       assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//     });

//     it("should return a 400 and details for the invalid request (invalid output ID)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           automationId: "1",
//         },
//         originalUrl: "/api/v2/outputs/1/automations/1",
//       } as unknown as Request;

//       const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.deepEqual(error.error["details"], ["Invalid or missing output ID."]);
//     });

//     it("should return a 400 and details for the invalid request (invalid automation ID)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//         },
//         originalUrl: "/api/v2/outputs/1/automations/1",
//       } as unknown as Request;

//       const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 400);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Bad Request");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.deepEqual(error.error["details"], ["Invalid or missing automation ID."]);
//     });

//     it("should return a 404 and a 'Not Found' error (no output)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "-1",
//           automationId: "1",
//         },
//         originalUrl: "/api/v2/outputs/-1/automations/1",
//       } as unknown as Request;

//       const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 404);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Not Found");
//       assert.equal(error.error.url, "/api/v2/outputs/-1/automations/1");
//       assert.equal(error.error["details"].at(0), "Output with ID -1 not found.");
//     });

//     it("should return a 404 and a 'Not Found' error (no automation)", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//           automationId: "-1",
//         },
//         originalUrl: "/api/v2/outputs/1/automations/-1",
//       } as unknown as Request;

//       const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 404);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Not Found");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/-1");
//       assert.equal(error.error["details"].at(0), "Automation with ID -1 not found.");
//     });

//     it("should return a 503 if the database is unreachable", async () => {
//       const mockRequest = {
//         app: {
//           get: (_dependency: string) => {
//             switch (_dependency) {
//               case "outputList":
//                 return outputList;
//             }
//           },
//         },
//         params: {
//           outputId: "1",
//           automationId: "1",
//         },
//         originalUrl: "/api/v2/outputs/1/automations/1",
//       } as unknown as Request;

//       outputList.outputs["1"]!.deleteAutomationAsync = function () {
//         return Promise.reject(new Error("Database Unreachable"));
//       }

//       const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
//       assert.equal(error.statusCode, 503);
//       assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
//       assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
//       assert.equal(error.error.name, "Service Unreachable");
//       assert.equal(error.error.url, "/api/v2/outputs/1/automations/1");
//       assert.equal(error.error["details"].at(0), "Failed to delete automation from database.");
//     });
//   });
// });