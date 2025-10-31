import { assert } from "chai";
import { encrypt, decrypt } from "../Crypto";

describe("Crypto.ts tests", () => {
  const testSecret = "MY SECRET";
  const testString = "Hello, Sproot!";

  it("should encrypt and decrypt a string correctly", () => {
    const encrypted = encrypt(testString, testSecret);
    console.log(encrypted);
    assert.isString(encrypted);
    assert.notEqual(encrypted, testString);
    const decrypted = decrypt(encrypted, testSecret);
    assert.equal(decrypted, testString);
  });
});
