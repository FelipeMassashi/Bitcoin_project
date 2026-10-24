import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

export type Credentials = { apiKey: string; secret: string };

const VERSION = "v1";
// Amarra o texto cifrado a este uso: um cookie cifrado para outra coisa não passa como credencial.
const AAD = Buffer.from("btc-project/binance-credentials/v1");
const payloadSchema = z.object({ apiKey: z.string(), secret: z.string(), iat: z.number() });
/** Mesmo prazo do cookie: um valor copiado do navegador não vale para sempre. */
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** A ENCRYPTION_KEY está no formato certo (32 bytes em base64)? */
export const isValidMasterKey = (encoded: string) => Buffer.from(encoded, "base64").length === 32;

function masterKey(encoded: string): Buffer {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY precisa ter 32 bytes em base64 (veja .env.example).");
  return key;
}

/** Cifra as credenciais com AES-256-GCM: `v1.<iv | texto cifrado | tag em base64url>`. */
export function sealCredentials(credentials: Credentials, encodedKey: string, now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(encodedKey), iv);
  cipher.setAAD(AAD);
  const body = Buffer.concat([cipher.update(JSON.stringify({ apiKey: credentials.apiKey, secret: credentials.secret, iat: now }), "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${VERSION}.${Buffer.concat([iv, body]).toString("base64url")}`;
}

/** Decifra; qualquer adulteração, chave errada, formato inesperado ou prazo vencido devolve null. */
export function openCredentials(token: string, encodedKey: string, now = Date.now()): Credentials | null {
  const key = masterKey(encodedKey);
  const [version, encoded] = token.split(".");
  if (version !== VERSION || !encoded) return null;
  const bytes = Buffer.from(encoded, "base64url");
  if (bytes.length < 12 + 16 + 1) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAAD(AAD);
    decipher.setAuthTag(bytes.subarray(bytes.length - 16));
    const plain = Buffer.concat([decipher.update(bytes.subarray(12, bytes.length - 16)), decipher.final()]);
    const parsed = payloadSchema.safeParse(JSON.parse(plain.toString("utf8")));
    if (!parsed.success || now - parsed.data.iat > MAX_AGE_MS || parsed.data.iat > now + 60_000) return null;
    return { apiKey: parsed.data.apiKey, secret: parsed.data.secret };
  } catch {
    return null;
  }
}
