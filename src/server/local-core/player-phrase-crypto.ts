const encoder = new TextEncoder();
const KEY_SALT = encoder.encode("kallistis/player-access/phrase-storage/v1");
const KEY_INFO = encoder.encode("player-phrase-aes-gcm");
const VERSION = "v1";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid_player_phrase_ciphertext");
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

async function deriveEncryptionKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new Error("player_phrase_encryption_unavailable");
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: KEY_SALT, info: KEY_INFO },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function associatedData(userId: string, playerCode: string): ArrayBuffer {
  return encoder.encode(`kallistis-player-phrase|${userId}|${playerCode}|${VERSION}`)
    .buffer as ArrayBuffer;
}

export async function encryptPlayerPhrase(
  phrase: string,
  secret: string,
  identity: { userId: string; playerCode: string },
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: associatedData(identity.userId, identity.playerCode),
      tagLength: 128,
    },
    await deriveEncryptionKey(secret),
    encoder.encode(phrase),
  );
  return `${VERSION}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptPlayerPhrase(
  envelope: string,
  secret: string,
  identity: { userId: string; playerCode: string },
): Promise<string> {
  const [version, ivPart, ciphertextPart, extra] = envelope.split(".");
  if (version !== VERSION || !ivPart || !ciphertextPart || extra !== undefined)
    throw new Error("invalid_player_phrase_ciphertext");
  const iv = fromBase64Url(ivPart);
  if (iv.byteLength !== 12) throw new Error("invalid_player_phrase_ciphertext");
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: associatedData(identity.userId, identity.playerCode),
      tagLength: 128,
    },
    await deriveEncryptionKey(secret),
    fromBase64Url(ciphertextPart),
  );
  return new TextDecoder().decode(plaintext);
}
