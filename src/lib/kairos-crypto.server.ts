// Criptografia do "Olhar de Kairós" — AES-256-GCM via Web Crypto.
// Escopo deliberadamente mínimo: cifra/decifra um único payload (o snapshot), nada de
// chaveamento por sessão, rotação automática ou sync genérico. A chave é derivada
// por SHA-256 de um segredo compartilhado configurado nos dois lados (nuvem e local).

async function deriveKey(sharedSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(sharedSecret);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export type KairosEnvelope = { v: 1; iv: string; data: string };

export async function encryptKairosSnapshot(
  sharedSecret: string,
  payload: unknown,
): Promise<KairosEnvelope> {
  const key = await deriveKey(sharedSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    v: 1,
    iv: Buffer.from(iv).toString("base64"),
    data: Buffer.from(ciphertext).toString("base64"),
  };
}

export async function decryptKairosEnvelope(
  sharedSecret: string,
  envelope: KairosEnvelope,
): Promise<unknown> {
  const key = await deriveKey(sharedSecret);
  const iv = Buffer.from(envelope.iv, "base64");
  const ciphertext = Buffer.from(envelope.data, "base64");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}
