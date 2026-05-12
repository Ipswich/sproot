import { assert } from "chai";
import request from "supertest";

import { validateMiddlewareValues } from "../../utils";
import { app, server } from "../../setup";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

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
  ];
  const stateKeys = ["controlMode", "logTime", "value"];
  let createdOutputId: number | undefined;

  async function removeStrayTestOutputsAsync(): Promise<void> {
    const outputList = app.get("outputList");
    const sprootDB = app.get("sprootDB");
    const strayOutputIds = Object.values(outputList.outputs)
      .filter((output: any) => output.name === "Test Output" || output.name === "Test1 Output")
      .map((output: any) => output.id as number);

    for (const outputId of strayOutputIds) {
      await sprootDB.deleteOutputAsync(outputId);
    }

    if (strayOutputIds.length > 0) {
      await outputList.regenerateAsync();
    }
  }

  before(async () => {
    await app.get("outputList").regenerateAsync();
    await removeStrayTestOutputsAsync();
  });

  describe("Outputs", async () => {
    describe("GET", async () => {
      it("should return 200 and all outputs", async () => {
        const initialOutputCount = Object.keys(app.get("outputList").outputs).length;
        const response = await request(server).get("/api/v2/outputs").expect(200);
        const content = response.body["content"];

        validateMiddlewareValues(response);
        assert.lengthOf(content.data, initialOutputCount);
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

      it("should preserve non-numeric output IDs as not found", async () => {
        const response = await request(server).get("/api/v2/outputs/not-a-number").expect(404);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Not Found");
        assert.equal(response.body["error"]["url"], "/api/v2/outputs/not-a-number");
        assert.deepEqual(response.body["error"]["details"], [
          "Output with ID not-a-number not found.",
        ]);
      });
    });

    describe("Create, Update, Delete", async () => {
      describe("POST", async () => {
        it("should return 201", async () => {
          const initialOutputCount = Object.keys(app.get("outputList").outputs).length;
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
          createdOutputId = response.body["content"]["data"]["id"];
          assert.isNumber(createdOutputId);
          await app.get("outputList").regenerateAsync();
          assert.lengthOf(Object.keys(app.get("outputList").outputs), initialOutputCount + 1);
        });

        it("should reject missing required fields through contract middleware", async () => {
          const response = await request(server)
            .post("/api/v2/outputs")
            .send({ model: "PCA9685" })
            .expect(400);

          assertContractBadRequest(response, "/api/v2/outputs", { model: "PCA9685" });
        });

        it("should reject invalid scalar types through contract middleware", async () => {
          const invalidBody = {
            model: "PCA9685",
            address: "0x40",
            name: "Invalid Output",
            pin: "0",
            isPwm: "true",
            isInvertedPwm: false,
            color: "#82c91e",
            automationTimeout: 1,
          };

          const response = await request(server)
            .post("/api/v2/outputs")
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, "/api/v2/outputs", invalidBody);
        });
      });

      describe("PATCH", async () => {
        it("should return 200", async () => {
          assert.isNumber(createdOutputId);
          assert.equal(app.get("outputList").outputs[String(createdOutputId)]?.name, "Test Output");
          const response = await request(server)
            .patch(`/api/v2/outputs/${createdOutputId}`)
            .send({
              name: "Test1 Output",
            })
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.equal(
            app.get("outputList").outputs[String(createdOutputId)]?.name,
            "Test1 Output",
          );
          assert.containsAllKeys(content.data, outputKeys);
        });

        it("should reject malformed bodies through contract middleware", async () => {
          assert.isNumber(createdOutputId);
          const invalidBody: unknown[] = [];
          const response = await request(server)
            .patch(`/api/v2/outputs/${createdOutputId}`)
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, `/api/v2/outputs/${createdOutputId}`, invalidBody);
        });

        it("should reject invalid output IDs through remaining handler logic", async () => {
          const response = await request(server)
            .patch("/api/v2/outputs/not-a-number")
            .send({ name: "Ignored" })
            .expect(400);

          validateMiddlewareValues(response);
          assert.equal(response.body["error"]["name"], "Bad Request");
          assert.equal(response.body["error"]["url"], "/api/v2/outputs/not-a-number");
          assert.deepEqual(response.body["error"]["details"], ["Invalid or missing output ID."]);
        });
      });

      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.isNumber(createdOutputId);
          const initialOutputCount = Object.keys(app.get("outputList").outputs).length;
          const response = await request(server)
            .delete(`/api/v2/outputs/${createdOutputId}`)
            .expect(200);
          validateMiddlewareValues(response);
          assert.lengthOf(Object.keys(app.get("outputList").outputs), initialOutputCount - 1);
          createdOutputId = undefined;
        });
      });
    });
  });

  describe("ChartData", async () => {
    describe("GET", async () => {
      it("should return 200", async () => {
        const response = await request(server).get("/api/v2/outputs/chart-data").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["data", "series"]);
        assert.containsAllKeys(content.data.series[0], ["name", "color"]);
        assert.lengthOf(content.data.data, 2016);
      });

      it("should return 200 and the latest data", async () => {
        const response = await request(server)
          .get("/api/v2/outputs/chart-data?latest=true")
          .expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["data", "series"]);
        assert.containsAllKeys(content.data.series[0], ["name", "color"]);
        assert.lengthOf(content.data.data, 1);
      });

      it("should preserve non-latest string query behavior", async () => {
        const response = await request(server)
          .get("/api/v2/outputs/chart-data?latest=false")
          .expect(200);
        const content = response.body["content"];

        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["data", "series"]);
        assert.containsAllKeys(content.data.series[0], ["name", "color"]);
        assert.lengthOf(content.data.data, 2016);
      });
    });
  });

  describe("SupportedModels", async () => {
    describe("AvailableDevices", async () => {
      describe("GET", async () => {
        it("should return 200 for available devices", async () => {
          const response = await request(server)
            .get("/api/v2/outputs/available-devices/PCA9685")
            .expect(200);
          const content = response.body["content"];

          validateMiddlewareValues(response);
          assert.isArray(content.data);
        });

        it("should reject invalid filterUsed query values through contract middleware", async () => {
          const response = await request(server)
            .get("/api/v2/outputs/available-devices/TPLINK_SMART_PLUG?filterUsed=not-a-bool")
            .expect(400);

          validateMiddlewareValues(response);
          assert.equal(response.body["error"]["name"], "Bad Request");
          assert.equal(
            response.body["error"]["url"],
            "/api/v2/outputs/available-devices/TPLINK_SMART_PLUG?filterUsed=not-a-bool",
          );
          assert.deepEqual(response.body["error"]["request"]["query"], {
            filterUsed: "not-a-bool",
          });
          assert.isArray(response.body["error"]["details"]);
          assert.isNotEmpty(response.body["error"]["details"]);
        });
      });
    });

    describe("GET", async () => {
      it("should return 200", async () => {
        const response = await request(server).get("/api/v2/outputs/supported-models").expect(200);
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
  });
});

describe("Output State Routes", async () => {
  describe("Control Mode", async () => {
    describe("PUT", async () => {
      it("should return 200", async () => {
        const initialControlMode = app.get("outputList").outputs["1"].state.controlMode;
        const targetControlMode = initialControlMode === "manual" ? "automatic" : "manual";
        const response = await request(server)
          .put("/api/v2/outputs/1/control-mode")
          .send({
            controlMode: targetControlMode,
          })
          .expect(200);
        validateMiddlewareValues(response);
        assert.equal(app.get("outputList").outputs["1"].state.controlMode, targetControlMode);
      });

      it("should reject invalid enum values through contract middleware", async () => {
        const invalidBody = { controlMode: "invalid" };
        const response = await request(server)
          .put("/api/v2/outputs/1/control-mode")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/outputs/1/control-mode", invalidBody);
      });
    });
  });

  describe("Manual State", async () => {
    describe("PUT", async () => {
      it("should return 200", async () => {
        const initialManualValue = app.get("outputList").outputs["1"].state.manual.value;
        const targetManualValue = initialManualValue === 100 ? 0 : 100;
        const response = await request(server)
          .put("/api/v2/outputs/1/manual-state")
          .send({
            value: targetManualValue,
          })
          .expect(200);
        validateMiddlewareValues(response);
        assert.equal(app.get("outputList").outputs["1"].state.manual.value, targetManualValue);
      });

      it("should reject invalid scalar types through contract middleware", async () => {
        const invalidBody = { value: "100" };
        const response = await request(server)
          .put("/api/v2/outputs/1/manual-state")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/outputs/1/manual-state", invalidBody);
      });

      it("should reject out-of-range values through contract middleware", async () => {
        const invalidBody = { value: 101 };
        const response = await request(server)
          .put("/api/v2/outputs/1/manual-state")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/outputs/1/manual-state", invalidBody);
      });
    });
  });
});
