import { assert } from "chai";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

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
      let subcontrollers = await app.get("sprootDB").getSubcontrollersAsync();
      assert.isEmpty(subcontrollers);
      await request(server)
        .post("/api/v2/subcontrollers")
        .send({
          name: "Test Device",
          hostName: "sproot-device-8af4.local",
        })
        .expect(201);

      subcontrollers = await app.get("sprootDB").getSubcontrollersAsync();
      assert.lengthOf(subcontrollers, 1);
      assert.equal(subcontrollers[0].id, 1);
      assert.equal(subcontrollers[0].name, "Test Device");
      assert.equal(subcontrollers[0].hostName, "sproot-device-8af4.local");
      assert.equal(subcontrollers[0].type, "ESP32");
      assert.isString(subcontrollers[0].secureToken);
    });

    it("should reject missing required fields through contract middleware", async () => {
      const invalidBody = { name: "Test Device" };
      const response = await request(server)
        .post("/api/v2/subcontrollers")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/subcontrollers", invalidBody);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = { name: 123, hostName: false };
      const response = await request(server)
        .post("/api/v2/subcontrollers")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/subcontrollers", invalidBody);
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
      let subcontrollers = await app.get("sprootDB").getSubcontrollersAsync();
      const secureToken = subcontrollers[0].secureToken;
      assert.lengthOf(subcontrollers, 1);
      assert.equal(subcontrollers[0].name, "Test Device");

      await request(server)
        .patch("/api/v2/subcontrollers/1")
        .send({
          name: "Updated Test Device",
        })
        .expect(200);

      subcontrollers = await app.get("sprootDB").getSubcontrollersAsync();
      assert.lengthOf(subcontrollers, 1);
      assert.equal(subcontrollers[0].name, "Updated Test Device");
      assert.equal(subcontrollers[0].hostName, "sproot-device-8af4.local");
      assert.equal(subcontrollers[0].type, "ESP32");
      assert.equal(subcontrollers[0].secureToken, secureToken);
    });

    it("should reject invalid scalar types through contract middleware", async () => {
      const invalidBody = {
        name: false,
      };
      const response = await request(server)
        .patch("/api/v2/subcontrollers/1")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/subcontrollers/1", invalidBody);
    });
  });

  describe("DELETE", async () => {
    it("should return a 200 and delete a subcontroller from the database", async () => {
      let subcontrollers = await app.get("sprootDB").getSubcontrollersAsync();
      assert.lengthOf(subcontrollers, 1);

      await request(server).delete("/api/v2/subcontrollers/1").expect(200);

      subcontrollers = await app.get("sprootDB").getSubcontrollersAsync();
      assert.lengthOf(subcontrollers, 0);
    });
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
