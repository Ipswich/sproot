import { assert } from "chai";

export function validateMiddlewareValues(response: any) {
  assert.isNotNull(response.body["requestId"]);
  assert.isNotNull(response.body["timestamp"]);
  assert.isNotNull(response.body["statusCode"]);
}
