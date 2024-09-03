// `import { SprootDB } from "../../database/SprootDB";
// import AutomationManager from "../AutomationManager";
// import { Automation } from "../Automation";
// import { SensorList } from "../../sensors/list/SensorList";
// import { OutputList } from "../../outputs/list/OutputList";

// import { assert } from "chai";
// import sinon from "sinon";
// import { SDBAutomation } from "@sproot/database/SDBAutomation";
// import { SDBSensorAutomationCondition } from "@sproot/database/SDBSensorAutomationCondition";
// import { SDBOutputAutomationCondition } from "@sproot/database/SDBOutputAutomationCondition";
// import { IAutomation } from "@sproot/automation/IAutomation";
// import { SensorCondition } from "../conditions/sensors/SensorConditionGroups";
// import { OutputCondition } from "../conditions/groups/OutputConditionsGroup";

// describe("AutomationManager.ts tests", () => {
//   describe("AutomationManager", () => {
//     describe("addAsync", () => {
//       it('should add two basic automations (and call evaluate on them)', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const sensorListStub = sinon.createStubInstance(SensorList);
//         const outputListStub = sinon.createStubInstance(OutputList);

//         const automationManager = new AutomationManager(sprootDB);
//         const automationSpy = sinon.spy(Automation.prototype, "evaluate");
//         const sensorAutomation = {
//           id: 1,
//           name: "sensorAutomation",
//           value: 50,
//           operator: "and"
//         } as SDBAutomation;
//         const outputAutomation = {
//           id: 2,
//           name: "outputAutomation",
//           value: 75,
//           operator: "and"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         await automationManager.addAutomationAsync(1, sensorAutomation);
//         sprootDB.addAutomationAsync.resolves(2);
//         await automationManager.addAutomationAsync(1, outputAutomation);
//         // added two automations, verify
//         assert.equal(Object.keys(automationManager.automations).length, 2);
//         assert.equal(sprootDB.addAutomationAsync.callCount, 2);

//         // Verify that the rules object has been created
//         assert.equal(Object.keys(automationManager.automations[1]?.conditions!).length, 3);
//         assert.equal(Object.keys(automationManager.automations[2]?.conditions!).length, 3);

//         // call evaluate on both automations
//         automationManager.evaluate(sensorListStub, outputListStub, new Date());
//         sinon.assert.calledTwice(automationSpy);
//       })
//     });

//     describe("deleteAsync", () => {
//       it('should add one automation and then remove it.', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const outputAutomation = {
//           id: 1,
//           name: "sensorAutomation",
//           value: 50,
//           operator: "or"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         await automationManager.addAutomationAsync(1, outputAutomation);

//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(sprootDB.addAutomationAsync.callCount, 1);

//         await automationManager.deleteAutomationAsync(1);
//         assert.equal(Object.keys(automationManager.automations).length, 0);
//         assert.equal(sprootDB.deleteAutomationAsync.callCount, 1);
//       })
//     });

//     describe("updateAsync", () => {
//       it('should add one automation and then update it.', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const sensorAutomation = {
//           id: 1,
//           name: "sensorAutomation",
//           value: 50,
//           operator: "or"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         sprootDB.updateSensorAutomationConditionAsync.resolves();
//         sprootDB.updateOutputAutomationConditionAsync.resolves();

//         sprootDB.addSensorAutomationConditionAsync.resolves(2);
//         sprootDB.addOutputAutomationConditionAsync.resolves(2);
//         await automationManager.addAutomationAsync(1, sensorAutomation);

//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(automationManager.automations[1]!.name, "sensorAutomation");
//         assert.equal(automationManager.automations[1]!.value, 50);
//         assert.equal(automationManager.automations[1]!.operator, "or");

//         const updatedAutomation = {
//           id: 1,
//           name: "sensorAutomation, yo",
//           value: 55,
//           operator: "and"
//         } as IAutomation;

//         await automationManager.updateAutomationAsync(1, updatedAutomation);
//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(sprootDB.updateAutomationAsync.callCount, 1);

//         assert.equal(automationManager.automations[1]!.name, "sensorAutomation, yo");
//         assert.equal(automationManager.automations[1]!.value, 55);
//         assert.equal(automationManager.automations[1]!.operator, "and");
//       });

//       it('should do nothing if the automation does not exist', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const sensorAutomation = {
//           id: 1,
//           name: "sensorAutomation",
//           value: 50,
//           operator: "or"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         sprootDB.updateSensorAutomationConditionAsync.resolves();
//         sprootDB.updateOutputAutomationConditionAsync.resolves();

//         sprootDB.addSensorAutomationConditionAsync.resolves(2);
//         sprootDB.addOutputAutomationConditionAsync.resolves(2);
//         await automationManager.addAutomationAsync(1, sensorAutomation);

//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(automationManager.automations[1]!.name, "sensorAutomation");
//         assert.equal(automationManager.automations[1]!.value, 50);
//         assert.equal(automationManager.automations[1]!.operator, "or");

