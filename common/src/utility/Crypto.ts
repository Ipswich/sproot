import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits, recommended for GCM
const AUTH_TAG_LENGTH = 16; // bytes

/**
 * Encrypt a UTF-8 string and return a single Base64 string containing:
 * IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function encrypt(plainText: string, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest("base64").slice(0, 32);

  const iv = new Uint8Array(crypto.randomBytes(IV_LENGTH));
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = new Uint8Array(
    Buffer.concat([
      new Uint8Array(cipher.update(plainText, "utf8")),
      new Uint8Array(cipher.final()),
    ]),
  );
  const authTag = new Uint8Array(cipher.getAuthTag());

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt a Base64 string produced by `encrypt()`.
 * Throws if the data was modified or if the key/IV is invalid.
 */
export function decrypt(base64Value: string, secret: string): string {
  const key = crypto.createHash("sha256").update(secret).digest("base64").slice(0, 32);

  const data = new Uint8Array(Buffer.from(base64Value, "base64"));

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    new Uint8Array(decipher.update(ciphertext)),
    new Uint8Array(decipher.final()),
  ]);
  return decrypted.toString("utf8");
}
