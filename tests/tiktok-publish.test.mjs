import test from "node:test";
import assert from "node:assert/strict";

import { triggerTikTokPublish } from "../src/lib/tiktok/publish.js";

const publishConfig = {
  n8nBaseUrl: "https://n8n.e451.net",
  n8nBasicAuthUser: "interno",
  n8nBasicAuthPassword: "secret",
  n8nTikTokPublishWebhookPath: "cde-publicar-short-v1/tiktok-publish",
};

test("triggerTikTokPublish posts task_id to the configured n8n webhook", async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    return new Response(
      JSON.stringify({ ok: true, queued: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const result = await triggerTikTokPublish(
    publishConfig,
    { taskId: 14, targetAccount: "tiktok:espacio_sutil" },
    fetchMock,
  );

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0].url,
    "https://n8n.e451.net/webhook/cde-publicar-short-v1/tiktok-publish",
  );
  assert.equal(fetchCalls[0].options.method, "POST");
  assert.match(fetchCalls[0].options.headers.Authorization, /^Basic /);
  assert.equal(fetchCalls[0].options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(fetchCalls[0].options.body), {
    task_id: 14,
    target_account: "tiktok:espacio_sutil",
    source: "tiktok-miniapp",
  });
  assert.deepEqual(result, { ok: true, queued: true });
});
