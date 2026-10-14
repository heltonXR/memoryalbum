import { test } from "node:test";
import assert from "node:assert/strict";
import { hash, passwordHash, passwordMatches } from "../src/lib/security";
import { attachment, safeName } from "../src/lib/errors";
import { processImage } from "../src/lib/images";
test("palavras-passe com salt e comparação segura", async () => {
  const a = await passwordHash("uma-palavra-passe-longa");
  const b = await passwordHash("uma-palavra-passe-longa");
  assert.notEqual(a, b);
  assert.equal(await passwordMatches("uma-palavra-passe-longa", a), true);
  assert.equal(await passwordMatches("outra-palavra-passe", a), false);
});
test("nomes ZIP não permitem caminhos ou cabeçalhos injetados", () => {
  assert.equal(safeName("../../Família\r\n"), "Familia");
  assert.ok(!attachment("foto\r\nInjected.jpg").includes("\r"));
  assert.equal(hash("segredo").length, 64);
});
test("uploads falsos e vazios são rejeitados", async () => {
  await assert.rejects(() =>
    processImage(Buffer.from("<svg>malicioso</svg>"), "test"),
  );
  await assert.rejects(() => processImage(Buffer.alloc(0), "test"));
});
