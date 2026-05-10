import { assert } from "chai";
import type { NextFunction, Request, Response } from "express";
import sinon from "sinon";

import createContractRoute from "./createContractRoute";
import {
  getValidatedContractRequestData,
  VALIDATED_CONTRACT_REQUEST_DATA_KEY,
} from "./validateRequest";

describe("createContractRoute", () => {
  it("should store validated and coerced query params on response locals", async () => {
    const handler = sinon.spy((_request: Request, response: Response, _next: NextFunction) => {
      const validatedRequest = getValidatedContractRequestData<"listJournalEntries">(response);

      assert.equal(
        (validatedRequest.query as Record<string, unknown> | undefined)?.["withContent"],
        true
      );
    });

    const route = createContractRoute("listJournalEntries", handler, {
      validateResponse: false,
    });
    const request = {
      body: undefined,
      headers: {},
      params: { journalId: "12" },
      query: { withContent: "true" },
    } as Partial<Request> as Request;
    const response = {
      json: sinon.stub().returnsThis(),
      locals: {},
      statusCode: 200,
    } as Partial<Response> as Response;
    const next = sinon.spy();

    await route(request, response, next);

    assert.isTrue(handler.calledOnce);
    assert.isTrue(next.notCalled);
    assert.deepEqual(response.locals[VALIDATED_CONTRACT_REQUEST_DATA_KEY], {
      params: { journalId: "12" },
      query: { withContent: true },
    });
  });

  it("should store validated params and body on response locals", async () => {
    const handler = sinon.spy((_request: Request, response: Response, _next: NextFunction) => {
      const validatedRequest = getValidatedContractRequestData<"updateJournalEntry">(response);

      assert.equal(
        (validatedRequest.params as Record<string, unknown> | undefined)?.["entryId"],
        "7"
      );
      assert.deepEqual(validatedRequest.body as Record<string, unknown> | undefined, {
        title: "Updated Title",
      });
    });

    const route = createContractRoute("updateJournalEntry", handler, {
      validateResponse: false,
    });
    const request = {
      body: { title: "Updated Title" },
      headers: {},
      params: { entryId: "7" },
      query: {},
    } as Partial<Request> as Request;
    const response = {
      json: sinon.stub().returnsThis(),
      locals: {},
      statusCode: 200,
    } as Partial<Response> as Response;
    const next = sinon.spy();

    await route(request, response, next);

    assert.isTrue(handler.calledOnce);
    assert.isTrue(next.notCalled);
    assert.deepEqual(response.locals[VALIDATED_CONTRACT_REQUEST_DATA_KEY], {
      body: { title: "Updated Title" },
      params: { entryId: "7" },
    });
  });
});