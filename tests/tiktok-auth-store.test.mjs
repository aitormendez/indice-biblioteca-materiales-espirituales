import test from "node:test";
import assert from "node:assert/strict";

import { buildTikTokAuthorizeUrl } from "../src/lib/tiktok/oauth.js";
import {
  getConnectionByTargetAccount,
  upsertConnection,
} from "../src/lib/tiktok/store.js";

const nocodbConfig = {
  nocodbBaseUrl: "https://nocodb.e451.net",
  nocodbBaseId: "p0u38cx07ky3btn",
  nocodbTikTokConnectionsTableId: "mj4azuo3317m6z3",
  nocodbApiToken: "xc-token-test",
  nocodbBasicAuthUser: "interno",
  nocodbBasicAuthPassword: "secret",
};

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

test("getConnectionByTargetAccount maps a NocoDB record to the app shape", async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    return new Response(
      JSON.stringify({
        records: [
          {
            id: 7,
            fields: {
              target_account: "espacio_sutil",
              tiktok_username: "espacio_sutil",
              display_name: "Espacio Sutil",
              open_id: "open-id-1",
              avatar_url: "https://example.com/avatar.jpg",
              access_token: "access-token-1",
              refresh_token: "refresh-token-1",
              scope: "user.info.basic,video.publish",
              expires_at: "2026-04-11T18:30:00.000Z",
              status: "connected",
              connected_at: "2026-04-11T17:30:00.000Z",
              error_last: null,
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const storedConnection = await getConnectionByTargetAccount(
    nocodbConfig,
    "espacio_sutil",
    fetchMock,
  );

  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /\/api\/v3\/data\/p0u38cx07ky3btn\/mj4azuo3317m6z3\/records/);
  assert.equal(storedConnection?.id, 7);
  assert.equal(storedConnection?.targetAccount, "espacio_sutil");
  assert.equal(storedConnection?.tiktokUsername, "espacio_sutil");
  assert.equal(storedConnection?.displayName, "Espacio Sutil");
  assert.equal(storedConnection?.accessToken, "access-token-1");
  assert.equal(storedConnection?.status, "connected");
});

test("upsertConnection creates a new NocoDB record when target_account does not exist", async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (fetchCalls.length === 1) {
      return new Response(JSON.stringify({ records: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        records: [
          {
            id: 11,
            fields: {
              target_account: "espacio_sutil",
              tiktok_username: "espacio_sutil",
              display_name: "Espacio Sutil",
              open_id: "open-id-1",
              avatar_url: "https://example.com/avatar.jpg",
              access_token: "access-token-1",
              refresh_token: "refresh-token-1",
              scope: "user.info.basic,video.publish",
              expires_at: "2026-04-11T18:30:00.000Z",
              status: "connected",
              connected_at: "2026-04-11T17:30:00.000Z",
              error_last: null,
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const storedConnection = await upsertConnection(
    nocodbConfig,
    {
      targetAccount: "espacio_sutil",
      tiktokUsername: "espacio_sutil",
      openId: "open-id-1",
      displayName: "Espacio Sutil",
      avatarUrl: "https://example.com/avatar.jpg",
      accessToken: "access-token-1",
      refreshToken: "refresh-token-1",
      scope: "user.info.basic,video.publish",
      expiresAt: "2026-04-11T18:30:00.000Z",
      status: "connected",
      connectedAt: "2026-04-11T17:30:00.000Z",
      errorLast: null,
    },
    fetchMock,
  );

  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[1].options.method, "POST");
  const createPayload = JSON.parse(fetchCalls[1].options.body);
  assert.deepEqual(createPayload, [
    {
      fields: {
        target_account: "espacio_sutil",
        tiktok_username: "espacio_sutil",
        display_name: "Espacio Sutil",
        open_id: "open-id-1",
        avatar_url: "https://example.com/avatar.jpg",
        access_token: "access-token-1",
        refresh_token: "refresh-token-1",
        scope: "user.info.basic,video.publish",
        expires_at: "2026-04-11T18:30:00.000Z",
        status: "connected",
        connected_at: "2026-04-11T17:30:00.000Z",
        error_last: null,
      },
    },
  ]);
  assert.equal(storedConnection?.id, 11);
});

test("upsertConnection updates an existing NocoDB record when target_account already exists", async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (fetchCalls.length === 1) {
      return new Response(
        JSON.stringify({
          records: [
            {
              id: 9,
              fields: {
                target_account: "espacio_sutil",
                display_name: "Espacio Sutil",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        records: [
          {
            id: 9,
            fields: {
              target_account: "espacio_sutil",
              display_name: "Espacio Sutil Actualizado",
              status: "connected",
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  await upsertConnection(
    nocodbConfig,
    {
      targetAccount: "espacio_sutil",
      displayName: "Espacio Sutil Actualizado",
      status: "connected",
    },
    fetchMock,
  );

  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[1].options.method, "PATCH");
  const updatePayload = JSON.parse(fetchCalls[1].options.body);
  assert.deepEqual(updatePayload, [
    {
      id: 9,
      fields: {
        target_account: "espacio_sutil",
        tiktok_username: null,
        display_name: "Espacio Sutil Actualizado",
        open_id: null,
        avatar_url: null,
        access_token: null,
        refresh_token: null,
        scope: null,
        expires_at: null,
        status: "connected",
        connected_at: null,
        error_last: null,
      },
    },
  ]);
});
