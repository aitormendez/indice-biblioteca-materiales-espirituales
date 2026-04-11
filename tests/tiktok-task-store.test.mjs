import test from "node:test";
import assert from "node:assert/strict";

import {
  getReadyTikTokTaskByTargetAccount,
  resolveTikTokTaskAssets,
  updateTikTokTaskSettings,
} from "../src/lib/tiktok/tasks.js";

const nocodbConfig = {
  nocodbBaseUrl: "https://nocodb.e451.net",
  nocodbBaseId: "p0u38cx07ky3btn",
  nocodbDistributionTasksTableId: "mp84my6uijzwm43",
  nocodbApiToken: "xc-token-test",
  nocodbBasicAuthUser: "interno",
  nocodbBasicAuthPassword: "secret",
};

test("getReadyTikTokTaskByTargetAccount returns the latest ready TikTok task for the target account", async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    return new Response(
      JSON.stringify({
        records: [
          {
            id: 12,
            fields: {
              target_account: "tiktok:otra_cuenta",
              channel: "tiktok_video",
              state: "ready",
              title: "Ignorada por cuenta",
            },
          },
          {
            id: 13,
            fields: {
              target_account: "tiktok:espacio_sutil",
              channel: "tiktok_video",
              state: "draft",
              title: "Ignorada por estado",
            },
          },
          {
            id: 14,
            fields: {
              target_account: "tiktok:espacio_sutil",
              channel: "tiktok_video",
              state: "ready",
              title: "Tarea TikTok lista",
              caption_text: "Texto base",
              hashtags: "#uno #dos",
              piece_dir: "pieza-001",
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const task = await getReadyTikTokTaskByTargetAccount(
    nocodbConfig,
    "tiktok:espacio_sutil",
    fetchMock,
  );

  assert.equal(fetchCalls.length, 1);
  assert.match(
    fetchCalls[0].url,
    /\/api\/v3\/data\/p0u38cx07ky3btn\/mp84my6uijzwm43\/records/,
  );
  assert.equal(task?.id, 14);
  assert.equal(task?.targetAccount, "tiktok:espacio_sutil");
  assert.equal(task?.title, "Tarea TikTok lista");
  assert.equal(task?.state, "ready");
});

test("resolveTikTokTaskAssets uses explicit overrides when present", () => {
  const task = resolveTikTokTaskAssets({
    pieceDir: "pieza-001",
    assetUrl: "https://cdn.example.com/video.mp4",
    coverUrl: "https://cdn.example.com/poster.jpg",
  });

  assert.equal(task.resolvedAssetUrl, "https://cdn.example.com/video.mp4");
  assert.equal(task.resolvedCoverUrl, "https://cdn.example.com/poster.jpg");
});

test("resolveTikTokTaskAssets falls back to editorial paths when overrides are missing", () => {
  const task = resolveTikTokTaskAssets({
    pieceDir: "pieza-001",
    assetUrl: "",
    coverUrl: "",
  });

  assert.equal(
    task.resolvedAssetUrl,
    "https://editorial.e451.net/pieza-001/tiktok/video.mp4",
  );
  assert.equal(
    task.resolvedAssetFallbackUrl,
    "https://editorial.e451.net/pieza-001/master/video.mp4",
  );
  assert.equal(
    task.resolvedCoverUrl,
    "https://editorial.e451.net/pieza-001/master/poster.jpg",
  );
});

test("updateTikTokTaskSettings persists TikTok-specific editorial settings", async () => {
  const fetchCalls = [];
  const fetchMock = async (url, options = {}) => {
    fetchCalls.push({ url, options });

    return new Response(
      JSON.stringify({
        records: [
          {
            id: 14,
            fields: {
              target_account: "tiktok:espacio_sutil",
              channel: "tiktok_video",
              state: "ready",
              tiktok_privacy_level: "SELF_ONLY",
              tiktok_disable_comment: true,
              tiktok_disable_duet: false,
              tiktok_disable_stitch: true,
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const updatedTask = await updateTikTokTaskSettings(
    nocodbConfig,
    {
      id: 14,
      tiktokPrivacyLevel: "SELF_ONLY",
      tiktokDisableComment: true,
      tiktokDisableDuet: false,
      tiktokDisableStitch: true,
    },
    fetchMock,
  );

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].options.method, "PATCH");
  const payload = JSON.parse(fetchCalls[0].options.body);
  assert.deepEqual(payload, [
    {
      id: 14,
      fields: {
        tiktok_privacy_level: "SELF_ONLY",
        tiktok_disable_comment: true,
        tiktok_disable_duet: false,
        tiktok_disable_stitch: true,
      },
    },
  ]);
  assert.equal(updatedTask?.tiktokPrivacyLevel, "SELF_ONLY");
  assert.equal(updatedTask?.tiktokDisableComment, true);
  assert.equal(updatedTask?.tiktokDisableDuet, false);
  assert.equal(updatedTask?.tiktokDisableStitch, true);
});
