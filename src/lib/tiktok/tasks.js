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
    tiktokPrivacyLevel: fields.tiktok_privacy_level ?? null,
    tiktokDisableComment: Boolean(fields.tiktok_disable_comment),
    tiktokDisableDuet: Boolean(fields.tiktok_disable_duet),
    tiktokDisableStitch: Boolean(fields.tiktok_disable_stitch),
    tiktokPublishId: fields.tiktok_publish_id ?? null,
    tiktokStatusLast: fields.tiktok_status_last ?? null,
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

export async function getTikTokTaskById(config, taskId, fetchImpl = fetch) {
  const response = await fetchImpl(
    `${buildRecordsUrl(config)}?page=1&pageSize=1&where=${encodeURIComponent(`(Id,eq,${taskId})`)}`,
    {
      headers: buildHeaders(config),
    },
  );
  const payload = await parseResponse(response);
  const records = Array.isArray(payload.records) ? payload.records : [];
  const task = records[0] ? mapRecord(records[0]) : null;

  return task ? resolveTikTokTaskAssets(task) : null;
}

export async function updateTikTokTaskSettings(
  config,
  settings,
  fetchImpl = fetch,
) {
  const response = await fetchImpl(buildRecordsUrl(config), {
    method: "PATCH",
    headers: buildHeaders(config),
    body: JSON.stringify([
      {
        id: settings.id,
        fields: {
          tiktok_privacy_level: settings.tiktokPrivacyLevel ?? null,
          tiktok_disable_comment: Boolean(settings.tiktokDisableComment),
          tiktok_disable_duet: Boolean(settings.tiktokDisableDuet),
          tiktok_disable_stitch: Boolean(settings.tiktokDisableStitch),
        },
      },
    ]),
  });
  const payload = await parseResponse(response);
  const firstRecord = Array.isArray(payload.records) ? payload.records[0] : null;

  return firstRecord ? mapRecord(firstRecord) : null;
}

export async function patchDistributionTask(
  config,
  taskId,
  fields,
  fetchImpl = fetch,
) {
  const response = await fetchImpl(buildRecordsUrl(config), {
    method: "PATCH",
    headers: buildHeaders(config),
    body: JSON.stringify([
      {
        id: taskId,
        fields,
      },
    ]),
  });
  const payload = await parseResponse(response);
  const firstRecord = Array.isArray(payload.records) ? payload.records[0] : null;

  return firstRecord ? mapRecord(firstRecord) : null;
}
