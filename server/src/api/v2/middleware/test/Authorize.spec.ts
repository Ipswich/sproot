import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import sinon from "sinon";
import { assert } from "chai";
import { authorize } from "../Authorize";

describe("Authenticate.ts tests", () => {
  const jwtSecret = "secret";
  describe("authenticate", () => {
    it("should call next on disabled authentication", () => {
      const request = {
        headers: {},
        cookies: {},
      } as unknown as Request;

      let response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        status: () => response,
        json: () => response,
      } as unknown as Response;

      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize("false", jwtSecret);
      authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.calledOnce);
      assert.isTrue(statusStub.notCalled);
      assert.isTrue(jsonStub.notCalled);
    });

    it("should call next on successful authorization header authentication", () => {
      const token = jwt.sign({ username: "dev-test" }, jwtSecret, {
        expiresIn: 60000,
      });

      const request = {
        headers: { authorization: `Bearer ${token}` },
        cookies: {},
      } as unknown as Request;

      let response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        status: () => response,
        json: () => response,
      } as unknown as Response;

      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize("true", jwtSecret);
      authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.calledOnce);
      assert.isTrue(statusStub.notCalled);
      assert.isTrue(jsonStub.notCalled);
    });

    it("should call next on successful coookie and CSRF authentication", () => {
      const token = jwt.sign({ username: "dev-test", csrf: "csrf" }, jwtSecret, {
        expiresIn: 60000,
      });

      const request = {
        headers: { "x-csrf-token": "csrf" },
        cookies: { jwt_token: token },
      } as unknown as Request;

      let response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        status: () => response,
        json: () => response,
      } as unknown as Response;

      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize("true", jwtSecret);
      authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.calledOnce);
      assert.isTrue(statusStub.notCalled);
      assert.isTrue(jsonStub.notCalled);
    });

    it("should return a 401 and an error response for a missing token", () => {
      const request = {
        headers: {},
        cookies: {},
      } as unknown as Request;

      let response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        status: () => response,
        json: () => response,
      } as unknown as Response;

      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize("true", jwtSecret);
      authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.notCalled);
      assert.isTrue(statusStub.calledOnceWith(401));
      assert.isTrue(jsonStub.calledOnce);
    });

    it("should return a 401 and an error response for an invalid token", () => {
      const token = jwt.sign({ username: "dev-test", csrf: "csrf" }, jwtSecret, {
        expiresIn: 60000,
      });

      const request = {
        headers: {},
        cookies: { jwt_token: token },
      } as unknown as Request;

      let response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        status: () => response,
        json: () => response,
      } as unknown as Response;

      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize("true", "wrong-secret");
      authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.notCalled);
      assert.isTrue(statusStub.calledOnceWith(401));
      assert.isTrue(jsonStub.calledOnce);
    });

    it("should return a 401 and an error response for a missing CSRF with cookie", () => {
      const token = jwt.sign({ username: "dev-test", csrf: "csrf" }, jwtSecret, {
        expiresIn: 60000,
      });

      const request = {
        headers: {},
        cookies: { jwt_token: token },
      } as unknown as Request;

      let response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
        status: () => response,
        json: () => response,
      } as unknown as Response;

      const statusStub = sinon.stub(response, "status").returns(response);
      const jsonStub = sinon.stub(response, "json").returns(response);

      const next = sinon.spy();
      const authenticateMiddlewareFunction = authorize("true", jwtSecret);
      authenticateMiddlewareFunction(request, response, next);

      assert.isTrue(next.notCalled);
      assert.isTrue(statusStub.calledOnceWith(401));
      assert.isTrue(jsonStub.calledOnce);
    });
  });
});
