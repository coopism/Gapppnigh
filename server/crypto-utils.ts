import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.PII_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("PII_ENCRYPTION_KEY environment variable is not set");
  }
  // Accept 64-char hex (32 bytes) or base64 (44 chars)
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("PII_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)");
  }
  return buf;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a single base64 string: iv:ciphertext:tag
 */
export function encryptPII(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv).base64(ciphertext).base64(tag)
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${tag.toString("base64")}`;
}

/**
 * Decrypt a value produced by encryptPII.
 * Returns null if decryption fails (bad key, tampered data, etc.)
 */
export function decryptPII(encrypted: string): string | null {
  try {
    const parts = encrypted.split(".");
    if (parts.length !== 3) return null;
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], "base64");
    const ciphertext = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Encrypt a nullable string — returns null if input is null/undefined.
 */
export function encryptPIIOrNull(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return encryptPII(value);
}

/**
 * Decrypt a nullable string — returns null if input is null/undefined.
 */
export function decryptPIIOrNull(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return decryptPII(value);
}
