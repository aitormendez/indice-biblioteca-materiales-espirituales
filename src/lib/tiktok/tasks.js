const EDITORIAL_BASE_URL = "https://editorial.e451.net";

function buildRecordsUrl(config) {
  return `${config.nocodbBaseUrl}/api/v3/data/${config.nocodbBaseId}/${config.nocodbDistributionTasksTableId}/records`;
}

function buildHeaders(config) {
  return {
    "Content-Type": "application/json",
    "xc-token": config.nocodbApiToken,
    Authorization: `Basic ${Buffer.from(
      `${config.nocodbBasicAuthUser}:${config.nocodbBasicAuthPassword}`,
    ).toString("base64")}`,
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(async () => ({
    error: {
      message: await response.text(),
    },
  }));

  if (!response.ok) {
    throw new Error(
      payload.message ??
        payload.error?.message ??
        "NocoDB ha devuelto un error inesperado.",
    );
  }

  return payload;
}

function mapRecord(record) {
  const fields = record?.fields ?? {};

  return {
    id: record?.id ?? null,
    title: fields.title ?? "",
    targetAccount: fields.target_account ?? "",
    channel: fields.channel ?? "",
    publishMode: fields.publish_mode ?? "",
    state: fields.state ?? "",
    pieceDir: fields.piece_dir ?? "",
    assetUrl: fields.asset_url ?? "",
    coverUrl: fields.cover_url ?? "",
    captionText: fields.caption_text ?? "",
    hashtags: fields.hashtags ?? "",
    externalPostId: fields.external_post_id ?? null,
    externalPostUrl: fields.external_post_url ?? null,
    errorLast: fields.error_last ?? null,
    publishedAt: fields.published_at ?? null,
    privacyStatus: fields.privacy_status ?? null,
  };
}

export function resolveTikTokTaskAssets(task) {
  const pieceDir = task.pieceDir?.trim();
  const explicitAssetUrl = task.assetUrl?.trim();
  const explicitCoverUrl = task.coverUrl?.trim();
  const preferredTikTokAssetUrl = pieceDir
    ? `${EDITORIAL_BASE_URL}/${pieceDir}/tiktok/video.mp4`
    : null;
  const masterAssetUrl = pieceDir
    ? `${EDITORIAL_BASE_URL}/${pieceDir}/master/video.mp4`
    : null;
  const masterCoverUrl = pieceDir
    ? `${EDITORIAL_BASE_URL}/${pieceDir}/master/poster.jpg`
    : null;

  return {
    ...task,
    resolvedAssetUrl: explicitAssetUrl || preferredTikTokAssetUrl,
    resolvedAssetFallbackUrl: explicitAssetUrl ? null : masterAssetUrl,
    resolvedPreviewAssetUrl: explicitAssetUrl || masterAssetUrl,
    resolvedCoverUrl: explicitCoverUrl || masterCoverUrl,
  };
}

export async function getReadyTikTokTaskByTargetAccount(
  config,
  targetAccount,
  fetchImpl = fetch,
) {
  const response = await fetchImpl(`${buildRecordsUrl(config)}?page=1&pageSize=100`, {
    headers: buildHeaders(config),
  });
  const payload = await parseResponse(response);
  const records = Array.isArray(payload.records) ? payload.records : [];
  const matchingTask = records
    .map(mapRecord)
    .filter(
      (task) =>
        task.channel === "tiktok_video" &&
        task.state === "ready" &&
        task.targetAccount === targetAccount,
    )
    .sort((left, right) => (right.id ?? 0) - (left.id ?? 0))[0];

  return matchingTask ? resolveTikTokTaskAssets(matchingTask) : null;
}
