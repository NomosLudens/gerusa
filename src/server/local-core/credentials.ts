import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const CREDENTIAL_SCRYPT = {
  N: 32_768,
  r: 8,
  p: 1,
  keyLength: 32,
  maxmem: 64 * 1024 * 1024,
} as const;

const HASH_PREFIX = "scrypt";
const SALT_LENGTH = 16;

export function normalizeCredential(value: string): string {
  if (typeof value !== "string") throw new TypeError("Credential must be text");
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 256) {
    throw new TypeError("Credential has invalid length");
  }
  return normalized;
}

function toBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function deriveKey(secret: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      secret,
      salt,
      CREDENTIAL_SCRYPT.keyLength,
      {
        N: CREDENTIAL_SCRYPT.N,
        r: CREDENTIAL_SCRYPT.r,
        p: CREDENTIAL_SCRYPT.p,
        maxmem: CREDENTIAL_SCRYPT.maxmem,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashCredential(value: string): Promise<string> {
  const credential = normalizeCredential(value);
  const salt = randomBytes(SALT_LENGTH);
  const digest = await deriveKey(credential, salt);
  return [
    HASH_PREFIX,
    `N=${CREDENTIAL_SCRYPT.N}`,
    `r=${CREDENTIAL_SCRYPT.r}`,
    `p=${CREDENTIAL_SCRYPT.p}`,
    toBase64Url(salt),
    toBase64Url(digest),
  ].join("$");
}

export async function verifyCredential(value: string, encodedHash: string): Promise<boolean> {
  try {
    const credential = normalizeCredential(value);
    const [prefix, n, r, p, encodedSalt, encodedDigest, extra] = encodedHash.split("$");
    if (extra || prefix !== HASH_PREFIX || !n || !r || !p || !encodedSalt || !encodedDigest)
      return false;
    const N = Number(n.slice(2));
    const costR = Number(r.slice(2));
    const costP = Number(p.slice(2));
    const salt = fromBase64Url(encodedSalt);
    const expected = fromBase64Url(encodedDigest);
    if (!Number.isSafeInteger(N) || !Number.isSafeInteger(costR) || !Number.isSafeInteger(costP))
      return false;
    if (N < 16_384 || costR < 1 || costP < 1 || salt.length < 16 || expected.length !== 32)
      return false;
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        credential,
        salt,
        expected.length,
        { N, r: costR, p: costP, maxmem: 64 * 1024 * 1024 },
        (error, key) => {
          if (error) reject(error);
          else resolve(key);
        },
      );
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Blind lookup index. The key is runtime-only and must never be committed. */
export function credentialLookupDigest(value: string, lookupKey: string | Uint8Array): string {
  const credential = normalizeCredential(value);
  if (typeof lookupKey === "string" ? lookupKey.length === 0 : lookupKey.byteLength === 0) {
    throw new TypeError("Credential lookup key is required");
  }
  return createHmac("sha256", lookupKey).update(credential, "utf8").digest("base64url");
}
