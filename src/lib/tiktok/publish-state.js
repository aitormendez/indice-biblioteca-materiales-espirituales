export function buildTikTokStartFields() {
  return {
    error_last: null,
    tiktok_status_last: "STARTING_UPLOAD",
  };
}

export function buildTikTokProgressFields({ publishId, status }) {
  return {
    tiktok_publish_id: publishId ?? null,
    tiktok_status_last: status ?? null,
  };
}

export function buildTikTokResultFields(result) {
  return {
    state: result.state,
    tiktok_publish_id: result.publishId,
    tiktok_status_last: result.tiktokStatusLast,
    external_post_id: result.externalPostId,
    external_post_url: result.externalPostUrl,
    published_at: result.publishedAt,
    error_last: result.errorLast,
  };
}

export function buildTikTokFailureFields({ publishId, statusLast, error }) {
  return {
    state: "failed",
    tiktok_publish_id: publishId,
    tiktok_status_last: statusLast,
    error_last:
      error instanceof Error
        ? error.message
        : "No se ha podido publicar en TikTok.",
  };
}
