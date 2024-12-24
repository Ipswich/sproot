import jwt, { JwtPayload } from "jsonwebtoken";

import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";

import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { getTokenAsync } from "../handlers/TokenHandlers";
import { SDBUser } from "@sproot/database/SDBUser";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

describe("TokenHandlers.ts tests", () => {
  describe("getTokenAsync", async () => {
    const sprootDB = sinon.createStubInstance(MockSprootDB);
    sprootDB.getUserAsync.resolves([
      {
        username: "dev-test",
        hash: "$2b$10$LyJ6YjLoT/FKyG8n1Puu7Oo8kEnh9mMSR0beiETYd5qLw7qIZYqIW",
        email: "dev-test@example.com",
      } as SDBUser,
    ]);
    const jwtExpiration = 259200000;
    const jwtSecret = "secret";

    it("should return a 200 and a token", async () => {
      const request = {
        body: { username: "dev-test", password: "password" },
        app: {
          get: (_dependency: string) => sprootDB,
        },
      } as unknown as Request;
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const result = (await getTokenAsync(
        request,
        response,
        "true",
        jwtExpiration,
        jwtSecret,
        false,
      )) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      const jwtPayload = jwt.verify(result.content?.data?.token, jwtSecret) as JwtPayload;
      assert.equal("dev-test", jwtPayload["username"]);
      assert.isUndefined(jwtPayload["csrf"]);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });

    it("should return a 200 and a token with a CSRF value", async () => {
      const request = {
        body: { username: "dev-test", password: "password" },
        app: {
          get: (_dependency: string) => sprootDB,
        },
      } as unknown as Request;
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const result = (await getTokenAsync(
        request,
        response,
        "true",
        jwtExpiration,
        jwtSecret,
        true,
      )) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      const jwtPayload = jwt.verify(result.content?.data?.token, jwtSecret) as JwtPayload;
      assert.equal("dev-test", jwtPayload["username"]);
      assert.isString(jwtPayload["csrf"]);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });

    it("should return a 400 and details for each missing required field", async () => {
      const request = {
        body: {},
        app: {
          get: (_dependency: string) => sprootDB,
        },
      } as unknown as Request;
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const result = (await getTokenAsync(
        request,
        response,
        "true",
        jwtExpiration,
        jwtSecret,
        false,
      )) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Bad Request");
      assert.deepEqual(result.error.details, ["Missing username", "Missing password"]);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });

    it("should return a 401 and an error", async () => {
      const request = {
        body: { username: "dev-test", password: "wrong-password" },
        app: {
          get: (_dependency: string) => sprootDB,
        },
      } as unknown as Request;
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const result = (await getTokenAsync(
        request,
        response,
        "true",
        jwtExpiration,
        jwtSecret,
        false,
      )) as ErrorResponse;
      assert.equal(result.statusCode, 401);
      assert.equal(result.error.name, "Unauthorized");
      assert.deepEqual(result.error.details, ["Invalid username or password."]);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });

    it("should return a 501 if authentication is not enabled", async () => {
      const request = {
        body: {},
        app: {
          get: (_dependency: string) => sprootDB,
        },
      } as unknown as Request;
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const result = (await getTokenAsync(
        request,
        response,
        "false",
        jwtExpiration,
        jwtSecret,
        false,
      )) as ErrorResponse;
      assert.equal(result.statusCode, 501);
      assert.equal(result.error.name, "Not Implemented");
      assert.deepEqual(result.error.details, ["Authentication is not enabled."]);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const request = {
        body: { username: "dev-test", password: "password" },
        app: {
          get: (_dependency: string) => sprootDB,
        },
      } as unknown as Request;
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      sprootDB.getUserAsync.rejects(new Error("Database error"));

      const result = (await getTokenAsync(
        request,
        response,
        "true",
        jwtExpiration,
        jwtSecret,
        false,
      )) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      assert.equal(result.error.name, "Service Unavailable");
      assert.deepEqual(result.error.details, ["Database error."]);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });
  });
});
