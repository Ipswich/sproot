import { assert } from "chai";
import { get as httpGet } from "http";
import sinon from "sinon";
import request from "supertest";
import { validateMiddlewareValues } from "./utils";
import { app, server } from "./setup";
import fs from "fs";
import { CameraManager } from "../camera/CameraManager";
import { FrameBuffer } from "../camera/FrameBuffer";
import { DI_KEYS } from "../utils/DependencyInjectionConstants";
import { AutomationsTriggeredEvent } from "../eventbus/events/automations/AutomationsTriggeredEvent";
import { OutputList } from "../outputs/list/OutputList";
import { AutomationService } from "../automation/AutomationService";

describe("API Tests", async function () {
  this.timeout(5000);

  const flushAsync = () => new Promise((resolve) => setImmediate(resolve));
  const delayAsync = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));
  const waitForOutputAsync = async (
    outputId: number,
    predicate: (output: any) => boolean,
    attempts = 20,
  ) => {
    let lastOutput: any;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const response = await request(server).get(`/api/v2/outputs/${outputId}`).expect(200);
      lastOutput = response.body["content"].data[0];

      if (predicate(lastOutput)) {
        validateMiddlewareValues(response);
        return lastOutput;
      }

      await delayAsync(25);
    }

    assert.fail(`Timed out waiting for output ${outputId}: ${JSON.stringify(lastOutput)}`);
  };
  const waitForOutputDataAsync = async (
    outputList: OutputList,
    outputId: number,
    predicate: (output: any) => boolean,
    attempts = 40,
  ) => {
    let lastOutput: any;

    for (let attempt = 0; attempt < attempts; attempt++) {
      lastOutput = outputList.outputData[outputId.toString()];

      if (lastOutput && predicate(lastOutput)) {
        return lastOutput;
      }

      await delayAsync(25);
    }

    assert.fail(`Timed out waiting for output data ${outputId}: ${JSON.stringify(lastOutput)}`);
  };
  // describe("Authentication Routes", async () => {
  //   before(() => {
  //     process.env["AUTHENTICATION_ENABLED"] = "true";
  //   });
  //   after(() => {
  //     process.env["AUTHENTICATION_ENABLED"] = "false";
  //   });
  //   describe("POST", async () => {
  //     it("should return 200 and a JWT for Bearer Authorization", async () => {
  //       const response = await request(server)
  //         .post("/api/v2/authenticate/token")
  //         .send({
  //           username: "testuser",
  //           password: "password",
  //         })
  //         .expect(200);
  //       const content = response.body["content"];
  //       validateMiddlewareValues(response);
  //       assert.containsAllKeys(content.data, ["token"]);
  //     });

  //     it("should return 200 and a csrf-token for cookie authorization", async () => {
  //       const response = await request(server)
  //         .post("/api/v2/authenticate/login")
  //         .send({
  //           username: "testuser",
  //           password: "password",
  //         })
  //         .expect(200);
  //       const content = response.body["content"];
  //       validateMiddlewareValues(response);
  //       assert.containsAllKeys(content.data, ["csrf-token"]);
  //     });
  //   });
  // });

  describe("Ping Routes", () => {
    describe("GET", () => {
      it("should return 200", async () => {
        const response = await request(server).get("/api/v2/ping").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.deepEqual(content, { data: "pong" });
      });
    });
  });

  describe("Output Routes", async () => {
    const outputKeys = [
      "id",
      "model",
      "address",
      "name",
      "pin",
      "deviceZoneId",
      "isPwm",
      "isInvertedPwm",
      "color",
      "state",
      "automationTimeout",
      "actionWarnings",
      "activeConflict",
      "triggeredBy",
    ];
    const stateKeys = ["controlMode", "logTime", "value"];
    describe("Outputs", async () => {
      describe("GET", async () => {
        it("should return 200 and all outputs", async () => {
          const response = await request(server).get("/api/v2/outputs").expect(200);
          const content = response.body["content"];

          validateMiddlewareValues(response);
          assert.lengthOf(content.data, 2);
          assert.containsAllKeys(content.data[0], outputKeys);
          assert.containsAllKeys(content.data[0].state, ["automatic", "controlMode", "manual"]);
          assert.containsAllKeys(content.data[0].state.automatic, stateKeys);
          assert.containsAllKeys(content.data[0].state.manual, stateKeys);
          assert.containsAllKeys(content.data[1], outputKeys);
          assert.containsAllKeys(content.data[1].state, ["automatic", "controlMode", "manual"]);
          assert.containsAllKeys(content.data[1].state.automatic, stateKeys);
          assert.containsAllKeys(content.data[1].state.manual, stateKeys);
        });

        it("should return 200 and a single output", async () => {
          const response = await request(server).get("/api/v2/outputs/1").expect(200);
          const content = response.body["content"];

          validateMiddlewareValues(response);
          assert.lengthOf(content.data, 1);
          assert.containsAllKeys(content.data[0], outputKeys);
          assert.containsAllKeys(content.data[0].state, ["automatic", "controlMode", "manual"]);
          assert.containsAllKeys(content.data[0].state.automatic, stateKeys);
          assert.containsAllKeys(content.data[0].state.manual, stateKeys);
        });

        it("should include precedence warnings when multiple automations control the same output at the same precedence", async () => {
          let createdActionId: number | undefined;

          try {
            const createResponse = await request(server)
              .post("/api/v2/output-actions")
              .send({
                automationId: 2,
                outputId: 1,
                value: 100,
                precedence: "High",
              })
              .expect(201);

            validateMiddlewareValues(createResponse);
            createdActionId = createResponse.body["content"].data.id;

            const output = await waitForOutputAsync(
              1,
              (candidate) =>
                Array.isArray(candidate.actionWarnings) && candidate.actionWarnings.length === 1,
            );

            assert.deepEqual(output.actionWarnings, [
              {
                precedence: "High",
                actions: [
                  { automationId: 1, automationName: "Automation #1" },
                  { automationId: 2, automationName: "Automation #2" },
                ],
              },
            ]);
            assert.isNull(output.activeConflict);
          } finally {
            if (createdActionId !== undefined) {
              await request(server).delete(`/api/v2/output-actions/${createdActionId}`).expect(200);
              await waitForOutputAsync(
                1,
                (candidate) =>
                  Array.isArray(candidate.actionWarnings) && candidate.actionWarnings.length === 0,
              );
            }
          }
        });

        it("should include an active conflict when the highest-precedence triggered actions disagree", async () => {
          const eventBus = app.get(DI_KEYS.EventBus);
          const outputList = app.get(DI_KEYS.OutputList) as OutputList;

          let createdActionId: number | undefined;

          try {
            const timeoutUpdateResponse = await request(server)
              .patch("/api/v2/outputs/1")
              .send({ automationTimeout: 0 })
              .expect(200);

            validateMiddlewareValues(timeoutUpdateResponse);

            const createResponse = await request(server)
              .post("/api/v2/output-actions")
              .send({
                automationId: 2,
                outputId: 1,
                value: 100,
                precedence: "High",
              })
              .expect(201);

            validateMiddlewareValues(createResponse);
            createdActionId = createResponse.body["content"].data.id;

            const warningOutput = await waitForOutputAsync(
              1,
              (candidate) =>
                Array.isArray(candidate.actionWarnings) && candidate.actionWarnings.length === 1,
            );
            assert.lengthOf(warningOutput.actionWarnings, 1);

            await eventBus.publishAsync(
              new AutomationsTriggeredEvent(
                new Map([
                  [
                    1,
                    {
                      automationId: 1,
                      automationName: "Automation #1",
                      operator: "or",
                      conditions: { allOf: [], anyOf: [], oneOf: [] },
                    },
                  ],
                  [
                    2,
                    {
                      automationId: 2,
                      automationName: "Automation #2",
                      operator: "or",
                      conditions: { allOf: [], anyOf: [], oneOf: [] },
                    },
                  ],
                ]),
              ),
            );
            await flushAsync();

            await waitForOutputDataAsync(
              outputList,
              1,
              (candidate) => candidate.activeConflict !== null,
            );

            const response = await request(server).get("/api/v2/outputs/1").expect(200);
            validateMiddlewareValues(response);
            const output = response.body["content"].data[0];

            assert.deepEqual(output.activeConflict, {
              precedence: "High",
              actions: [
                { automationId: 1, automationName: "Automation #1", value: 0 },
                { automationId: 2, automationName: "Automation #2", value: 100 },
              ],
            });
          } finally {
            if (createdActionId !== undefined) {
              await request(server).delete(`/api/v2/output-actions/${createdActionId}`).expect(200);
              const cleanupOutput = await waitForOutputAsync(
                1,
                (candidate) =>
                  Array.isArray(candidate.actionWarnings) &&
                  candidate.actionWarnings.length === 0 &&
                  candidate.activeConflict === null,
              );
              assert.isNull(cleanupOutput.activeConflict);
            }

            const timeoutResetResponse = await request(server)
              .patch("/api/v2/outputs/1")
              .send({ automationTimeout: 1 })
              .expect(200);

            validateMiddlewareValues(timeoutResetResponse);
          }
        });

        it("should include triggered automations for outputs with active automation actions", async () => {
          const eventBus = app.get(DI_KEYS.EventBus);
          const outputList = app.get(DI_KEYS.OutputList) as OutputList;
          try {
            const timeoutUpdateResponse = await request(server)
              .patch("/api/v2/outputs/1")
              .send({ automationTimeout: 0 })
              .expect(200);

            validateMiddlewareValues(timeoutUpdateResponse);

            await eventBus.publishAsync(
              new AutomationsTriggeredEvent(
                new Map([
                  [
                    1,
                    {
                      automationId: 1,
                      automationName: "Automation #1",
                      operator: "or",
                      conditions: { allOf: [], anyOf: [], oneOf: [] },
                    },
                  ],
                ]),
              ),
            );
            await flushAsync();

            await waitForOutputDataAsync(
              outputList,
              1,
              (candidate) =>
                Array.isArray(candidate.triggeredBy) && candidate.triggeredBy.length === 1,
            );

            const response = await request(server).get("/api/v2/outputs/1").expect(200);
            validateMiddlewareValues(response);
            const output = response.body["content"].data[0];

            assert.deepEqual(output.triggeredBy, [
              {
                automationId: 1,
                automationName: "Automation #1",
              },
            ]);
          } finally {
            const timeoutResetResponse = await request(server)
              .patch("/api/v2/outputs/1")
              .send({ automationTimeout: 1 })
              .expect(200);

            validateMiddlewareValues(timeoutResetResponse);
          }
        });
      });
      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(Object.keys(app.get("outputList").outputs), 2);
            const response = await request(server)
              .post("/api/v2/outputs")
              .send({
                model: "PCA9685",
                address: "0x40",
                name: "Test Output",
                pin: "0",
                isPwm: true,
                isInvertedPwm: false,
                color: "#82c91e",
                automationTimeout: 1,
              })
              .expect(201);
            validateMiddlewareValues(response);
            assert.lengthOf(Object.keys(app.get("outputList").outputs), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(app.get("outputList").outputs["6"].name, "Test Output");
            const response = await request(server)
              .patch("/api/v2/outputs/6")
              .send({
                name: "Test1 Output",
              })
              .expect(200);
            const content = response.body["content"];
            validateMiddlewareValues(response);
            assert.equal(app.get("outputList").outputs["6"].name, "Test1 Output");
            assert.containsAllKeys(content.data, outputKeys);
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(Object.keys(app.get("outputList").outputs), 3);
            const response = await request(server).delete("/api/v2/outputs/6").expect(200);
            validateMiddlewareValues(response);
            assert.lengthOf(Object.keys(app.get("outputList").outputs), 2);
          });
        });
      });
    });

    describe("SupportedModels", async () => {
      describe("GET", async () => {
        it("should return 200", async () => {
          const response = await request(server)
            .get("/api/v2/outputs/supported-models")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.deepEqual(content.data, {
            ESP32_PCA9685: "ESP32 PCA9685",
            OUTPUT_GROUP: "Output Group",
            PCA9685: "PCA9685",
            TPLINK_SMART_PLUG: "TPLink Smart Plug",
          });
        });
      });

      describe("AvailableDevices", async () => {
        it("should return static PCA9685 options", async () => {
          const response = await request(server)
            .get("/api/v2/outputs/available-devices/PCA9685")
            .expect(200);

          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data, 64);
          const firstBoard = content.data[0];
          assert.deepEqual(firstBoard.address, "0x40");
          assert.isNull(firstBoard.alias);
          assert.isNull(firstBoard.externalId);
          assert.isNull(firstBoard.subcontrollerId);
          assert.isArray(firstBoard.pins);
          assert.notInclude(firstBoard.pins, "0");
        });
      });
    });
  });

  describe("Output State Routes", async () => {
    describe("Control Mode", async () => {
      describe("PUT", async () => {
        it("should return 200", async () => {
          assert.equal(app.get("outputList").outputs["1"].state.controlMode, "automatic");
          const response = await request(server)
            .put("/api/v2/outputs/1/control-mode")
            .send({
              controlMode: "manual",
            })
            .expect(200);
          validateMiddlewareValues(response);
          assert.equal(app.get("outputList").outputs["1"].state.controlMode, "manual");
        });
      });
    });

    describe("Manual State", async () => {
      describe("PUT", async () => {
        it("should return 200", async () => {
          assert.equal(app.get("outputList").outputs["1"].state.manual.value, 0);
          const response = await request(server)
            .put("/api/v2/outputs/1/manual-state")
            .send({
              value: 100,
            })
            .expect(200);
          validateMiddlewareValues(response);
          assert.equal(app.get("outputList").outputs["1"].state.manual.value, 100);
        });
      });
    });
  });

  describe("Automation Routes", async () => {
    describe("GET", async () => {
      it("should return 200 and all automations", async () => {
        const response = await request(server).get("/api/v2/automations").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data, 2);
        assert.containsAllKeys(content.data[0], ["id", "name", "operator", "enabled", "triggered"]);
        assert.containsAllKeys(content.data[1], ["id", "name", "operator", "enabled", "triggered"]);
      });

      it("should return 200 and a single automation", async () => {
        const response = await request(server).get("/api/v2/automations/1").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["id", "name", "operator", "enabled", "triggered"]);
      });

      it("should expose when an automation has evaluated to true", async () => {
        const automationService = app.get(DI_KEYS.AutomationService) as AutomationService;
        let automationId: number | undefined;

        try {
          const createAutomationResponse = await request(server)
            .post("/api/v2/automations")
            .send({
              name: "Triggered Automation",
              operator: "or",
            })
            .expect(201);
          validateMiddlewareValues(createAutomationResponse);
          automationId = createAutomationResponse.body["content"].data.id;

          const createConditionResponse = await request(server)
            .post(`/api/v2/automations/${automationId}/conditions/time`)
            .send({
              groupType: "oneOf",
              startTime: "00:00",
              endTime: "23:59",
            })
            .expect(201);
          validateMiddlewareValues(createConditionResponse);

          await automationService.evaluateAllAutomationsAsync(new Date("2026-08-10T10:00:00Z"));

          const response = await request(server).get("/api/v2/automations").expect(200);
          validateMiddlewareValues(response);

          const triggeredAutomation = response.body["content"].data.find(
            (automation: any) => automation.id === automationId,
          );

          assert.isTrue(triggeredAutomation.triggered);
        } finally {
          if (automationId !== undefined) {
            const deleteAutomationResponse = await request(server)
              .delete(`/api/v2/automations/${automationId}`)
              .expect(200);
            validateMiddlewareValues(deleteAutomationResponse);
          }
        }
      });
    });

    describe("Create, Update, Delete", async () => {
      let createdAutomationId: number;

      describe("POST", async () => {
        it("should return 201", async () => {
          assert.lengthOf(await app.get("sprootDB").automations.getAllAsync(), 2);
          const response = await request(server)
            .post("/api/v2/automations")
            .send({
              name: "Test Automation",
              operator: "or",
            })
            .expect(201);
          createdAutomationId = response.body["content"].data.id;
          assert.lengthOf(await app.get("sprootDB").automations.getAllAsync(), 3);
        });
      });
      describe("PATCH", async () => {
        it("should return 200", async () => {
          assert.equal(
            (await app.get("sprootDB").automations.getByIdAsync(createdAutomationId))[0].name,
            "Test Automation",
          );
          await request(server)
            .patch(`/api/v2/automations/${createdAutomationId}`)
            .send({
              name: "Test1 Automation",
              operator: "and",
            })
            .expect(200);
          assert.equal(
            (await app.get("sprootDB").automations.getByIdAsync(createdAutomationId))[0].name,
            "Test1 Automation",
          );
        });
      });
      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.lengthOf(await app.get("sprootDB").automations.getAllAsync(), 3);
          await request(server).delete(`/api/v2/automations/${createdAutomationId}`).expect(200);
          assert.lengthOf(await app.get("sprootDB").automations.getAllAsync(), 2);
        });
      });
    });
  });

  describe("Automation Condition Routes", async () => {
    describe("GET", async () => {
      it("should return 200 and all conditions", async () => {
        const response = await request(server).get("/api/v2/automations/1/conditions").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data.sensor.oneOf, 2);
        assert.lengthOf(content.data.output.oneOf, 2);
        assert.lengthOf(content.data.time.oneOf, 2);
        assert.lengthOf(content.data.weekday.oneOf, 2);
        assert.lengthOf(content.data.month.oneOf, 2);
      });
    });

    describe("Sensor Conditions", async () => {
      describe("GET", async () => {
        it("should return 200 and all sensor conditions", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/sensor")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data.oneOf, 2);
        });

        it("should return 200 and a single sensor condition", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/sensor/1")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, [
            "id",
            "automationId",
            "groupType",
            "operator",
            "comparisonValue",
            "sensorId",
            "readingType",
          ]);
        }).timeout(5000);
      });
      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.sensor.getAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/sensor")
              .send({
                groupType: "oneOf",
                operator: "greater",
                comparisonValue: 20,
                comparisionLookback: 3,
                sensorId: 1,
                readingType: "temperature",
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").automations.conditions.sensor.getAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").automations.conditions.sensor.getAsync(1))[2]
                .comparisonValue,
              20,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/sensor/3")
              .send({
                comparisonValue: 30,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").automations.conditions.sensor.getAsync(1))[2]
                .comparisonValue,
              30,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.sensor.getAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/sensor/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").automations.conditions.sensor.getAsync(1), 2);
          });
        });
      });
    });

    describe("Output Conditions", async () => {
      describe("GET", async () => {
        it("should return 200 and all output conditions", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/output")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data.oneOf, 2);
        });

        it("should return 200 and a single output condition", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/output/1")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, [
            "id",
            "automationId",
            "groupType",
            "operator",
            "comparisonValue",
            "outputId",
          ]);
        });
      });

      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.output.getAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/output")
              .send({
                groupType: "oneOf",
                operator: "greater",
                comparisonValue: 20,
                comparisionLookback: 3,
                outputId: 1,
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").automations.conditions.output.getAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").automations.conditions.output.getAsync(1))[2]
                .comparisonValue,
              20,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/output/3")
              .send({
                comparisonValue: 30,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").automations.conditions.output.getAsync(1))[2]
                .comparisonValue,
              30,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.output.getAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/output/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").automations.conditions.output.getAsync(1), 2);
          });
        });
      });
    });

    describe("Time Conditions", async () => {
      describe("GET", async () => {
        it("should return 200 and all time conditions", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/time")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data.oneOf, 2);
        });

        it("should return 200 and a single time condition", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/time/1")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, [
            "id",
            "automationId",
            "groupType",
            "startTime",
            "endTime",
            "repeatInterval",
            "repeatDuration",
            "phaseAnchorType",
            "phaseAnchorValue",
          ]);
        });
      });

      describe("Create, Update, Delete", async () => {
        let createdTimeConditionId: number;

        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.time.getAsync(1), 2);
            const response = await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "00:00",
                endTime: "11:59",
              })
              .expect(201);
            createdTimeConditionId = response.body["content"].data.id;
            assert.lengthOf(await app.get("sprootDB").automations.conditions.time.getAsync(1), 3);
          });

          it("should create a repeating time condition", async () => {
            const response = await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "08:00",
                endTime: "17:00",
                repeatInterval: 30,
                repeatDuration: 10,
                phaseAnchorType: "default",
              })
              .expect(201);

            assert.equal(response.body.content.data.repeatInterval, 30);
            assert.equal(response.body.content.data.repeatDuration, 10);
            assert.equal(response.body.content.data.phaseAnchorType, "default");
            assert.isNull(response.body.content.data.phaseAnchorValue);

            await request(server)
              .delete(`/api/v2/automations/1/conditions/time/${response.body.content.data.id}`)
              .expect(200);
          });

          it("should reject a time condition when repeatDuration >= repeatInterval", async () => {
            await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "08:00",
                endTime: "17:00",
                repeatInterval: 30,
                repeatDuration: 30,
                phaseAnchorType: "default",
              })
              .expect(400);

            await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "08:00",
                endTime: "17:00",
                repeatInterval: 30,
                repeatDuration: 45,
                phaseAnchorType: "default",
              })
              .expect(400);
          });

          it("should reject dynamic time points when location settings are missing", async () => {
            await request(server)
              .patch("/api/v2/settings")
              .send({
                "system.latitude": null,
                "system.longitude": null,
              })
              .expect(200);

            await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "sunrise",
              })
              .expect(400);
          });

          it("should create a dynamic time condition when location settings are configured", async () => {
            await request(server)
              .patch("/api/v2/settings")
              .send({
                "system.latitude": "40.7128",
                "system.longitude": "-74.0060",
              })
              .expect(200);

            const response = await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "goldenHourEnd",
                endTime: "nauticalDusk",
                repeatInterval: 30,
                repeatDuration: 10,
                phaseAnchorType: "clock",
                phaseAnchorValue: "sunset",
              })
              .expect(201);

            assert.equal(response.body.content.data.startTime, "goldenHourEnd");
            assert.equal(response.body.content.data.endTime, "nauticalDusk");
            assert.equal(response.body.content.data.phaseAnchorValue, "sunset");

            await request(server)
              .delete(`/api/v2/automations/1/conditions/time/${response.body.content.data.id}`)
              .expect(200);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            const beforeUpdate = (
              await app.get("sprootDB").automations.conditions.time.getAsync(1)
            ).find((condition: { id: number }) => condition.id === createdTimeConditionId);

            assert.equal(beforeUpdate?.startTime, "00:00");
            await request(server)
              .patch(`/api/v2/automations/1/conditions/time/${createdTimeConditionId}`)
              .send({
                startTime: "01:00",
              })
              .expect(200);

            const updatedCondition = (
              await app.get("sprootDB").automations.conditions.time.getAsync(1)
            ).find((condition: { id: number }) => condition.id === createdTimeConditionId);

            assert.equal(updatedCondition?.startTime, "01:00");
          });

          it("should update a time condition with repeat settings", async () => {
            const createResponse = await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "23:30",
                endTime: "04:00",
              })
              .expect(201);

            await request(server)
              .patch(`/api/v2/automations/1/conditions/time/${createResponse.body.content.data.id}`)
              .send({
                repeatInterval: 17,
                repeatDuration: 5,
                phaseAnchorType: "window",
              })
              .expect(200);

            const updated = (
              await app.get("sprootDB").automations.conditions.time.getAsync(1)
            ).find(
              (condition: { id: number }) => condition.id === createResponse.body.content.data.id,
            );

            assert.equal(updated.repeatInterval, 17);
            assert.equal(updated.repeatDuration, 5);
            assert.equal(updated.phaseAnchorType, "window");

            await request(server)
              .delete(
                `/api/v2/automations/1/conditions/time/${createResponse.body.content.data.id}`,
              )
              .expect(200);
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.time.getAsync(1), 3);
            await request(server)
              .delete(`/api/v2/automations/1/conditions/time/${createdTimeConditionId}`)
              .expect(200);
            assert.lengthOf(await app.get("sprootDB").automations.conditions.time.getAsync(1), 2);
          });
        });
      });
    });

    describe("Weekday Conditions", async () => {
      describe("GET", async () => {
        it("should return 200 and all weekday conditions", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/weekday")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data.oneOf, 2);
        });

        it("should return 200 and a single weekday condition", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/weekday/1")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, ["id", "automationId", "groupType", "weekdays"]);
        });
      });

      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.weekday.getAsync(1),
              2,
            );
            await request(server)
              .post("/api/v2/automations/1/conditions/weekday")
              .send({
                groupType: "oneOf",
                weekdays: 5,
              })
              .expect(201);
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.weekday.getAsync(1),
              3,
            );
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").automations.conditions.weekday.getAsync(1))[2].weekdays,
              5,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/weekday/3")
              .send({
                weekdays: 6,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").automations.conditions.weekday.getAsync(1))[2].weekdays,
              6,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.weekday.getAsync(1),
              3,
            );
            await request(server).delete("/api/v2/automations/1/conditions/weekday/3").expect(200);
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.weekday.getAsync(1),
              2,
            );
          });
        });
      });
    });

    describe("Month Conditions", async () => {
      describe("GET", async () => {
        it("should return 200 and all month conditions", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/month")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data.oneOf, 2);
        });

        it("should return 200 and a single month condition", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/month/1")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, ["id", "automationId", "groupType", "months"]);
        });
      });

      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.month.getAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/month")
              .send({
                groupType: "oneOf",
                months: 13,
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").automations.conditions.month.getAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").automations.conditions.month.getAsync(1))[2].months,
              13,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/month/3")
              .send({
                months: 14,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").automations.conditions.month.getAsync(1))[2].months,
              14,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").automations.conditions.month.getAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/month/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").automations.conditions.month.getAsync(1), 2);
          });
        });
      });
    });

    describe("DateRange Conditions", async () => {
      describe("GET", async () => {
        it("should return 200 and all date range conditions", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/date-range")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data.oneOf, 2);
        });

        it("should return 200 and a single date range condition", async () => {
          const response = await request(server)
            .get("/api/v2/automations/1/conditions/date-range/1")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, [
            "id",
            "automationId",
            "groupType",
            "startMonth",
            "startDate",
            "endMonth",
            "endDate",
          ]);
        });
      });

      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.dateRange.getAsync(1),
              2,
            );
            await request(server)
              .post("/api/v2/automations/1/conditions/date-range")
              .send({
                groupType: "oneOf",
                startMonth: 1,
                startDate: 1,
                endMonth: 1,
                endDate: 31,
              })
              .expect(201);
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.dateRange.getAsync(1),
              3,
            );
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").automations.conditions.dateRange.getAsync(1))[2]
                .startMonth,
              1,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/date-range/3")
              .send({
                startMonth: 6,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").automations.conditions.dateRange.getAsync(1))[2]
                .startMonth,
              6,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.dateRange.getAsync(1),
              3,
            );
            await request(server)
              .delete("/api/v2/automations/1/conditions/date-range/3")
              .expect(200);
            assert.lengthOf(
              await app.get("sprootDB").automations.conditions.dateRange.getAsync(1),
              2,
            );
          });
        });
      });
    });
  });

  describe("Output Action Routes", async () => {
    describe("GET", async () => {
      it("should return 200 and all output actions", async () => {
        const response = await request(server).get("/api/v2/output-actions").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data, 5);
        for (let i = 0; i < content.data.length; i++) {
          assert.containsAllKeys(content.data[i], [
            "id",
            "automationId",
            "outputId",
            "value",
            "precedence",
          ]);
        }
      });

      it("should return 200 and all output actions by automationID", async () => {
        const response = await request(server)
          .get("/api/v2/output-actions?automationId=2")
          .expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data, 3);
        assert.containsAllKeys(content.data[0], [
          "id",
          "automationId",
          "outputId",
          "value",
          "precedence",
        ]);
        assert.containsAllKeys(content.data[1], [
          "id",
          "automationId",
          "outputId",
          "value",
          "precedence",
        ]);
        assert.containsAllKeys(content.data[2], [
          "id",
          "automationId",
          "outputId",
          "value",
          "precedence",
        ]);
      });

      it("should return 200 and a single output action", async () => {
        const response = await request(server).get("/api/v2/output-actions/1").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, [
          "id",
          "automationId",
          "outputId",
          "value",
          "precedence",
        ]);
      });
    });

    describe("Create, Delete", async () => {
      let createdActionId: number;

      describe("POST", async () => {
        it("should return 201", async () => {
          assert.lengthOf(await app.get("sprootDB").automations.actions.output.getAllAsync(), 5);
          const response = await request(server)
            .post("/api/v2/output-actions")
            .send({
              automationId: 1,
              outputId: 1,
              value: 100,
              precedence: "High",
            })
            .expect(201);
          createdActionId = response.body["content"]["data"]["id"];
          assert.lengthOf(await app.get("sprootDB").automations.actions.output.getAllAsync(), 6);
        });
      });

      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.lengthOf(await app.get("sprootDB").automations.actions.output.getAllAsync(), 6);
          await request(server).delete(`/api/v2/output-actions/${createdActionId}`).expect(200);
          assert.lengthOf(await app.get("sprootDB").automations.actions.output.getAllAsync(), 5);
        });
      });
    });
  });

  describe("Notification Action Routes", async () => {
    describe("GET", async () => {
      it("should return 200 and all notifications", async () => {
        const response = await request(server).get("/api/v2/notification-actions").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data, 3);
        for (let i = 0; i < content.data.length; i++) {
          assert.containsAllKeys(content.data[i], ["id", "automationId", "subject", "content"]);
        }
      });

      it("should return 200 and all notifications by automationID", async () => {
        const response = await request(server)
          .get("/api/v2/notification-actions?automationId=1")
          .expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data, 2);
        assert.containsAllKeys(content.data[0], ["id", "automationId", "subject", "content"]);
        assert.containsAllKeys(content.data[1], ["id", "automationId", "subject", "content"]);
      });

      it("should return 200 and a single notification", async () => {
        const response = await request(server).get("/api/v2/notification-actions/1").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["id", "automationId", "subject", "content"]);
        assert.equal(content.data.subject, "Test Notification 1");
        assert.equal(content.data.content, "Test Content 1");
      });
    });

    describe("Create, Delete", async () => {
      describe("POST", async () => {
        it("should return 201", async () => {
          assert.lengthOf(
            await app.get("sprootDB").automations.actions.notification.getAllAsync(),
            3,
          );
          await request(server)
            .post("/api/v2/notification-actions")
            .send({
              automationId: 1,
              subject: "New Test Notification",
              content: "New Test Content",
            })
            .expect(201);
          assert.lengthOf(
            await app.get("sprootDB").automations.actions.notification.getAllAsync(),
            4,
          );
        });
      });

      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.lengthOf(
            await app.get("sprootDB").automations.actions.notification.getAllAsync(),
            4,
          );
          await request(server).delete("/api/v2/notification-actions/4").expect(200);
          assert.lengthOf(
            await app.get("sprootDB").automations.actions.notification.getAllAsync(),
            3,
          );
        });
      });
    });
  });

  describe("Sensor Routes", async () => {
    describe("Sensors", async () => {
      const sensorKeys = [
        "id",
        "name",
        "model",
        "subcontrollerId",
        "address",
        "color",
        "lastReading",
        "lastReadingTime",
        "units",
        "pin",
        "deviceZoneId",
        "lowCalibrationPoint",
        "highCalibrationPoint",
      ];
      describe("GET", async () => {
        it("should return 200 and all sensors", async () => {
          const response = await request(server).get("/api/v2/sensors").expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data, 4);
          assert.lengthOf(Object.keys(content.data[0]), sensorKeys.length);
          assert.containsAllKeys(content.data[0], sensorKeys);
          assert.containsAllKeys(content.data[1], sensorKeys);
          assert.containsAllKeys(content.data[0].units, ["humidity", "pressure", "temperature"]);
          assert.containsAllKeys(content.data[1].units, ["temperature"]);
        });

        it("should return 200 and a single sensor", async () => {
          const response = await request(server).get("/api/v2/sensors/1").expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data, 1);
          assert.containsAllKeys(content.data[0], sensorKeys);
          assert.containsAllKeys(content.data[0].units, ["humidity", "pressure", "temperature"]);
        });
      });

      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 4);
            const response = await request(server)
              .post("/api/v2/sensors")
              .send({
                name: "Test Sensor",
                model: "BME280",
                address: "0x76",
                color: "#82c91e",
              })
              .expect(201);
            const content = response.body["content"];
            validateMiddlewareValues(response);
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 5);
            assert.containsAllKeys(content.data, ["name", "model", "address", "color"]);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(app.get("sensorList").sensors["5"].name, "Test Sensor");
            const response = await request(server)
              .patch("/api/v2/sensors/5")
              .send({
                name: "Test1 Sensor",
                model: "BME280",
                address: "0x76",
                color: "#82c91e",
              })
              .expect(200);
            const content = response.body["content"];
            validateMiddlewareValues(response);
            assert.equal(app.get("sensorList").sensors["5"].name, "Test1 Sensor");
            assert.containsAllKeys(content.data, ["name", "model", "address", "color"]);
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 5);
            const response = await request(server).delete("/api/v2/sensors/5").expect(200);
            validateMiddlewareValues(response);
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 4);
          });
        });
      });
    });

    describe("ReadingTypes", async () => {
      describe("GET", async () => {
        it("should return 200", async () => {
          const response = await request(server).get("/api/v2/sensors/reading-types").expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.deepEqual(content, {
            data: {
              humidity: "%rH",
              pressure: "hPa",
              temperature: "°C",
              moisture: "%",
              voltage: "V",
            },
          });
        });
      });
    });

    describe("SupportedModels", async () => {
      describe("GET", async () => {
        it("should return 200", async () => {
          const response = await request(server)
            .get("/api/v2/sensors/supported-models")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.deepEqual(content.data, {
            BME280: "BME280",
            DS18B20: "DS18B20",
            ADS1115: "ADS1115",
            CAPACITIVE_MOISTURE_SENSOR: "Capacitive Moisture Sensor",
            ESP32_ADS1115: "ESP32 ADS1115",
            ESP32_BME280: "ESP32 BME280",
            ESP32_CAPACITIVE_MOISTURE_SENSOR: "ESP32 Capacitive Moisture Sensor",
            ESP32_DS18B20: "ESP32 DS18B20",
          });
        });
      });

      describe("AvailableDevices", async () => {
        it("should return static BME280 options", async () => {
          const response = await request(server)
            .get("/api/v2/sensors/available-devices/BME280")
            .expect(200);

          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.deepEqual(content.data, [
            {
              alias: null,
              address: "0x77",
              pins: null,
              subcontrollerId: null,
              externalId: null,
            },
          ]);
        });
      });
    });
  });

  describe("Device Zone Routes", async () => {
    describe("GET", async () => {
      it("should return 200 and all device zones", async () => {
        const response = await request(server).get("/api/v2/device-zones").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data, 2);
        assert.containsAllKeys(content.data[0], ["id", "name"]);
        assert.containsAllKeys(content.data[1], ["id", "name"]);
      });
    });

    describe("Create, Update, Delete", async () => {
      describe("POST", async () => {
        it("should return 201", async () => {
          assert.lengthOf(await app.get("sprootDB").deviceZones.getAllAsync(), 2);
          const response = await request(server)
            .post("/api/v2/device-zones")
            .send({
              name: "Test Device Group",
            })
            .expect(201);

          validateMiddlewareValues(response);
          const content = response.body["content"];

          assert.equal(content.data.name, "Test Device Group");
          assert.equal(content.data.id, 3);
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").deviceZones.getAllAsync())[2].name,
              "Test Device Group",
            );
            const response = await request(server)
              .patch("/api/v2/device-zones/3")
              .send({
                name: "Test1 Device Group",
              })
              .expect(200);

            validateMiddlewareValues(response);
            const content = response.body["content"];

            assert.equal(
              (await app.get("sprootDB").deviceZones.getAllAsync())[2].name,
              "Test1 Device Group",
            );
            assert.containsAllKeys(content.data, ["id", "name"]);
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").deviceZones.getAllAsync(), 3);
            const response = await request(server).delete("/api/v2/device-zones/3").expect(200);
            validateMiddlewareValues(response);
            assert.lengthOf(await app.get("sprootDB").deviceZones.getAllAsync(), 2);
          });
        });
      });
    });
  });

  describe("Camera Routes", async () => {
    const cameraSettingsKeys = [
      "id",
      "enabled",
      "name",
      "xVideoResolution",
      "yVideoResolution",
      "videoFps",
      "xImageResolution",
      "yImageResolution",
      "timelapseEnabled",
      "imageRetentionDays",
      "imageRetentionSize",
      "timelapseInterval",
      "timelapseStartTime",
      "timelapseEndTime",
    ];
    describe("Settings", () => {
      describe("GET", () => {
        it("should return 200 and camera settings data", async () => {
          const response = await request(server).get("/api/v2/camera/settings").expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.deepEqual(content.data, {
            id: 1,
            enabled: false,
            name: "Pi Camera",
            xVideoResolution: null,
            yVideoResolution: null,
            videoFps: null,
            xImageResolution: null,
            yImageResolution: null,
            imageRetentionDays: 90,
            imageRetentionSize: 5000,
            timelapseEnabled: false,
            timelapseInterval: 5,
            timelapseStartTime: null,
            timelapseEndTime: null,
          });
        });
      });

      describe("PATCH", () => {
        it("should return 200 and the updated settings", async function () {
          this.timeout(15000);
          assert.equal(app.get("cameraManager").cameraSettings.name, "Pi Camera");

          const updatedSettings = {
            enabled: true,
            name: "Updated Camera Name",
            xVideoResolution: 1280,
            yVideoResolution: 720,
            videoFps: 30,
            xImageResolution: 1920,
            yImageResolution: 1080,
            timelapseEnabled: true,
            imageRetentionDays: 7,
            imageRetentionSize: 1024,
            timelapseInterval: 60,
            timelapseStartTime: "08:00",
            timelapseEndTime: "20:00",
          };

          const response = await request(server)
            .patch("/api/v2/camera/settings")
            .send(updatedSettings)
            .expect(200);

          const content = response.body["content"];
          validateMiddlewareValues(response);

          assert.containsAllKeys(content.data, cameraSettingsKeys);
          assert.equal(app.get("cameraManager").cameraSettings.name, "Updated Camera Name");
        });
      });
    });

    describe("Stream", () => {
      describe("GET", () => {
        it("should return 200 and a stream", async () => {
          const cameraManager = app.get("cameraManager") as CameraManager;
          const frameBuffer = new FrameBuffer({ logger: app.get("logger") });
          const getFrameBufferStub = sinon
            .stub(cameraManager, "getFrameBuffer")
            .returns(frameBuffer);

          try {
            await new Promise<void>((resolve, reject) => {
              let settled = false;
              const req = httpGet("http://127.0.0.1:3000/api/v2/camera/stream", (res) => {
                try {
                  assert.equal(res.statusCode, 200);
                  assert.equal(
                    res.headers["content-type"],
                    "multipart/x-mixed-replace; boundary=FRAME",
                  );
                } catch (error) {
                  clearTimeout(timeout);
                  settled = true;
                  req.destroy();
                  reject(error);
                  return;
                }

                res.once("data", () => {
                  if (settled) {
                    return;
                  }
                  settled = true;
                  clearTimeout(timeout);
                  req.destroy();
                  resolve();
                });
                res.once("error", (streamError: Error) => {
                  if (settled) {
                    return;
                  }
                  settled = true;
                  clearTimeout(timeout);
                  clearInterval(waitForSubscriberInterval);
                  req.destroy();
                  reject(streamError);
                });
              });
              const timeout = setTimeout(() => {
                if (settled) {
                  return;
                }
                settled = true;
                clearInterval(waitForSubscriberInterval);
                req.destroy();
                reject(new Error("Stream did not send data within timeout period"));
              }, 300);
              const waitForSubscriberInterval = setInterval(() => {
                if (settled || frameBuffer.getSubscriberCount() === 0) {
                  return;
                }

                clearInterval(waitForSubscriberInterval);
                frameBuffer.getStream().write(Buffer.from("test-stream-chunk"));
              }, 5);

              req.on("error", (err) => {
                if (
                  settled &&
                  (err.message.includes("aborted") || err.message.includes("socket hang up"))
                ) {
                  return;
                }
                if (!settled) {
                  settled = true;
                  clearTimeout(timeout);
                  clearInterval(waitForSubscriberInterval);
                  reject(err);
                }
              });
            });
          } finally {
            getFrameBufferStub.restore();
          }
        });

        // This test doesn't _really_ test the reconnect endpoint, but it at least ensures that the endpoint is hit and returns a 200
        it("should return a 200 after reconnecting to the livestream server", async () => {
          const cameraManager = app.get("cameraManager") as CameraManager;
          const reconnectStub = sinon
            .stub(cameraManager, "reconnectLivestreamAsync")
            .resolves(true);

          try {
            const response = await request(server).post("/api/v2/camera/reconnect").expect(200);

            validateMiddlewareValues(response);
            assert.isTrue(reconnectStub.calledOnce);
            assert.equal(response.body.content.data, "Livestream successfully reconnected");
          } finally {
            reconnectStub.restore();
          }
        });
      });
    });
  });

  describe("Latest Image", () => {
    describe("GET", () => {
      it("should return 200 and the latest image", async () => {
        const response = await request(server).get("/api/v2/camera/latest-image").expect(200);
        validateMiddlewareValues(response);
        assert.equal(response.headers["content-type"], "image/jpeg");
        assert.isNotNull(response.body);
      });
    });
  });

  describe("Timelapse", () => {
    describe("Archive", () => {
      describe("GET", () => {
        it("should return 200 and the archive file", async () => {
          const response = await request(server)
            .get("/api/v2/camera/timelapse/archive")
            .expect(200);
          validateMiddlewareValues(response);
          assert.equal(response.headers["content-type"], "application/x-tar");
          assert.isNotNull(response.body);
        });
      });
    });

    describe("Regenerate", () => {
      describe("POST", () => {
        it("should return 202 and queue archive regeneration", async () => {
          const response = await request(server)
            .post("/api/v2/camera/timelapse/archive/regenerate")
            .expect(202);
          validateMiddlewareValues(response);
          assert.equal(response.body["content"].data, "Timelapse archive regeneration queued.");
        });
      });
    });

    describe("Status", async () => {
      describe("GET", async () => {
        it("should return 200 and the timelapse generation status", async () => {
          const response = await request(server)
            .get("/api/v2/camera/timelapse/archive/status")
            .expect(200);
          validateMiddlewareValues(response);
          assert.isBoolean(response.body["content"].data.isGenerating);
          assert.isNumber(response.body["content"].data.archiveProgress);
        });
      });
    });

    describe("Clear All Images", () => {
      describe("DELETE", () => {
        it("should return 200 and clear all timelapse images", async () => {
          let attempts = 0;
          while (
            (app.get("cameraManager") as CameraManager).getTimelapseArchiveProgress()
              .isGenerating &&
            attempts < 5
          ) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          let imageCount = await fs.promises.readdir("images/timelapse");
          assert.isAbove(imageCount.length, 0, "There should be images to clear for this test");
          const response = await request(server)
            .delete("/api/v2/camera/timelapse/images")
            .expect(200);
          validateMiddlewareValues(response);
          imageCount = await fs.promises.readdir("images/timelapse");
          assert.equal(imageCount.length, 0, "All images should be cleared");
          assert.equal(response.body["content"].data, "All images cleared successfully");
        });
      });
    });
  });

  describe("System Routes", async () => {
    describe("Status", async () => {
      describe("GET", async () => {
        it("should return 200 and system status", async () => {
          // Sometimes this test will happen too quickly for the previously called timelape generation
          // request to actuall generate a timelapse, causing this test to fail.
          let retryCount = 0;
          let timelapseCompletion = await request(server).get(
            "/api/v2/camera/timelapse/archive/status",
          );
          while (timelapseCompletion.body["content"].data.isGenerating && retryCount < 5) {
            try {
              await new Promise((resolve) => setTimeout(resolve, 100));
              timelapseCompletion = await request(server).get(
                "/api/v2/camera/timelapse/archive/status",
              );
            } catch (err) {
              // If the request fails, log the error and break the loop to avoid an infinite retry
              console.error("Error checking timelapse status:", err);
              break;
            }
            retryCount++;
          }
          const response = await request(server).get("/api/v2/system/status").expect(200);
          validateMiddlewareValues(response);

          const data = response.body["content"].data;
          assert.equal(countLeafProperties(data), 14);

          assert.isNumber(data.process.uptime);
          assert.isNumber(data.process.memoryUsage);
          assert.isNumber(data.process.heapUsage);
          assert.isNumber(data.process.cpuUsage);
          assert.isNumber(data.database.size);
          assert.isNumber(data.database.connectionsUsed);
          assert.isNumber(data.database.connectionsFree);
          assert.isNumber(data.database.pendingAcquires);
          assert.isNumber(data.database.pendingCreates);
          assert.isNumber(data.system.totalDiskSize);
          assert.isNumber(data.system.freeDiskSize);
          assert.isNumber(data.timelapse.directorySize);
          assert.isTrue(
            data.timelapse.lastArchiveGenerationDuration === null ||
              typeof data.timelapse.lastArchiveGenerationDuration === "number",
          );
        });
      });
    });
    describe("Backups", async () => {
      describe("list", async () => {
        describe("GET", async () => {
          it("should return 200 and a list of backups", async () => {
            const response = await request(server).get("/api/v2/system/backups").expect(200);
            const data = response.body["content"].data;
            validateMiddlewareValues(response);

            assert.isArray(data);
          });
        });
      });
      describe("create", async () => {
        describe("POST", async () => {
          it("should return 202 and queue a backup creation", async () => {
            const response = await request(server)
              .post("/api/v2/system/backups/create")
              .expect(202);
            const data = response.body["content"].data;
            validateMiddlewareValues(response);

            assert.equal(data, "Backup creation queued.");
          });
        });
      });
      describe("status", async () => {
        describe("GET", async () => {
          it("should return 200 and the backup status", async () => {
            const response = await request(server)
              .get("/api/v2/system/backups/create/status")
              .expect(200);
            const data = response.body["content"].data;
            validateMiddlewareValues(response);

            assert.isBoolean(data.isGeneratingBackup);
          });
        });
      });
      describe("download", async () => {
        describe("GET", async () => {
          it("should return 200 and the backup file", async () => {
            let response = await request(server).get("/api/v2/system/backups").expect(200);
            const data = response.body["content"].data;
            validateMiddlewareValues(response);
            assert.isNotEmpty(data);

            response = await request(server)
              .get(`/api/v2/system/backups/download/${data[0]}`)
              .expect(200);
            validateMiddlewareValues(response);

            assert.equal(response.headers["content-type"], "application/octet-stream");
            assert.isString(response.headers["content-length"]);
            assert.isNotNull(response.body);
          });
        });
      });
    });
  });

  describe("Settings Routes", async () => {
    describe("GET", async () => {
      it("should return 200 with all 6 settings", async () => {
        const response = await request(server).get("/api/v2/settings").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.isObject(content.data);
        assert.equal(Object.keys(content.data).length, 6);
        assert.exists(content.data["sensors.data_retention"]);
        assert.exists(content.data["outputs.data_retention"]);
        assert.exists(content.data["system.backup_retention"]);
        assert.strictEqual(content.data["system.log_debug"], false);
        assert.containsAllKeys(content.data, ["system.latitude", "system.longitude"]);
      });
    });

    describe("PATCH", async () => {
      it("should return 200 with updated settings", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({ "sensors.data_retention": "45 days" })
          .expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.equal(content.data["sensors.data_retention"], "45 days");
      });

      it("should return 200 with multiple updated settings", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({
            "sensors.data_retention": "45 days",
            "outputs.data_retention": "90 days",
          })
          .expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.equal(Object.keys(content.data).length, 2);
      });

      it("should return 400 for unknown key", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({ "unknown.key": "value" })
          .expect(400);
        validateMiddlewareValues(response);
        assert.include(response.body.error.details[0], "Unknown setting key: unknown.key");
      });

      it("should return 400 for type mismatch", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({ "sensors.data_retention": 123 })
          .expect(400);
        validateMiddlewareValues(response);
        assert.include(response.body.error.details[0], "expected string or null");
        assert.include(response.body.error.details[0], "got number");
      });

      it("should accept boolean updates for system.log_debug", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({ "system.log_debug": true })
          .expect(200);

        validateMiddlewareValues(response);
        assert.strictEqual(response.body.content.data["system.log_debug"], true);
      });

      it("should return 200 for null value", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({ "sensors.data_retention": null })
          .expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.equal(content.data["sensors.data_retention"], null);
      });

      it("should return 400 for invalid body (array)", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send(["not", "an", "object"])
          .expect(400);
        validateMiddlewareValues(response);
        assert.include(response.body.error.details[0], "Request body must be a JSON object");
      });

      it("should return 200 with empty body (no keys to update)", async () => {
        const response = await request(server).patch("/api/v2/settings").send({}).expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.deepEqual(content.data, {});
      });

      it("should accept valid latitude and longitude settings", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({
            "system.latitude": "40.7128",
            "system.longitude": "-74.0060",
          })
          .expect(200);

        validateMiddlewareValues(response);
        assert.equal(response.body.content.data["system.latitude"], "40.7128");
        assert.equal(response.body.content.data["system.longitude"], "-74.0060");
      });

      it("should reject an out-of-range latitude", async () => {
        const response = await request(server)
          .patch("/api/v2/settings")
          .send({
            "system.latitude": "91",
          })
          .expect(400);

        validateMiddlewareValues(response);
        assert.include(response.body.error.details[0], "must be between -90 and 90");
      });
    });
  });

  describe("Log Stream Routes", () => {
    describe("GET /api/v2/system/logs/stream", () => {
      it("should return 200 with SSE headers", async () => {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const req = httpGet("http://127.0.0.1:3000/api/v2/system/logs/stream", (res) => {
            try {
              assert.equal(res.statusCode, 200);
              assert.equal(res.headers["content-type"], "text/event-stream; charset=utf-8");
              assert.equal(res.headers["cache-control"], "no-cache");
              assert.equal(res.headers["connection"], "keep-alive");
            } catch (error) {
              clearTimeout(timeout);
              settled = true;
              req.destroy();
              reject(error);
              return;
            }

            res.once("data", () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              req.destroy();
              resolve();
            });
          });
          const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            req.destroy();
            reject(new Error("Log stream did not respond within timeout period"));
          }, 300);
          req.on("error", (err) => {
            if (
              settled &&
              (err.message.includes("aborted") || err.message.includes("socket hang up"))
            ) {
              return;
            }
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              reject(err);
            }
          });
        });
      });

      it("should send history events", async () => {
        const received: string[] = [];
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const req = httpGet("http://127.0.0.1:3000/api/v2/system/logs/stream", (res) => {
            try {
              assert.equal(res.statusCode, 200);
            } catch (error) {
              clearTimeout(timeout);
              settled = true;
              req.destroy();
              reject(error);
              return;
            }

            res.on("data", (chunk: Buffer) => {
              const lines = chunk.toString().split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const payload = JSON.parse(line.slice(6));
                  received.push(payload.message);
                  if (settled) return;
                  settled = true;
                  clearTimeout(timeout);
                  req.destroy();
                  resolve();
                }
              }
            });
          });
          const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            req.destroy();
            reject(new Error("Log stream did not send data within timeout period"));
          }, 300);
          req.on("error", (err) => {
            if (
              settled &&
              (err.message.includes("aborted") || err.message.includes("socket hang up"))
            ) {
              return;
            }
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              reject(err);
            }
          });
        });

        // History events should have been sent
        assert.isAbove(received.length, 0, "Should have received history events");
      });
    });
  });

  describe("Journal Tag Routes", () => {
    let createdId: number;

    describe("POST", () => {
      it("should return 201 and create a journal tag", async () => {
        const response = await request(server)
          .post("/api/v2/tags/journals")
          .send({ name: "APITest Journal Tag", color: "#ff0000" })
          .expect(201);

        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 3);
        assert.containsAllKeys(content.data, ["id", "name", "color"]);
        assert.isNumber(content.data.id);
        assert.equal(content.data.name, "APITest Journal Tag");
        assert.equal(content.data.color, "#ff0000");
        createdId = content.data.id;
      });
    });

    describe("GET", () => {
      it("should return 200 and list journal tags", async () => {
        const response = await request(server).get("/api/v2/tags/journals").expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const found = content.data.find((t: any) => t.id === createdId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found), 3);
        assert.deepInclude(found, {
          id: createdId,
          name: "APITest Journal Tag",
          color: "#ff0000",
        });
      });
    });

    describe("PATCH", () => {
      it("should return 200 and update a journal tag", async () => {
        const response = await request(server)
          .patch(`/api/v2/tags/journals/${createdId}`)
          .send({ name: "APITest Journal Tag Updated", color: "#00ff00" })
          .expect(200);

        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 3);
        assert.containsAllKeys(content.data, ["id", "name", "color"]);
        assert.equal(content.data.id, createdId);
        assert.equal(content.data.name, "APITest Journal Tag Updated");
        assert.equal(content.data.color, "#00ff00");
      });
    });

    describe("DELETE", () => {
      it("should return 200 and delete a journal tag", async () => {
        const deleteResponse = await request(server)
          .delete(`/api/v2/tags/journals/${createdId}`)
          .expect(200);
        validateMiddlewareValues(deleteResponse);
        assert.equal(deleteResponse.body.content.data, `Journal tag with ID ${createdId} deleted.`);

        const list = await request(server).get("/api/v2/tags/journals").expect(200);
        validateMiddlewareValues(list);
        const content = list.body["content"];
        const found = content.data.find((t: any) => t.id === createdId);
        assert.isUndefined(found);
      });
    });
  });

  describe("Entry Tag Routes", () => {
    let createdId: number;

    describe("POST", () => {
      it("should return 201 and create an entry tag", async () => {
        const response = await request(server)
          .post("/api/v2/tags/entries")
          .send({ name: "APITest Entry Tag", color: "#abcdef" })
          .expect(201);

        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 3);
        assert.containsAllKeys(content.data, ["id", "name", "color"]);
        assert.isNumber(content.data.id);
        assert.equal(content.data.name, "APITest Entry Tag");
        assert.equal(content.data.color, "#abcdef");
        createdId = content.data.id;
      });
    });

    describe("GET", () => {
      it("should return 200 and list entry tags", async () => {
        const response = await request(server).get("/api/v2/tags/entries").expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const found = content.data.find((t: any) => t.id === createdId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found), 3);
        assert.deepInclude(found, {
          id: createdId,
          name: "APITest Entry Tag",
          color: "#abcdef",
        });
      });
    });

    describe("PATCH", () => {
      it("should return 200 and update an entry tag", async () => {
        const response = await request(server)
          .patch(`/api/v2/tags/entries/${createdId}`)
          .send({ name: "APITest Entry Tag Updated", color: "#123456" })
          .expect(200);

        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 3);
        assert.containsAllKeys(content.data, ["id", "name", "color"]);
        assert.equal(content.data.id, createdId);
        assert.equal(content.data.name, "APITest Entry Tag Updated");
        assert.equal(content.data.color, "#123456");
      });
    });

    describe("DELETE", () => {
      it("should return 200 and delete an entry tag", async () => {
        const deleteResponse = await request(server)
          .delete(`/api/v2/tags/entries/${createdId}`)
          .expect(200);
        validateMiddlewareValues(deleteResponse);
        assert.equal(
          deleteResponse.body.content.data,
          `Journal entry tag with ID ${createdId} deleted.`,
        );

        const list = await request(server).get("/api/v2/tags/entries").expect(200);
        validateMiddlewareValues(list);
        const content = list.body["content"];
        const found = content.data.find((t: any) => t.id === createdId);
        assert.isUndefined(found);
      });
    });
  });

  describe("Journal Routes", () => {
    let journalId: number;

    describe("POST", () => {
      it("should return 201 and create a journal", async () => {
        const response = await request(server)
          .post("/api/v2/journals")
          .send({ title: "API Test Journal", description: "desc", archived: false })
          .expect(201);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 9);
        assert.containsAllKeys(content.data, [
          "id",
          "title",
          "description",
          "icon",
          "color",
          "archived",
          "archivedAt",
          "createdAt",
          "editedAt",
        ]);
        assert.isNumber(content.data.id);
        assert.equal(content.data.title, "API Test Journal");
        assert.equal(content.data.description, "desc");
        assert.isFalse(content.data.archived);
        assert.isNull(content.data.icon);
        assert.isNull(content.data.color);
        assert.isNull(content.data.archivedAt);
        assert.match(content.data.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        assert.match(content.data.editedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        journalId = content.data.id;
      });
    });

    describe("GET", () => {
      it("should return 200 and list journals", async () => {
        const response = await request(server).get("/api/v2/journals").expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const found = content.data.find(
          (j: any) => (j.journal ? j.journal.id : j.id) === journalId,
        );
        assert.isObject(found);
        assert.lengthOf(Object.keys(found), 2);

        const journal = found.journal ?? found;
        assert.lengthOf(Object.keys(journal), 9);
        assert.equal(journal.id, journalId);
        assert.equal(journal.title, "API Test Journal");
        assert.equal(journal.description, "desc");
        assert.isFalse(journal.archived);
      });

      it("should return 200 and a single journal by id", async () => {
        const response = await request(server).get(`/api/v2/journals/${journalId}`).expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const first = content.data[0];
        assert.lengthOf(Object.keys(first), 2);
        const journal = first.journal ?? first;
        assert.lengthOf(Object.keys(journal), 9);
        assert.equal(journal.id, journalId);
        assert.equal(journal.title, "API Test Journal");
        assert.equal(journal.description, "desc");
        assert.isFalse(journal.archived);
      });
    });

    describe("PATCH", () => {
      it("should return 200 and update the journal", async () => {
        // include required fields per OpenAPI schema
        const getResp = await request(server).get(`/api/v2/journals/${journalId}`).expect(200);
        const existing = getResp.body.content.data[0].journal || getResp.body.content.data[0];
        const response = await request(server)
          .patch(`/api/v2/journals/${journalId}`)
          .send({ title: "API Test Journal Updated", archived: existing.archived })
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 9);
        assert.equal(content.data.id, journalId);
        assert.equal(content.data.title, "API Test Journal Updated");
        assert.equal(content.data.description, "desc");
        assert.isFalse(content.data.archived);
      });
    });

    describe("DELETE", () => {
      it("should return 200 and delete the journal", async () => {
        const deleteResponse = await request(server)
          .delete(`/api/v2/journals/${journalId}`)
          .expect(200);
        validateMiddlewareValues(deleteResponse);
        assert.equal(
          deleteResponse.body.content.data,
          `Journal with ID ${journalId} successfully deleted.`,
        );

        const list = await request(server).get("/api/v2/journals").expect(200);
        validateMiddlewareValues(list);
        const content = list.body["content"];
        const found = content.data.find(
          (j: any) => (j.journal ? j.journal.id : j.id) === journalId,
        );
        assert.isUndefined(found);
      });
    });

    describe("Tags", () => {
      let tagId: number;
      let localJournalId: number;

      it("should create a journal tag and apply it to a journal", async () => {
        const tagResp = await request(server)
          .post("/api/v2/tags/journals")
          .send({ name: "API Journal Tag", color: "#123456" })
          .expect(201);
        validateMiddlewareValues(tagResp);
        assert.lengthOf(Object.keys(tagResp.body.content.data), 3);
        tagId = tagResp.body.content.data.id;
        assert.deepInclude(tagResp.body.content.data, {
          id: tagId,
          name: "API Journal Tag",
          color: "#123456",
        });

        const jResp = await request(server)
          .post("/api/v2/journals")
          .send({ title: "Journal To Tag", archived: false })
          .expect(201);
        validateMiddlewareValues(jResp);
        assert.lengthOf(Object.keys(jResp.body.content.data), 9);
        localJournalId = jResp.body.content.data.id;
        assert.equal(jResp.body.content.data.title, "Journal To Tag");

        const tagAddResponse = await request(server)
          .put(`/api/v2/journals/${localJournalId}/tags`)
          .send({ tagId: String(tagId) })
          .expect(200);
        validateMiddlewareValues(tagAddResponse);
        assert.equal(
          tagAddResponse.body.content.data,
          `Tag with ID ${tagId} added to journal with ID ${localJournalId}.`,
        );

        const getResp = await request(server).get(`/api/v2/journals/${localJournalId}`).expect(200);
        validateMiddlewareValues(getResp);
        const journalRow = getResp.body.content.data[0];
        assert.lengthOf(Object.keys(journalRow), 2);
        assert.lengthOf(Object.keys(journalRow.journal), 9);
        assert.isArray(journalRow.tags);
        const found = journalRow.tags.find((t: any) => t.id === tagId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found), 3);
        assert.deepInclude(found, {
          id: tagId,
          name: "API Journal Tag",
          color: "#123456",
        });
      });

      it("should remove the tag from the journal", async () => {
        const deleteResponse = await request(server)
          .delete(`/api/v2/journals/${localJournalId}/tags/${tagId}`)
          .expect(200);
        validateMiddlewareValues(deleteResponse);
        assert.equal(
          deleteResponse.body.content.data,
          `Tag with ID ${tagId} removed from journal with ID ${localJournalId}.`,
        );

        const getResp = await request(server).get(`/api/v2/journals/${localJournalId}`).expect(200);
        validateMiddlewareValues(getResp);
        const journalRow = getResp.body.content.data[0];
        assert.lengthOf(Object.keys(journalRow), 2);
        assert.lengthOf(Object.keys(journalRow.journal), 9);
        assert.isArray(journalRow.tags);
        const found = journalRow.tags.find((t: any) => t.id === tagId);
        assert.isUndefined(found);
      });
    });

    describe("Entries", () => {
      let localJournalId: number;
      let localEntryId: number;

      before(async () => {
        const resp = await request(server)
          .post("/api/v2/journals")
          .send({ title: "Journal Router Entries Journal", archived: false })
          .expect(201);
        localJournalId = resp.body.content.data.id;
      });

      describe("POST", () => {
        it("should return 201 and create an entry via journal router", async () => {
          const response = await request(server)
            .post(`/api/v2/journals/${localJournalId}/entries`)
            .send({ content: "Journal Router Entry content", title: "JR Entry" })
            .expect(201);
          validateMiddlewareValues(response);
          const content = response.body.content;
          assert.lengthOf(Object.keys(content.data), 6);
          assert.containsAllKeys(content.data, ["id", "journalId", "content", "createdAt"]);
          assert.equal(content.data.title, "JR Entry");
          assert.equal(content.data.journalId, localJournalId);
          assert.equal(content.data.content, "Journal Router Entry content");
          assert.match(content.data.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          assert.match(content.data.editedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          localEntryId = content.data.id;
        });
      });

      describe("GET", () => {
        it("should return 200 and list entries for the journal via journal router", async () => {
          const response = await request(server)
            .get(`/api/v2/journals/${localJournalId}/entries`)
            .expect(200);
          validateMiddlewareValues(response);
          const content = response.body.content;
          assert.isArray(content.data);
          const found = content.data.find((e: any) => e.entry.id === localEntryId);
          assert.isObject(found);
          assert.lengthOf(Object.keys(found.entry), 6);
          assert.equal(found.entry.journalId, localJournalId);
          assert.equal(found.entry.title, "JR Entry");
          assert.equal(found.entry.content, "Journal Router Entry content");
        });
      });
    });
  });

  describe("Entry Routes", () => {
    let journalId: number;
    let entryId: number;

    before(async () => {
      // create a journal to hold entries (satisfy OpenAPI schema)
      const resp = await request(server)
        .post("/api/v2/journals")
        .send({ title: "Entries Journal", archived: false })
        .expect(201);
      journalId = resp.body.content.data.id;
    });

    describe("POST", () => {
      it("should return 201 and create an entry", async () => {
        const response = await request(server)
          .post(`/api/v2/journals/${journalId}/entries`)
          .send({ content: "Entry content", title: "Entry Title" })
          .expect(201);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.lengthOf(Object.keys(content.data), 6);
        assert.containsAllKeys(content.data, ["id", "journalId", "content", "createdAt"]);
        assert.equal(content.data.journalId, journalId);
        assert.equal(content.data.title, "Entry Title");
        assert.equal(content.data.content, "Entry content");
        assert.match(content.data.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        assert.match(content.data.editedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        entryId = content.data.id;
      });
    });

    describe("GET", () => {
      it("should return 200 and list entries for a journal", async () => {
        const response = await request(server)
          .get(`/api/v2/journals/${journalId}/entries`)
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const found = content.data.find((e: any) => e.entry.id === entryId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found.entry), 6);
        assert.equal(found.entry.journalId, journalId);
        assert.equal(found.entry.title, "Entry Title");
        assert.equal(found.entry.content, "Entry content");
      });

      it("should return 200 and list entries for a journal (no content in response)", async () => {
        const response = await request(server)
          .get(`/api/v2/journals/${journalId}/entries?withContent=false`)
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        const found = content.data.find((e: any) => e.entry.id === entryId);
        assert.isObject(found);
        assert.lengthOf(Object.keys(found.entry), 5);
        assert.equal(found.entry.journalId, journalId);
        assert.equal(found.entry.title, "Entry Title");
        assert.isUndefined(found.entry.content);
      });

      it("should return 200 and a single entry by id", async () => {
        const response = await request(server).get(`/api/v2/entries/${entryId}`).expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        assert.lengthOf(Object.keys(content.data[0].entry), 6);
        assert.equal(content.data[0].entry.id, entryId);
        assert.equal(content.data[0].entry.journalId, journalId);
        assert.equal(content.data[0].entry.title, "Entry Title");
        assert.equal(content.data[0].entry.content, "Entry content");
      });

      it("should return 200 and a single entry by id (no content property with response)", async () => {
        const response = await request(server)
          .get(`/api/v2/entries/${entryId}?withContent=false`)
          .expect(200);
        validateMiddlewareValues(response);
        const content = response.body["content"];
        assert.isArray(content.data);
        assert.lengthOf(Object.keys(content.data[0].entry), 5);
        assert.equal(content.data[0].entry.id, entryId);
        assert.equal(content.data[0].entry.journalId, journalId);
        assert.equal(content.data[0].entry.title, "Entry Title");
        assert.isUndefined(content.data[0].entry.content);
      });

      describe("PATCH", () => {
        it("should return 200 and update the entry", async () => {
          const response = await request(server)
            .patch(`/api/v2/entries/${entryId}`)
            .send({ text: true, content: "Updated content", title: "Updated Title" })
            .expect(200);
          validateMiddlewareValues(response);
          const content = response.body["content"];
          assert.lengthOf(Object.keys(content.data), 6);
          assert.equal(content.data.id, entryId);
          assert.equal(content.data.journalId, journalId);
          assert.equal(content.data.title, "Updated Title");
          assert.equal(content.data.content, "Updated content");
        });
      });

      describe("DELETE", () => {
        it("should return 200 and delete the entry", async () => {
          const deleteResponse = await request(server)
            .delete(`/api/v2/entries/${entryId}`)
            .expect(200);
          validateMiddlewareValues(deleteResponse);
          assert.equal(
            deleteResponse.body.content.data,
            `Journal Entry with ID ${entryId} successfully deleted.`,
          );

          const resp = await request(server)
            .get(`/api/v2/journals/${journalId}/entries`)
            .expect(200);
          validateMiddlewareValues(resp);
          const content = resp.body["content"];
          const found = content.data.find((e: any) => e.id === entryId);
          assert.isUndefined(found);
        });
      });

      describe("Tags", () => {
        let localEntryId: number;
        let entryTagId: number;

        it("should create an entry tag and apply it to an entry", async () => {
          // create a tag for entries
          const tagResp = await request(server)
            .post("/api/v2/tags/entries")
            .send({ name: "API Entry Tag", color: "#654321" })
            .expect(201);
          validateMiddlewareValues(tagResp);
          assert.lengthOf(Object.keys(tagResp.body.content.data), 3);
          entryTagId = tagResp.body.content.data.id;
          assert.deepInclude(tagResp.body.content.data, {
            id: entryTagId,
            name: "API Entry Tag",
            color: "#654321",
          });

          // create an entry to tag
          const eResp = await request(server)
            .post(`/api/v2/journals/${journalId}/entries`)
            .send({ content: "Entry to Tag", title: "Tagged Entry" })
            .expect(201);
          validateMiddlewareValues(eResp);
          assert.lengthOf(Object.keys(eResp.body.content.data), 6);
          localEntryId = eResp.body.content.data.id;
          assert.equal(eResp.body.content.data.title, "Tagged Entry");
          assert.equal(eResp.body.content.data.content, "Entry to Tag");

          // add the tag to the entry
          const tagAddResponse = await request(server)
            .put(`/api/v2/entries/${localEntryId}/tags`)
            .send({ tagId: String(entryTagId) })
            .expect(200);
          validateMiddlewareValues(tagAddResponse);
          assert.equal(
            tagAddResponse.body.content.data,
            `Tag with ID ${entryTagId} successfully added to Journal Entry with ID ${localEntryId}.`,
          );

          // verify tag present on entry
          const getResp = await request(server).get(`/api/v2/entries/${localEntryId}`).expect(200);
          validateMiddlewareValues(getResp);
          const row = getResp.body.content.data[0];
          assert.lengthOf(Object.keys(row.entry), 6);
          assert.isArray(row.tags);
          const found = row.tags.find((t: any) => t.id === entryTagId);
          assert.isObject(found);
          assert.lengthOf(Object.keys(found), 3);
          assert.deepInclude(found, {
            id: entryTagId,
            name: "API Entry Tag",
            color: "#654321",
          });
        });

        it("should remove the tag from the entry", async () => {
          const deleteResponse = await request(server)
            .delete(`/api/v2/entries/${localEntryId}/tags/${entryTagId}`)
            .expect(200);
          validateMiddlewareValues(deleteResponse);
          assert.equal(
            deleteResponse.body.content.data,
            `Tag with ID ${entryTagId} successfully removed from Journal Entry with ID ${localEntryId}.`,
          );

          const getResp = await request(server).get(`/api/v2/entries/${localEntryId}`).expect(200);
          validateMiddlewareValues(getResp);
          const row = getResp.body.content.data[0];
          assert.lengthOf(Object.keys(row.entry), 6);
          assert.isArray(row.tags);
          const found = row.tags.find((t: any) => t.id === entryTagId);
          assert.isUndefined(found);
        });
      });
    });

    describe("Subcontroller Routes", async () => {
      describe("GET", async () => {
        it("should return 200 and a record of subcontrollers", async () => {
          const response = await request(server).get("/api/v2/subcontrollers").expect(200);
          const data = response.body["content"].data;
          validateMiddlewareValues(response);

          assert.isArray(data.unrecognized);
          assert.isArray(data.recognized);
        });
      });

      describe("POST", async () => {
        it("should return a 204 and add a subcontroller to the database", async () => {
          let subcontrollers = await app.get("sprootDB").subcontrollers.getAllAsync();
          assert.isEmpty(subcontrollers);
          await request(server)
            .post("/api/v2/subcontrollers")
            .send({
              name: "Test Device",
              hostName: "sproot-device-8af4.local",
            })
            .expect(201);

          subcontrollers = await app.get("sprootDB").subcontrollers.getAllAsync();
          assert.lengthOf(subcontrollers, 1);
          assert.equal(subcontrollers[0].id, 1);
          assert.equal(subcontrollers[0].name, "Test Device");
          assert.equal(subcontrollers[0].hostName, "sproot-device-8af4.local");
          assert.equal(subcontrollers[0].type, "ESP32");
          assert.isString(subcontrollers[0].secureToken);
        });
      });

      describe("GET connection-status", async () => {
        it("should return 200 and the connection status of the provided subcontroller", async () => {
          const response = await request(server)
            .get("/api/v2/subcontrollers/1/connection-status")
            .expect(200);
          const data = response.body["content"].data;
          validateMiddlewareValues(response);

          assert.isFalse(data["online"]);
          assert.isUndefined(data["version"]);
        });
      });

      describe("PATCH", async () => {
        it("should return a 200 and update a subcontroller in the database", async () => {
          let subcontrollers = await app.get("sprootDB").subcontrollers.getAllAsync();
          const secureToken = subcontrollers[0].secureToken;
          assert.lengthOf(subcontrollers, 1);
          assert.equal(subcontrollers[0].name, "Test Device");

          await request(server)
            .patch("/api/v2/subcontrollers/1")
            .send({
              name: "Updated Test Device",
            })
            .expect(200);

          subcontrollers = await app.get("sprootDB").subcontrollers.getAllAsync();
          assert.lengthOf(subcontrollers, 1);
          assert.equal(subcontrollers[0].name, "Updated Test Device");
          assert.equal(subcontrollers[0].hostName, "sproot-device-8af4.local");
          assert.equal(subcontrollers[0].type, "ESP32");
          assert.equal(subcontrollers[0].secureToken, secureToken);
        });
      });

      describe("DELETE", async () => {
        it("should return a 200 and delete a subcontroller from the database", async () => {
          let subcontrollers = await app.get("sprootDB").subcontrollers.getAllAsync();
          assert.lengthOf(subcontrollers, 1);

          await request(server).delete("/api/v2/subcontrollers/1").expect(200);

          subcontrollers = await app.get("sprootDB").subcontrollers.getAllAsync();
          assert.lengthOf(subcontrollers, 0);
        });
      });

      describe("Firmware Routes", async () => {
        describe("ESP32", async () => {
          describe("Manifest", async () => {
            describe("GET", async () => {
              it("should return 200 and firmware info", async () => {
                const response = await request(server)
                  .get("/api/v2/subcontrollers/firmware/esp32/manifest")
                  .expect(200);
                const data = response.body["content"].data;
                validateMiddlewareValues(response);

                assert.containsAllKeys(data, ["version", "path", "sha256"]);
              });
            });
          });
          describe("Bootloader", async () => {
            describe("GET", async () => {
              it("should return 200 and esp32 bootloader binary", async () => {
                const response = await request(server)
                  .get("/api/v2/subcontrollers/firmware/esp32/bootloader")
                  .expect(200);
                validateMiddlewareValues(response);

                assert.equal(response.headers["content-type"], "application/octet-stream");
                assert.isNotNull(response.body);
              });
            });
          });
          describe("Partitions", async () => {
            describe("GET", async () => {
              it("should return 200 and esp32 partition binary", async () => {
                const response = await request(server)
                  .get("/api/v2/subcontrollers/firmware/esp32/partitions")
                  .expect(200);
                validateMiddlewareValues(response);

                assert.equal(response.headers["content-type"], "application/octet-stream");
                assert.isNotNull(response.body);
              });
            });
          });
          describe("Binary", async () => {
            describe("GET", async () => {
              it("should return 200 and esp32 application binary", async () => {
                const response = await request(server)
                  .get("/api/v2/subcontrollers/firmware/esp32/application")
                  .expect(200);
                validateMiddlewareValues(response);

                assert.equal(response.headers["content-type"], "application/octet-stream");
                assert.isNotNull(response.body);
              });
            });
          });
          describe("Binary", async () => {
            describe("GET", async () => {
              it("should return 200 and esp32 firmware binary", async () => {
                const response = await request(server)
                  .get("/api/v2/subcontrollers/firmware/esp32/binary")
                  .expect(200);
                validateMiddlewareValues(response);

                assert.equal(response.headers["content-type"], "application/octet-stream");
                assert.isNotNull(response.body);
              });
            });
          });
        });
      });
    });
  });
});

function countLeafProperties(obj: unknown): number {
  if (obj === null) return 1;

  if (typeof obj !== "object") {
    return 1;
  }

  let count = 0;
  for (const key in obj as Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      count += countLeafProperties((obj as Record<string, unknown>)[key]);
    }
  }
  return count;
}
