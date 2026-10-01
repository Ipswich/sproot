import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import sinon from "sinon";
import { assert } from "chai";
import { authorize } from "../Authorize";
import { SETTINGS } from "../../../../database/settings/SettingsSchema";

function createRequest(authenticationEnabled = true, userExists = true) {
  return {
    headers: {},
    cookies: {},
    originalUrl: "/api/v2/outputs",
    secure: false,
    app: {
      get: (_dependency: string) => ({
        settings: {
          getAsync: async (key: string) => {
            if (key === SETTINGS.system.authentication_enabled) {
              return authenticationEnabled;
            }

            if (key === SETTINGS.system.force_https) {
              return false;
            }

            return undefined;
          },
        },
        users: {
          countAsync: async () => (userExists ? 1 : 0),
          getByIdAsync: async () =>
            userExists ? [{ username: "dev-test", tokenVersion: 0 }] : [],
        },
      }),
    },
  } as unknown as Request;
}

describe("Authenticate.ts tests", () => {
  const jwtSecret = "secret";
  describe("authenticate", () => {
    it("should call next on disabled authentication", async () => {
      const request = createRequest(false);

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize(jwtSecret);
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.calledOnce);
      assert.isTrue(statusStub.notCalled);
      assert.isTrue(jsonStub.notCalled);
    });

    it("should call next on successful authorization header authentication", async () => {
      const token = jwt.sign({ username: "dev-test", "token-version": 0 }, jwtSecret, {
        expiresIn: 60000,
      });

      const request = createRequest();
      request.headers = { authorization: `Bearer ${token}` };

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize(jwtSecret);
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.calledOnce);
      assert.isTrue(statusStub.notCalled);
      assert.isTrue(jsonStub.notCalled);
    });

    it("should call next on successful coookie and CSRF authentication", async () => {
      const token = jwt.sign(
        { username: "dev-test", "csrf-token": "csrf", "token-version": 0 },
        jwtSecret,
        {
          expiresIn: 60000,
        },
      );

      const request = createRequest();
      request.headers = { "x-csrf-token": "csrf" };
      request.cookies = { jwt_token: token };
      request.method = "POST";

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize(jwtSecret);
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.calledOnce);
      assert.isTrue(statusStub.notCalled);
      assert.isTrue(jsonStub.notCalled);
    });

    it("should call next on successful GET with cookie authentication and no CSRF header", async () => {
      const token = jwt.sign(
        { username: "dev-test", "csrf-token": "csrf", "token-version": 0 },
        jwtSecret,
        {
          expiresIn: 60000,
        },
      );

      const request = createRequest();
      request.cookies = { jwt_token: token };
      request.method = "GET";

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize(jwtSecret);
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.calledOnce);
      assert.isTrue(statusStub.notCalled);
      assert.isTrue(jsonStub.notCalled);
    });

    it("should return a 401 and an error response for a missing token", async () => {
      const request = createRequest();

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize(jwtSecret);
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.notCalled);
      assert.isTrue(statusStub.calledOnceWith(401));
      assert.isTrue(jsonStub.calledOnce);
    });

    it("should return a 401 and an error response for an invalid token", async () => {
      const token = jwt.sign(
        { username: "dev-test", "csrf-token": "csrf", "token-version": 0 },
        jwtSecret,
        {
          expiresIn: 60000,
        },
      );

      const request = createRequest();
      request.cookies = { jwt_token: token };

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      const clearCookieStub = sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize("wrong-secret");
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.notCalled);
      assert.isTrue(clearCookieStub.calledOnce);
      assert.isTrue(statusStub.calledOnceWith(401));
      assert.isTrue(jsonStub.calledOnce);
    });

    it("should return a 401 and an error response for a missing CSRF with cookie", async () => {
      const token = jwt.sign(
        { username: "dev-test", "csrf-token": "csrf", "token-version": 0 },
        jwtSecret,
        {
          expiresIn: 60000,
        },
      );

      const request = createRequest();
      request.cookies = { jwt_token: token };

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize(jwtSecret);
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.notCalled);
      assert.isTrue(statusStub.calledOnceWith(401));
      assert.isTrue(jsonStub.calledOnce);
    });

    it("should return a 401 when the token version no longer matches", async () => {
      const token = jwt.sign({ username: "dev-test", "token-version": 0 }, jwtSecret, {
        expiresIn: 60000,
      });

      const request = createRequest();
      request.headers = { authorization: `Bearer ${token}` };
      request.app = {
        get: (_dependency: string) => ({
          settings: {
            getAsync: async (key: string) => {
              if (key === SETTINGS.system.authentication_enabled) {
                return true;
              }

              if (key === SETTINGS.system.force_https) {
                return false;
              }

              return undefined;
            },
          },
          users: {
            countAsync: async () => 1,
            getByIdAsync: async () => [{ username: "dev-test", tokenVersion: 1 }],
          },
        }),
      } as any;

      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        clearCookie: () => response,
        status: () => response,
        json: () => response,
      } as unknown as Response;

      sinon.stub(response, "clearCookie").returns(response);
      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize(jwtSecret);
      await authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.notCalled);
      assert.isTrue(statusStub.calledOnceWith(401));
      assert.isTrue(jsonStub.calledOnce);
    });
  });
});
