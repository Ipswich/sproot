import { Express } from "express";
import request from "supertest";

import {
  createAuthenticatedAppAsync,
  disposeTestAppAsync,
} from "../shared/authenticatedApp";
import { assertContractBadRequest } from "../shared/assertContractBadRequest";

describe("Authentication Routes", () => {
  const originalAuthEnabled = process.env["AUTHENTICATION_ENABLED"];
  let authenticatedApp: Express;

  before(async function () {
    this.timeout(0);
    process.env["AUTHENTICATION_ENABLED"] = "true";
    authenticatedApp = await createAuthenticatedAppAsync();
  });

  after(async function () {
    this.timeout(0);
    await disposeTestAppAsync(authenticatedApp);
    process.env["AUTHENTICATION_ENABLED"] = originalAuthEnabled;
  });

  describe("POST", () => {
    it("should return 400 for token requests missing required contract fields", async () => {
      const invalidBody = { username: "testuser" };
      const response = await request(authenticatedApp)
        .post("/api/v2/authenticate/token")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/authenticate/token", invalidBody);
    });

    it("should return 400 for login requests missing required contract fields", async () => {
      const invalidBody = { password: "password" };
      const response = await request(authenticatedApp)
        .post("/api/v2/authenticate/login")
        .send(invalidBody)
        .expect(400);

      assertContractBadRequest(response, "/api/v2/authenticate/login", invalidBody);
    });
  });
});