//         const updatedAutomation = {
//           id: 2,
//           name: "sensorAutomation, yo",
//           value: 55,
//           operator: "and"
//         } as IAutomation;

//         await automationManager.updateAutomationAsync(1, updatedAutomation);
//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(sprootDB.updateAutomationAsync.callCount, 0);

//         assert.equal(automationManager.automations[1]!.name, "sensorAutomation");
//         assert.equal(automationManager.automations[1]!.value, 50);
//         assert.equal(automationManager.automations[1]!.operator, "or");
//       });
//     });

//     describe("addConditionAsync", () => {
//       it('should do nothing with an invalid automationId', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const condition = {

//           sensorId: 1,
//           readingType: "temperature",
//           operator: "equal",
//           comparisonValue: 50
//         } as SensorCondition

//         await automationManager.addCondition(1, condition, "allOf");
//         assert.equal(sprootDB.addSensorAutomationConditionAsync.callCount, 0);
//       });

//       it('should add a SensorCondition to an automation', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const sensorAutomation = {
//           id: 1,
//           name: "sensorAutomation",
//           value: 50,
//           operator: "or"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         sprootDB.addSensorAutomationConditionAsync.resolves(1);
//         await automationManager.addAutomationAsync(1, sensorAutomation);

//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(automationManager.automations[1]!.name, "sensorAutomation");
//         assert.equal(automationManager.automations[1]!.value, 50);
//         assert.equal(automationManager.automations[1]!.operator, "or");

//         const condition = {
//           sensorId: 1,
//           readingType: "temperature",
//           operator: "equal",
//           comparisonValue: 50
//         } as SensorCondition

//         await automationManager.addCondition(1, condition, "allOf");
//         assert.equal(Object.keys(automationManager.automations[1]!.conditions.allOf).length, 1);
//         assert.equal(sprootDB.addSensorAutomationConditionAsync.callCount, 1);
//         console.log(automationManager.automations[1]!.conditions.allOf);
//         assert.equal(automationManager.automations[1]!.conditions.allOf[0]!.operator, "equal");
//         assert.equal(automationManager.automations[1]!.conditions.allOf[0]!.comparisonValue, 50);
//       });

//       it('should add an OutputCondition to an automation', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const outputAutomation = {
//           id: 1,
//           name: "outputAutomation",
//           value: 50,
//           operator: "or"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         sprootDB.addOutputAutomationConditionAsync.resolves(1);
//         await automationManager.addAutomationAsync(1, outputAutomation);

//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(automationManager.automations[1]!.name, "outputAutomation");
//         assert.equal(automationManager.automations[1]!.value, 50);
//         assert.equal(automationManager.automations[1]!.operator, "or");

//         const condition = {
//           outputId: 1,
//           operator: "equal",
//           comparisonValue: 50
//         } as OutputCondition

//         await automationManager.addCondition(1, condition, "allOf");
//         assert.equal(Object.keys(automationManager.automations[1]!.conditions.allOf).length, 1);
//         assert.equal(sprootDB.addOutputAutomationConditionAsync.callCount, 1);
//         assert.equal(automationManager.automations[1]!.conditions.allOf[1]!.operator, "equal");
//         assert.equal(automationManager.automations[1]!.conditions.allOf[1]!.comparisonValue, 50);
//       });
//     })

//     describe("updateAutomationConditionAsync", () => {
//       it('should do nothing with an invalid automationId', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const condition = {
//           id: 1,
//           sensorId: 1,
//           readingType: "temperature",
//           operator: "equal",
//           comparisonValue: 50
//         } as SensorCondition

//         await automationManager.updateConditionAsync(1, condition, "allOf");
//         assert.equal(sprootDB.updateSensorAutomationConditionAsync.callCount, 0);
//       });

//       it('should do nothing with an invalid conditionId', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const sensorAutomation = {
//           id: 1,
//           name: "sensorAutomation",
//           value: 50,
//           operator: "or"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         sprootDB.addSensorAutomationConditionAsync.resolves(1);
//         await automationManager.addAutomationAsync(1, sensorAutomation);

//         const condition = {
//           id: 1,
//           sensorId: 1,
//           readingType: "temperature",
//           operator: "equal",
//           comparisonValue: 50
//         } as SensorCondition

//         await automationManager.addCondition(1, condition, "allOf");
//         assert.equal(Object.keys(automationManager.automations[1]!.conditions.allOf).length, 1);

//         condition.id = 2;
//         await automationManager.updateConditionAsync(1, condition, "allOf");
//         assert.equal(sprootDB.updateSensorAutomationConditionAsync.callCount, 0);
//       });
      
//       it('should update a SensorCondition rule in an automation', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         const sensorAutomation = {
//           id: 1,
//           name: "sensorAutomation",
//           value: 50,
//           operator: "or"
//         } as SDBAutomation;

