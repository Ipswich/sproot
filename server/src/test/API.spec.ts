import { assert } from "chai";
import request from "supertest";
import { validateMiddlewareValues } from "./utils";
import { app, server } from "./setup";

describe("API Tests", async () => {
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
      "isPwm",
      "isInvertedPwm",
      "color",
      "state",
      "automationTimeout",
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
          assert.deepEqual(content.data, ["PCA9685"]);
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
        assert.containsAllKeys(content.data[0], ["id", "name", "operator"]);
        assert.containsAllKeys(content.data[1], ["id", "name", "operator"]);
      });

      it("should return 200 and a single automation", async () => {
        const response = await request(server).get("/api/v2/automations/1").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["id", "name", "operator"]);
      });
    });

    describe("Create, Update, Delete", async () => {
      describe("POST", async () => {
        it("should return 201", async () => {
          assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 2);
          await request(server)
            .post("/api/v2/automations")
            .send({
              name: "Test Automation",
              operator: "or",
            })
            .expect(201);
          assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 3);
        });
      });
      describe("PATCH", async () => {
        it("should return 200", async () => {
          assert.equal(
            (await app.get("sprootDB").getAutomationAsync(3))[0].name,
            "Test Automation",
          );
          await request(server)
            .patch("/api/v2/automations/3")
            .send({
              name: "Test1 Automation",
              operator: "and",
            })
            .expect(200);
          assert.equal(
            (await app.get("sprootDB").getAutomationAsync(3))[0].name,
            "Test1 Automation",
          );
        });
      });
      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 3);
          await request(server).delete("/api/v2/automations/3").expect(200);
          assert.lengthOf(await app.get("sprootDB").getAutomationsAsync(), 2);
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
        });
      });
      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/sensor")
              .send({
                groupType: "oneOf",
                operator: "greater",
                comparisonValue: 20,
                sensorId: 1,
                readingType: "temperature",
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").getSensorConditionsAsync(1))[2].comparisonValue,
              20,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/sensor/3")
              .send({
                comparisonValue: 30,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").getSensorConditionsAsync(1))[2].comparisonValue,
              30,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/sensor/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").getSensorConditionsAsync(1), 2);
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
            assert.lengthOf(await app.get("sprootDB").getOutputConditionsAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/output")
              .send({
                groupType: "oneOf",
                operator: "greater",
                comparisonValue: 20,
                outputId: 1,
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").getOutputConditionsAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").getOutputConditionsAsync(1))[2].comparisonValue,
              20,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/output/3")
              .send({
                comparisonValue: 30,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").getOutputConditionsAsync(1))[2].comparisonValue,
              30,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").getOutputConditionsAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/output/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").getOutputConditionsAsync(1), 2);
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
          ]);
        });
      });

      describe("Create, Update, Delete", async () => {
        describe("POST", async () => {
          it("should return 201", async () => {
            assert.lengthOf(await app.get("sprootDB").getTimeConditionsAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/time")
              .send({
                groupType: "oneOf",
                startTime: "00:00",
                endTime: "11:59",
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").getTimeConditionsAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").getTimeConditionsAsync(1))[2].startTime,
              "00:00",
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/time/3")
              .send({
                startTime: "01:00",
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").getTimeConditionsAsync(1))[2].startTime,
              "01:00",
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").getTimeConditionsAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/time/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").getTimeConditionsAsync(1), 2);
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
            assert.lengthOf(await app.get("sprootDB").getWeekdayConditionsAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/weekday")
              .send({
                groupType: "oneOf",
                weekdays: 5,
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").getWeekdayConditionsAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal((await app.get("sprootDB").getWeekdayConditionsAsync(1))[2].weekdays, 5);
            await request(server)
              .patch("/api/v2/automations/1/conditions/weekday/3")
              .send({
                weekdays: 6,
              })
              .expect(200);
            assert.equal((await app.get("sprootDB").getWeekdayConditionsAsync(1))[2].weekdays, 6);
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").getWeekdayConditionsAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/weekday/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").getWeekdayConditionsAsync(1), 2);
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
          assert.containsAllKeys(content.data[i], ["id", "automationId", "outputId", "value"]);
        }
      });

      it("should return 200 and all output actions by automationID", async () => {
        const response = await request(server)
          .get("/api/v2/output-actions?automationId=2")
          .expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.lengthOf(content.data, 3);
        assert.containsAllKeys(content.data[0], ["id", "automationId", "outputId", "value"]);
        assert.containsAllKeys(content.data[1], ["id", "automationId", "outputId", "value"]);
        assert.containsAllKeys(content.data[2], ["id", "automationId", "outputId", "value"]);
      });

      it("should return 200 and a single output action", async () => {
        const response = await request(server).get("/api/v2/output-actions/1").expect(200);
        const content = response.body["content"];
        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["id", "automationId", "outputId", "value"]);
      });
    });

    describe("Create, Delete", async () => {
      describe("POST", async () => {
        it("should return 201", async () => {
          assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 5);
          await request(server)
            .post("/api/v2/output-actions")
            .send({
              automationId: 1,
              outputId: 1,
              value: 100,
            })
            .expect(201);
          assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 6);
        });
      });

      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 6);
          await request(server).delete("/api/v2/output-actions/6").expect(200);
          assert.lengthOf(await app.get("sprootDB").getOutputActionsAsync(), 5);
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
        "address",
        "color",
        "lastReading",
        "lastReadingTime",
        "units",
      ];
      describe("GET", async () => {
        it("should return 200 and all sesnors", async () => {
          const response = await request(server).get("/api/v2/sensors").expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.lengthOf(content.data, 2);
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
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 2);
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
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 3);
            assert.containsAllKeys(content.data, ["name", "model", "address", "color"]);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(app.get("sensorList").sensors["3"].name, "Test Sensor");
            const response = await request(server)
              .patch("/api/v2/sensors/3")
              .send({
                name: "Test1 Sensor",
                model: "BME280",
                address: "0x76",
                color: "#82c91e",
              })
              .expect(200);
            const content = response.body["content"];
            validateMiddlewareValues(response);
            assert.equal(app.get("sensorList").sensors["3"].name, "Test1 Sensor");
            assert.containsAllKeys(content.data, ["name", "model", "address", "color"]);
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 3);
            const response = await request(server).delete("/api/v2/sensors/3").expect(200);
            validateMiddlewareValues(response);
            assert.lengthOf(Object.keys(app.get("sensorList").sensors), 2);
          });
        });
      });
    });

    describe("ChartData", async () => {
      describe("GET", async () => {
        it("should return 200", async () => {
          const response = await request(server).get("/api/v2/sensors/chart-data").expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, ["data", "series"]);
          assert.containsAllKeys(content.data.data, ["humidity", "pressure", "temperature"]);
          assert.containsAllKeys(content.data.series[0], ["name", "color"]);

          assert.lengthOf(content.data.data.humidity, 2016);
          assert.lengthOf(content.data.data.pressure, 2016);
          assert.lengthOf(content.data.data.temperature, 2016);
        });

        it("should return 200 and the latest data", async () => {
          const response = await request(server)
            .get("/api/v2/sensors/chart-data?latest=true")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, ["data", "series"]);
          assert.containsAllKeys(content.data.data, ["humidity", "pressure", "temperature"]);
          assert.containsAllKeys(content.data.series[0], ["name", "color"]);

          assert.lengthOf(content.data.data.humidity, 1);
          assert.lengthOf(content.data.data.pressure, 1);
          assert.lengthOf(content.data.data.temperature, 1);
        });

        it("should return 200 and the data for a single readingType", async () => {
          const response = await request(server)
            .get("/api/v2/sensors/chart-data?readingType=temperature")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, ["data", "series"]);
          assert.containsAllKeys(content.data.data, ["temperature"]);
          assert.containsAllKeys(content.data.series[0], ["name", "color"]);

          assert.lengthOf(content.data.data.temperature, 2016);
        });

        it("should return 200 and the latest data for a single readingType", async () => {
          const response = await request(server)
            .get("/api/v2/sensors/chart-data?readingType=temperature&latest=true")
            .expect(200);
          const content = response.body["content"];
          validateMiddlewareValues(response);
          assert.containsAllKeys(content.data, ["data", "series"]);
          assert.containsAllKeys(content.data.data, ["temperature"]);
          assert.containsAllKeys(content.data.series[0], ["name", "color"]);

          assert.lengthOf(content.data.data.temperature, 1);
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
          assert.deepEqual(content.data, ["BME280", "DS18B20"]);
        });
      });
    });
  });
});
