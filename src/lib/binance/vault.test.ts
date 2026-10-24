import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { openCredentials, sealCredentials } from "./vault";

const key = randomBytes(32).toString("base64");
const creds = { apiKey: "A".repeat(64), secret: "segredo-que-nao-pode-vazar-0123456789" };

describe("cofre de credenciais", () => {
  it("cifra e decifra as credenciais", () => {
    expect(openCredentials(sealCredentials(creds, key), key)).toEqual(creds);
  });

  it("o cookie não contém a Secret nem a API Key em texto", () => {
    const token = sealCredentials(creds, key);
    expect(token).not.toContain(creds.secret);
    expect(token).not.toContain(creds.apiKey);
    expect(Buffer.from(token.split(".")[1], "base64url").toString("latin1")).not.toContain("segredo");
  });

  it("duas cifragens das mesmas credenciais dão cookies diferentes", () => {
    expect(sealCredentials(creds, key)).not.toBe(sealCredentials(creds, key));
  });

  it("recusa cookie adulterado", () => {
    const token = sealCredentials(creds, key);
    const [version, body] = token.split(".");
    const bytes = Buffer.from(body, "base64url");
    bytes[bytes.length - 20] ^= 1;
    expect(openCredentials(`${version}.${bytes.toString("base64url")}`, key)).toBeNull();
    expect(openCredentials("lixo", key)).toBeNull();
  });

  it("recusa cookie cifrado com outra chave mestra", () => {
    const token = sealCredentials(creds, key);
    expect(openCredentials(token, randomBytes(32).toString("base64"))).toBeNull();
  });

  it("recusa cookie com mais de 30 dias, mesmo copiado para outro navegador", () => {
    const issued = Date.UTC(2026, 0, 1);
    const token = sealCredentials(creds, key, issued);
    expect(openCredentials(token, key, issued + 29 * 86_400_000)).toEqual(creds);
    expect(openCredentials(token, key, issued + 31 * 86_400_000)).toBeNull();
  });

  it("exige uma chave mestra de 32 bytes", () => {
    expect(() => sealCredentials(creds, "curta")).toThrow(/ENCRYPTION_KEY/);
  });
});
