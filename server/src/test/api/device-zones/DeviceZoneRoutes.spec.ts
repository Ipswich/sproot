import { assert } from "chai";
import request from "supertest";

import { app, server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

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
        assert.lengthOf(await app.get("sprootDB").getDeviceZonesAsync(), 2);
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

      it("should reject missing required fields through contract middleware", async () => {
        const invalidBody = {};
        const response = await request(server)
          .post("/api/v2/device-zones")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/device-zones", invalidBody);
      });

      it("should reject invalid scalar types through contract middleware", async () => {
        const invalidBody = { name: 123 };
        const response = await request(server)
          .post("/api/v2/device-zones")
          .send(invalidBody)
          .expect(400);

        assertContractBadRequest(response, "/api/v2/device-zones", invalidBody);
      });

      it("should reject empty names through remaining handler/domain validation", async () => {
        const response = await request(server)
          .post("/api/v2/device-zones")
          .send({ name: "" })
          .expect(400);

        validateMiddlewareValues(response);
        assert.equal(response.body["error"]["name"], "Bad Request");
        assert.equal(response.body["error"]["url"], "/api/v2/device-zones");
        assert.deepEqual(response.body["error"]["details"], ["Device zone name is required."]);
      });

      describe("PATCH", async () => {
        it("should return 200", async () => {
          assert.equal((await app.get("sprootDB").getDeviceZonesAsync())[2].name, "Test Device Group");
          const response = await request(server)
            .patch("/api/v2/device-zones/3")
            .send({
              name: "Test1 Device Group",
            })
            .expect(200);

          validateMiddlewareValues(response);
          const content = response.body["content"];

          assert.equal((await app.get("sprootDB").getDeviceZonesAsync())[2].name, "Test1 Device Group");
          assert.containsAllKeys(content.data, ["id", "name"]);
        });

        it("should reject malformed bodies through contract middleware", async () => {
          const invalidBody: unknown[] = [];
          const response = await request(server)
            .patch("/api/v2/device-zones/3")
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, "/api/v2/device-zones/3", invalidBody);
        });

        it("should reject invalid scalar types through contract middleware", async () => {
          const invalidBody = { name: 123 };
          const response = await request(server)
            .patch("/api/v2/device-zones/3")
            .send(invalidBody)
            .expect(400);

          assertContractBadRequest(response, "/api/v2/device-zones/3", invalidBody);
        });

        it("should reject invalid path parameters through remaining handler/domain validation", async () => {
          const response = await request(server)
            .patch("/api/v2/device-zones/not-a-number")
            .send({ name: "Ignored" })
            .expect(400);

          validateMiddlewareValues(response);
          assert.equal(response.body["error"]["name"], "Bad Request");
          assert.equal(response.body["error"]["url"], "/api/v2/device-zones/not-a-number");
          assert.deepEqual(response.body["error"]["details"], ["Valid device zone ID is required."]);
        });

        it("should reject empty names through remaining handler/domain validation", async () => {
          const response = await request(server)
            .patch("/api/v2/device-zones/3")
            .send({ name: "" })
            .expect(400);

          validateMiddlewareValues(response);
          assert.equal(response.body["error"]["name"], "Bad Request");
          assert.equal(response.body["error"]["url"], "/api/v2/device-zones/3");
          assert.deepEqual(response.body["error"]["details"], ["Device zone name is required."]);
        });
      });

      describe("DELETE", async () => {
        it("should return 200", async () => {
          assert.lengthOf(await app.get("sprootDB").getDeviceZonesAsync(), 3);
          const response = await request(server).delete("/api/v2/device-zones/3").expect(200);

          validateMiddlewareValues(response);
          assert.lengthOf(await app.get("sprootDB").getDeviceZonesAsync(), 2);
        });
      });
    });
  });
});