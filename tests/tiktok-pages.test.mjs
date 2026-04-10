import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

test("build includes the TikTok landing page", () => {
  const pagePath = resolve(projectRoot, "dist", "tiktok", "index.html");

  assert.equal(existsSync(pagePath), true, "Expected /tiktok/index.html to exist after build");

  const html = readFileSync(pagePath, "utf8");

  assert.match(html, /Conectar TikTok/i);
  assert.match(html, /Publicar en TikTok/i);
});

test("build includes the TikTok callback page", () => {
  const pagePath = resolve(projectRoot, "dist", "tiktok", "callback", "index.html");

  assert.equal(existsSync(pagePath), true, "Expected /tiktok/callback/index.html to exist after build");

  const html = readFileSync(pagePath, "utf8");

  assert.match(html, /Callback de TikTok/i);
  assert.match(html, /autorización/i);
});
