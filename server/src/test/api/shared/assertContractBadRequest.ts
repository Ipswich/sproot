import { assert } from "chai";
import request from "supertest";

import { validateMiddlewareValues } from "../../utils";

export function assertContractBadRequest(
  response: request.Response,
  expectedUrl: string,
  expectedBody: unknown
) {
  validateMiddlewareValues(response);
  assert.equal(response.body["statusCode"], 400);
  assert.equal(response.body["error"]["name"], "Bad Request");
  assert.equal(response.body["error"]["url"], expectedUrl);
  assert.deepEqual(response.body["error"]["request"]["body"], expectedBody);
  assert.isArray(response.body["error"]["details"]);
  assert.isNotEmpty(response.body["error"]["details"]);
}