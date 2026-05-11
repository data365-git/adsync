import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";
const KEY_HEX = process.env.TOKEN_ENC_KEY ?? "";

function getKey(): Buffer {
  if (KEY_HEX.length !== 64) {
    throw new Error(
      "TOKEN_ENC_KEY must be a 64-character hex string (32 bytes). " +
        "Generate with: openssl rand -hex 32",
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format: <iv_b64url>:<authTag_b64url>:<ciphertext_b64url>
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/**
 * Decrypt a ciphertext string produced by encryptToken.
 * Throws if the format is invalid or the tag does not match (tampered data).
 */
export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}
