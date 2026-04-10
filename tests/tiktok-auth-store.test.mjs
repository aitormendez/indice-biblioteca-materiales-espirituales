import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildTikTokAuthorizeUrl } from "../src/lib/tiktok/oauth.js";
import {
  getConnectionByTargetAccount,
  upsertConnection,
} from "../src/lib/tiktok/store.js";

test("buildTikTokAuthorizeUrl includes the configured redirect URI and scopes", () => {
  const url = buildTikTokAuthorizeUrl({
    clientKey: "client-key-123",
    redirectUri: "https://espaciosutil.org/tiktok/callback",
    scope: "user.info.basic,video.publish",
    state: "state-456",
  });

  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://www.tiktok.com");
  assert.equal(parsed.pathname, "/v2/auth/authorize/");
  assert.equal(parsed.searchParams.get("client_key"), "client-key-123");
  assert.equal(parsed.searchParams.get("redirect_uri"), "https://espaciosutil.org/tiktok/callback");
  assert.equal(parsed.searchParams.get("scope"), "user.info.basic,video.publish");
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("state"), "state-456");
});

test("upsertConnection persists and replaces a connection for the same target account", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tiktok-store-"));
  const storeFile = join(directory, "connections.json");

  await upsertConnection(storeFile, {
    targetAccount: "espacio_sutil",
    openId: "open-id-1",
    displayName: "Espacio Sutil",
    avatarUrl: "https://example.com/avatar.jpg",
    accessToken: "access-token-1",
    refreshToken: "refresh-token-1",
    scope: "user.info.basic,video.publish",
    expiresAt: "2026-04-10T18:30:00.000Z",
  });

  await upsertConnection(storeFile, {
    targetAccount: "espacio_sutil",
    openId: "open-id-1",
    displayName: "Espacio Sutil Actualizado",
    avatarUrl: "https://example.com/avatar-2.jpg",
    accessToken: "access-token-2",
    refreshToken: "refresh-token-2",
    scope: "user.info.basic,video.publish",
    expiresAt: "2026-04-11T18:30:00.000Z",
  });

  const storedConnection = await getConnectionByTargetAccount(storeFile, "espacio_sutil");
  const raw = JSON.parse(await readFile(storeFile, "utf8"));

  assert.equal(raw.connections.length, 1);
  assert.equal(storedConnection?.displayName, "Espacio Sutil Actualizado");
  assert.equal(storedConnection?.accessToken, "access-token-2");
  assert.equal(storedConnection?.refreshToken, "refresh-token-2");
  assert.equal(storedConnection?.expiresAt, "2026-04-11T18:30:00.000Z");
});
