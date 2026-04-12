import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTikTokFailureFields,
  buildTikTokProgressFields,
  buildTikTokResultFields,
  buildTikTokStartFields,
} from "../src/lib/tiktok/publish-state.js";

test("buildTikTokStartFields no intenta usar un estado inválido", () => {
  assert.deepEqual(buildTikTokStartFields(), {
    error_last: null,
    tiktok_status_last: "STARTING_UPLOAD",
  });
});

test("buildTikTokProgressFields actualiza publish_id y status_last", () => {
  assert.deepEqual(
    buildTikTokProgressFields({
      publishId: "publish-123",
      status: "FILE_UPLOADED",
    }),
    {
      tiktok_publish_id: "publish-123",
      tiktok_status_last: "FILE_UPLOADED",
    },
  );
});

test("buildTikTokResultFields persiste el resultado final de TikTok", () => {
  assert.deepEqual(
    buildTikTokResultFields({
      state: "published",
      publishId: "publish-123",
      tiktokStatusLast: "PUBLISH_COMPLETE",
      externalPostId: "post-123",
      externalPostUrl: null,
      publishedAt: "2026-04-12T15:00:00.000Z",
      errorLast: null,
    }),
    {
      state: "published",
      tiktok_publish_id: "publish-123",
      tiktok_status_last: "PUBLISH_COMPLETE",
      external_post_id: "post-123",
      external_post_url: null,
      published_at: "2026-04-12T15:00:00.000Z",
      error_last: null,
    },
  );
});

test("buildTikTokFailureFields marca failed con el mensaje de error", () => {
  const error = new Error("Invalid option(s) \"processing\" provided for column \"state\"");

  assert.deepEqual(
    buildTikTokFailureFields({
      publishId: "publish-123",
      statusLast: "FAILED",
      error,
    }),
    {
      state: "failed",
      tiktok_publish_id: "publish-123",
      tiktok_status_last: "FAILED",
      error_last: "Invalid option(s) \"processing\" provided for column \"state\"",
    },
  );
});
