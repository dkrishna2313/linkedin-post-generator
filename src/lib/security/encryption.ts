import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function getKey() {
  const raw = process.env.APP_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_SECRET_ENCRYPTION_KEY is required for credential encryption.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("APP_SECRET_ENCRYPTION_KEY must be a 32-byte base64 key.");
  }
  return key;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string) {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64")), decipher.final()]).toString("utf8");
}
