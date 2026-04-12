import test from "node:test";
import assert from "node:assert/strict";

import { publishTikTokTaskDirect } from "../src/lib/tiktok/direct-publish.js";

const baseConnection = {
  accessToken: "token-123",
};

const baseTask = {
  id: 14,
  title: "Short de prueba",
  captionText: "Texto de prueba",
  hashtags: "#uno #dos",
  resolvedAssetUrl: "https://editorial.e451.net/pieza/tiktok/video.mp4",
  resolvedAssetFallbackUrl: "https://editorial.e451.net/pieza/master/video.mp4",
  tiktokPrivacyLevel: "SELF_ONLY",
  tiktokDisableComment: false,
  tiktokDisableDuet: true,
  tiktokDisableStitch: false,
};

test("publishTikTokTaskDirect completa FILE_UPLOAD y devuelve published", async () => {
  const fetchCalls = [];
  let statusCalls = 0;

  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    if (url === baseTask.resolvedAssetUrl) {
      return new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
        },
      });
    }

    if (url === "https://open.tiktokapis.com/v2/post/publish/video/init/") {
      return new Response(
        JSON.stringify({
          data: {
            publish_id: "publish-123",
            upload_url: "https://upload.tiktok.test/upload-123",
          },
          error: {
            code: "ok",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "https://upload.tiktok.test/upload-123") {
      return new Response(null, { status: 201 });
    }

    if (url === "https://open.tiktokapis.com/v2/post/publish/status/fetch/") {
      statusCalls += 1;

      if (statusCalls === 1) {
        return new Response(
          JSON.stringify({
            data: {
              status: "PROCESSING_DOWNLOAD",
              fail_reason: "",
            },
            error: {
              code: "ok",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            status: "PUBLISH_COMPLETE",
            publicaly_available_post_id: "post-123",
          },
          error: {
            code: "ok",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`URL inesperada en el test: ${url}`);
  };

  const result = await publishTikTokTaskDirect(
    {
      task: baseTask,
      connection: baseConnection,
      fetchImpl: fetchMock,
      sleepImpl: async () => {},
      now: () => new Date("2026-04-12T11:30:00.000Z"),
      pollIntervalMs: 1,
      maxPollAttempts: 3,
    },
  );

  assert.equal(result.publishId, "publish-123");
  assert.equal(result.state, "published");
  assert.equal(result.tiktokStatusLast, "PUBLISH_COMPLETE");
  assert.equal(result.externalPostId, "post-123");
  assert.equal(result.publishedAt, "2026-04-12T11:30:00.000Z");
  assert.equal(result.errorLast, null);

  assert.equal(fetchCalls[0].url, baseTask.resolvedAssetUrl);
  assert.equal(fetchCalls[1].url, "https://open.tiktokapis.com/v2/post/publish/video/init/");
  assert.equal(fetchCalls[2].url, "https://upload.tiktok.test/upload-123");
  assert.equal(fetchCalls[2].options.method, "PUT");
  assert.equal(fetchCalls[2].options.headers["Content-Length"], "4");
  assert.equal(fetchCalls[2].options.headers["Content-Range"], "bytes 0-3/4");
  assert.equal(fetchCalls[3].url, "https://open.tiktokapis.com/v2/post/publish/status/fetch/");
});

test("publishTikTokTaskDirect usa el fallback master cuando la variante TikTok devuelve 404", async () => {
  const fetchCalls = [];

  const fetchMock = async (url) => {
    fetchCalls.push(url);

    if (url === baseTask.resolvedAssetUrl) {
      return new Response("not found", { status: 404 });
    }

    if (url === baseTask.resolvedAssetFallbackUrl) {
      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
        },
      });
    }

    if (url === "https://open.tiktokapis.com/v2/post/publish/video/init/") {
      return new Response(
        JSON.stringify({
          data: {
            publish_id: "publish-fallback",
            upload_url: "https://upload.tiktok.test/upload-fallback",
          },
          error: { code: "ok" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "https://upload.tiktok.test/upload-fallback") {
      return new Response(null, { status: 201 });
    }

    if (url === "https://open.tiktokapis.com/v2/post/publish/status/fetch/") {
      return new Response(
        JSON.stringify({
          data: {
            status: "PUBLISH_COMPLETE",
            publicaly_available_post_id: "post-fallback",
          },
          error: { code: "ok" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`URL inesperada en el test: ${url}`);
  };

  const result = await publishTikTokTaskDirect({
    task: baseTask,
    connection: baseConnection,
    fetchImpl: fetchMock,
    sleepImpl: async () => {},
    now: () => new Date("2026-04-12T16:20:00.000Z"),
    pollIntervalMs: 1,
    maxPollAttempts: 1,
  });

  assert.equal(result.state, "published");
  assert.equal(result.publishId, "publish-fallback");
  assert.deepEqual(fetchCalls.slice(0, 2), [
    baseTask.resolvedAssetUrl,
    baseTask.resolvedAssetFallbackUrl,
  ]);
});

test("publishTikTokTaskDirect devuelve failed cuando TikTok responde FAILED", async () => {
  const fetchMock = async (url) => {
    if (url === baseTask.resolvedAssetUrl) {
      return new Response(Uint8Array.from([7, 8]), {
        status: 200,
        headers: { "Content-Type": "video/mp4" },
      });
    }

    if (url === "https://open.tiktokapis.com/v2/post/publish/video/init/") {
      return new Response(
        JSON.stringify({
          data: {
            publish_id: "publish-456",
            upload_url: "https://upload.tiktok.test/upload-456",
          },
          error: { code: "ok" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url === "https://upload.tiktok.test/upload-456") {
      return new Response(null, { status: 201 });
    }

    if (url === "https://open.tiktokapis.com/v2/post/publish/status/fetch/") {
      return new Response(
        JSON.stringify({
          data: {
            status: "FAILED",
            fail_reason: "internal",
          },
          error: { code: "ok" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`URL inesperada en el test: ${url}`);
  };

  const result = await publishTikTokTaskDirect({
    task: baseTask,
    connection: baseConnection,
    fetchImpl: fetchMock,
    sleepImpl: async () => {},
    pollIntervalMs: 1,
    maxPollAttempts: 1,
  });

  assert.equal(result.publishId, "publish-456");
  assert.equal(result.state, "failed");
  assert.equal(result.tiktokStatusLast, "FAILED");
  assert.equal(result.errorLast, "internal");
  assert.equal(result.externalPostId, null);
  assert.equal(result.publishedAt, null);
});
