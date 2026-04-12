const INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const STATUS_URL =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

function buildBearerHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseTikTokJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(async () => ({
    error: {
      message: await response.text(),
    },
  }));

  if (!response.ok || (payload.error?.code && payload.error.code !== "ok")) {
    const errorMessage =
      payload.error?.message ??
      payload.message ??
      fallbackMessage;

    throw new Error(errorMessage);
  }

  return payload;
}

function buildPostText(task) {
  return [task.captionText?.trim(), task.hashtags?.trim()]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function resolveAssetUrl(task) {
  return [
    task.resolvedAssetUrl?.trim(),
    task.resolvedAssetFallbackUrl?.trim(),
    task.resolvedPreviewAssetUrl?.trim(),
    task.assetUrl?.trim(),
  ].filter(Boolean);
}

async function downloadTikTokAsset(task, fetchImpl) {
  const candidateUrls = resolveAssetUrl(task);

  if (!candidateUrls.length) {
    throw new Error("La tarea TikTok no tiene un asset_url resoluble.");
  }

  let lastStatus = 0;

  for (const assetUrl of candidateUrls) {
    const assetResponse = await fetchImpl(assetUrl);

    if (assetResponse.ok) {
      return {
        assetUrl,
        assetBuffer: Buffer.from(await assetResponse.arrayBuffer()),
      };
    }

    lastStatus = assetResponse.status;
  }

  throw new Error(
    `No se ha podido descargar el vídeo TikTok (${lastStatus || "sin respuesta"}).`,
  );
}

function extractPostId(payload) {
  return (
    payload.data?.publicaly_available_post_id ??
    payload.data?.publicly_available_post_id ??
    payload.data?.post_id ??
    null
  );
}

export async function publishTikTokTaskDirect({
  task,
  connection,
  fetchImpl = fetch,
  sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => new Date(),
  pollIntervalMs = 3_000,
  maxPollAttempts = 8,
  onProgress = async () => {},
}) {
  if (!connection.accessToken) {
    throw new Error("La conexión TikTok no tiene access_token disponible.");
  }

  const { assetBuffer } = await downloadTikTokAsset(task, fetchImpl);
  const assetSize = assetBuffer.byteLength;

  if (!assetSize) {
    throw new Error("El vídeo TikTok está vacío.");
  }

  const postText = buildPostText(task);
  const initPayload = await parseTikTokJsonResponse(
    await fetchImpl(INIT_URL, {
      method: "POST",
      headers: {
        ...buildBearerHeaders(connection.accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: postText || task.title || undefined,
          privacy_level: task.tiktokPrivacyLevel,
          disable_comment: Boolean(task.tiktokDisableComment),
          disable_duet: Boolean(task.tiktokDisableDuet),
          disable_stitch: Boolean(task.tiktokDisableStitch),
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: assetSize,
          chunk_size: assetSize,
          total_chunk_count: 1,
        },
      }),
    }),
    "TikTok no aceptó la inicialización de FILE_UPLOAD.",
  );

  const publishId = initPayload.data?.publish_id ?? null;
  const uploadUrl = initPayload.data?.upload_url ?? null;

  if (!publishId || !uploadUrl) {
    throw new Error("TikTok no devolvió publish_id o upload_url para FILE_UPLOAD.");
  }

  await onProgress({
    publishId,
    status: "INIT_COMPLETE",
  });

  const uploadResponse = await fetchImpl(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(assetSize),
      "Content-Range": `bytes 0-${assetSize - 1}/${assetSize}`,
    },
    body: assetBuffer,
  });

  if (![200, 201, 204].includes(uploadResponse.status)) {
    const uploadMessage = await uploadResponse.text().catch(() => "null");

    throw new Error(`${uploadResponse.status} - ${uploadMessage || "null"}`);
  }

  await onProgress({
    publishId,
    status: "FILE_UPLOADED",
  });

  let lastStatus = "FILE_UPLOADED";

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    if (attempt > 0) {
      await sleepImpl(pollIntervalMs);
    }

    const statusPayload = await parseTikTokJsonResponse(
      await fetchImpl(STATUS_URL, {
        method: "POST",
        headers: {
          ...buildBearerHeaders(connection.accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publish_id: publishId,
        }),
      }),
      "TikTok no devolvió estado de publicación.",
    );

    const currentStatus = statusPayload.data?.status ?? lastStatus;
    lastStatus = currentStatus;

    await onProgress({
      publishId,
      status: currentStatus,
    });

    if (currentStatus === "PUBLISH_COMPLETE") {
      return {
        publishId,
        state: "published",
        tiktokStatusLast: currentStatus,
        externalPostId: extractPostId(statusPayload),
        externalPostUrl: null,
        publishedAt: now().toISOString(),
        errorLast: null,
      };
    }

    if (currentStatus === "FAILED") {
      return {
        publishId,
        state: "failed",
        tiktokStatusLast: currentStatus,
        externalPostId: null,
        externalPostUrl: null,
        publishedAt: null,
        errorLast: statusPayload.data?.fail_reason || "TikTok devolvió FAILED.",
      };
    }
  }

  return {
    publishId,
    state: "failed",
    tiktokStatusLast: lastStatus,
    externalPostId: null,
    externalPostUrl: null,
    publishedAt: null,
    errorLast: `Timeout esperando el estado final de TikTok (${lastStatus}).`,
  };
}
