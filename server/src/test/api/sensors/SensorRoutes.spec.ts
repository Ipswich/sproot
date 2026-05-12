import { assert } from "chai";
import { Models } from "@sproot/sproot-common/dist/sensors/Models";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";
import { DI_KEYS } from "../../../utils/DependencyInjectionConstants";

describe("Sensor Routes", async () => {
  const createdSensorName = `Contract Boundary Sensor ${Date.now()}`;
  let createdSensorId: number | undefined;
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

  before(async () => {
    await app
      .get(DI_KEYS.KnexConnection)
      .raw(
        "SELECT setval(pg_get_serial_sequence('sensors', 'id'), COALESCE((SELECT MAX(id) FROM sensors), 0) + 1, false)",
      );
    await app.get("sensorList").regenerateAsync();
  });

  describe("Sensors", async () => {
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
          await app
            .get(DI_KEYS.KnexConnection)
            .raw(
              "SELECT setval(pg_get_serial_sequence('sensors', 'id'), COALESCE((SELECT MAX(id) FROM sensors), 0) + 1, false)",
            );
          const sensorCountBefore = Object.keys(app.get("sensorList").sensors).length;
          const response = await request(server)
            .post("/api/v2/sensors")
            .send({
              name: createdSensorName,
              model: "BME280",
              address: "0x76",
              color: "#82c91e",
            })
            .expect(201);
          const content = response.body["content"];

          validateMiddlewareValues(response);
          assert.lengthOf(Object.keys(app.get("sensorList").sensors), sensorCountBefore + 1);
          assert.containsAllKeys(content.data, ["name", "model", "address", "color"]);

          const createdSensors = Object.values(app.get("sensorList").sensors) as Array<{
            id: number;
            name: string;
          }>;
          const createdSensor = createdSensors.find((sensor) => sensor.name === createdSensorName);
          assert.exists(createdSensor);
          createdSensorId = createdSensor?.id;
        });

        it("should reject missing required fields through contract middleware", async () => {
          const invalidBody = { model: "BME280" };
          const response = await request(server)
            .post("/api/v2/sensors")
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, "/api/v2/sensors", invalidBody);
        });

        it("should reject invalid scalar types through contract middleware", async () => {
          const invalidBody = {
            name: "Invalid Sensor",
            model: "BME280",
            subcontrollerId: "1",
            address: "0x76",
            color: "#82c91e",
          };
          const response = await request(server)
            .post("/api/v2/sensors")
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, "/api/v2/sensors", invalidBody);
        });

        it("should reject unsupported models through remaining handler/domain validation", async () => {
          const supportedModels = Object.keys(Models).join(", ");
          const response = await request(server)
            .post("/api/v2/sensors")
            .send({
              name: "Unsupported Sensor",
              model: "NOT_A_REAL_MODEL",
              address: "0x76",
              color: "#82c91e",
            })
            .expect(400);

          validateMiddlewareValues(response);
          assert.equal(response.body["error"]["name"], "Bad Request");
          assert.equal(response.body["error"]["url"], "/api/v2/sensors");
          assert.deepEqual(response.body["error"]["details"], [
            `Invalid model: NOT_A_REAL_MODEL. Supported models are: ${supportedModels}`,
          ]);
        });

        it("should reject model-dependent missing pin values through remaining handler/domain validation", async () => {
          const response = await request(server)
            .post("/api/v2/sensors")
            .send({
              name: "Analog Sensor",
              model: "ADS1115",
              address: "0x48",
              color: "#82c91e",
            })
            .expect(400);

          validateMiddlewareValues(response);
          assert.equal(response.body["error"]["name"], "Bad Request");
          assert.equal(response.body["error"]["url"], "/api/v2/sensors");
          assert.deepEqual(response.body["error"]["details"], ["Missing required field: pin"]);
        });
      });

      describe("PATCH", async () => {
        it("should return 200", async () => {
          assert.isDefined(createdSensorId);
          assert.equal(
            app.get("sensorList").sensors[String(createdSensorId)].name,
            createdSensorName,
          );
          const response = await request(server)
            .patch(`/api/v2/sensors/${createdSensorId}`)
            .send({
              name: "Test1 Sensor",
              model: "BME280",
              address: "0x76",
              color: "#82c91e",
            })
            .expect(200);
          const content = response.body["content"];

          validateMiddlewareValues(response);
          assert.equal(app.get("sensorList").sensors[String(createdSensorId)].name, "Test1 Sensor");
          assert.containsAllKeys(content.data, ["name", "model", "address", "color"]);
        });

        it("should reject malformed bodies through contract middleware", async () => {
          const invalidBody: unknown[] = [];
          const response = await request(server)
            .patch("/api/v2/sensors/1")
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, "/api/v2/sensors/1", invalidBody);
        });

        it("should reject invalid scalar types through contract middleware", async () => {
          const invalidBody = { name: 123 };
          const response = await request(server)
            .patch("/api/v2/sensors/1")
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, "/api/v2/sensors/1", invalidBody);
        });

        it("should reject invalid sensor IDs through remaining handler logic", async () => {
          const response = await request(server)
            .patch("/api/v2/sensors/not-a-number")
            .send({ name: "Ignored" })
            .expect(400);

          assertContractBadRequest(response, "/api/v2/sensors/not-a-number", { name: "Ignored" });
        });
      });

      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.isDefined(createdSensorId);
          const sensorCountBefore = Object.keys(app.get("sensorList").sensors).length;
          const response = await request(server)
            .delete(`/api/v2/sensors/${createdSensorId}`)
            .expect(200);

          validateMiddlewareValues(response);
          assert.lengthOf(Object.keys(app.get("sensorList").sensors), sensorCountBefore - 1);
        });

        it("should reject invalid sensor IDs through contract middleware", async () => {
          const response = await request(server).delete("/api/v2/sensors/not-a-number").expect(400);

          assertContractBadRequest(response, "/api/v2/sensors/not-a-number", {});
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

      it("should preserve non-latest string query behavior", async () => {
        const response = await request(server)
          .get("/api/v2/sensors/chart-data?latest=false")
          .expect(200);
        const content = response.body["content"];

        validateMiddlewareValues(response);
        assert.containsAllKeys(content.data, ["data", "series"]);
        assert.containsAllKeys(content.data.data, ["humidity", "pressure", "temperature"]);
        assert.containsAllKeys(content.data.series[0], ["name", "color"]);
        assert.lengthOf(content.data.data.humidity, 2016);
        assert.lengthOf(content.data.data.pressure, 2016);
        assert.lengthOf(content.data.data.temperature, 2016);
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
        const response = await request(server).get("/api/v2/sensors/supported-models").expect(200);
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
  });
});
