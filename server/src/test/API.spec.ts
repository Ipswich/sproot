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
          assert.deepEqual(content.data, {
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
                comparisionLookback: 3,
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
                comparisionLookback: 3,
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
            assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 2);
            await request(server)
              .post("/api/v2/automations/1/conditions/month")
              .send({
                groupType: "oneOf",
                months: 13,
              })
              .expect(201);
            assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal((await app.get("sprootDB").getMonthConditionsAsync(1))[2].months, 13);
            await request(server)
              .patch("/api/v2/automations/1/conditions/month/3")
              .send({
                months: 14,
              })
              .expect(200);
            assert.equal((await app.get("sprootDB").getMonthConditionsAsync(1))[2].months, 14);
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 3);
            await request(server).delete("/api/v2/automations/1/conditions/month/3").expect(200);
            assert.lengthOf(await app.get("sprootDB").getMonthConditionsAsync(1), 2);
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
            assert.lengthOf(await app.get("sprootDB").getDateRangeConditionsAsync(1), 2);
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
            assert.lengthOf(await app.get("sprootDB").getDateRangeConditionsAsync(1), 3);
          });
        });

        describe("PATCH", async () => {
          it("should return 200", async () => {
            assert.equal(
              (await app.get("sprootDB").getDateRangeConditionsAsync(1))[2].startMonth,
              1,
            );
            await request(server)
              .patch("/api/v2/automations/1/conditions/date-range/3")
              .send({
                startMonth: 6,
              })
              .expect(200);
            assert.equal(
              (await app.get("sprootDB").getDateRangeConditionsAsync(1))[2].startMonth,
              6,
            );
          });
        });

        describe("DELETE", async () => {
          it("should return 200", async () => {
            assert.lengthOf(await app.get("sprootDB").getDateRangeConditionsAsync(1), 3);
            await request(server)
              .delete("/api/v2/automations/1/conditions/date-range/3")
              .expect(200);
            assert.lengthOf(await app.get("sprootDB").getDateRangeConditionsAsync(1), 2);
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
        "pin",
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
        it("should return 200 and the updated settings", async () => {
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
          const req = request(server)
            .get("/api/v2/camera/stream")
            .buffer(false)
            .expect(200)
            .end((err, res) => {
              if (err) {
                assert.fail("Stream request failed: " + err.message);
              }
              validateMiddlewareValues(res);

              // Verify headers
              assert.equal(
                res.headers["content-type"],
                "multipart/x-mixed-replace; boundary=FRAME",
              );
              // Listen for first data chunk to confirm streaming works
              res.on("data", () => {
                req.abort();
              });

              setTimeout(() => {
                req.abort();
                assert.fail("Stream did not send data within timeout period");
              }, 300);
            });
        });

        it("should return a 200 after reconnecting to the livestream server", async () => {
          // First make the reconnect request
          const response = await request(server).post("/api/v2/camera/reconnect").expect(200);

          validateMiddlewareValues(response);
          assert.equal(response.body.content.data, "Livestream successfully reconnected");
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
  });

  describe("System Routes", async () => {
    describe("Status", async () => {
      describe("GET", async () => {
        it("should return 200 and system status", async () => {
          const response = await request(server).get("/api/v2/system/status").expect(200);
          const data = response.body["content"].data;
          validateMiddlewareValues(response);

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
          assert.isNumber(data.timelapse.lastArchiveGenerationDuration);
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