//         sprootDB.addAutomationAsync.resolves(1);
//         sprootDB.addSensorAutomationConditionAsync.resolves(1);
//         await automationManager.addAutomationAsync(1, sensorAutomation);

//         assert.equal(Object.keys(automationManager.automations).length, 1);
//         assert.equal(automationManager.automations[1]!.name, "sensorAutomation");
//         assert.equal(automationManager.automations[1]!.value, 50);
//         assert.equal(automationManager.automations[1]!.operator, "or");

//         const condition = {
//           id: 1,
//           sensorId: 1,
//           readingType: "temperature",
//           operator: "equal",
//           comparisonValue: 50
//         } as SensorCondition

//         await automationManager.addConditionAsync(1, "allOf", condition);
//         assert.equal(Object.keys(automationManager.automations[1]!.conditions.allOf).length, 1);
//         assert.equal(sprootDB.addSensorAutomationConditionAsync.callCount, 1);

//         const updatedCondition = {
//           id: 1,
//           sensorId: 1,
//           readingType: "temperature",
//           operator: "equal",
//           comparisonValue: 55
//         } as SensorCondition

//         await automationManager.updateConditionAsync(1, "allOf", updatedCondition);
//         assert.equal(automationManager.automations[1]!.conditions.allOf[1]!.comparisonValue, 55);
//         assert.equal(sprootDB.updateSensorAutomationConditionAsync.callCount, 1);
//       });
//     });

//     describe("loadAsync", () => {
//       it('should load two automations, assigning conditions to their respective type', async () => {
//         const sprootDB = sinon.createStubInstance(SprootDB);
//         const automationManager = new AutomationManager(sprootDB);

//         sprootDB.getAutomationsAsync.resolves([
//           {
//             id: 1,
//             name: "sensorAutomation",
//             outputId: 1,
//             value: 50,
//             operator: "and"
//           } as SDBAutomation,
//           {
//             id: 2,
//             name: "outputAutomation",
//             outputId: 1,
//             value: 75,
//             operator: "or"
//           } as SDBAutomation
//         ]);

//         sprootDB.getSensorAutomationConditionsAsync.onFirstCall().resolves([
//           {
//             id: 1,
//             automationId: 1,
//             type: "allOf",
//             sensorId: 1,
//             readingType: "temperature",
//             operator: "equal",
//             comparisonValue: 50
//           } as SDBSensorAutomationCondition,
//           {
//             id: 2,
//             automationId: 1,
//             type: "anyOf",
//             sensorId: 1,
//             readingType: "temperature",
//             operator: "equal",
//             comparisonValue: 50
//           } as SDBSensorAutomationCondition,
//           {
//             id: 3,
//             automationId: 1,
//             type: "oneOf",
//             sensorId: 1,
//             readingType: "temperature",
//             operator: "equal",
//             comparisonValue: 50
//           } as SDBSensorAutomationCondition
//         ]);
//         sprootDB.getSensorAutomationConditionsAsync.onSecondCall().resolves([]);

//         sprootDB.getOutputAutomationConditionsAsync.onFirstCall().resolves([]);
//         sprootDB.getOutputAutomationConditionsAsync.onSecondCall().resolves([
//           {
//             id: 1,
//             automationId: 2,
//             type: "allOf",
//             outputId: 1,
//             operator: "equal",
//             comparisonValue: 50
//           } as SDBOutputAutomationCondition,
//           {
//             id: 2,
//             automationId: 2,
//             type: "anyOf",
//             outputId: 1,
//             operator: "equal",
//             comparisonValue: 50
//           } as SDBOutputAutomationCondition,
//           {
//             id: 3,
//             automationId: 2,
//             type: "oneOf",
//             outputId: 1,
//             operator: "equal",
//             comparisonValue: 50
//           } as SDBOutputAutomationCondition
//         ]);

//         await automationManager.loadAsync(1);

//         assert.equal(Object.keys(automationManager.automations).length, 2);
//         assert.equal(Object.keys(automationManager.automations[1]!.conditions.allOf).length, 1);
//         assert.equal(Object.keys(automationManager.automations[1]!.conditions.anyOf).length, 1);
//         assert.equal(Object.keys(automationManager.automations[1]!.conditions.oneOf).length, 1);
//         assert.equal(Object.keys(automationManager.automations[2]!.conditions.allOf).length, 1);
//         assert.equal(Object.keys(automationManager.automations[2]!.conditions.anyOf).length, 1);
//         assert.equal(Object.keys(automationManager.automations[2]!.conditions.oneOf).length, 1);
//         assert.equal(sprootDB.getAutomationsAsync.callCount, 1);
//         assert.equal(sprootDB.getSensorAutomationConditionsAsync.callCount, 2);
//         assert.equal(sprootDB.getOutputAutomationConditionsAsync.callCount, 2);
//       });
//     });
//   })
// })`