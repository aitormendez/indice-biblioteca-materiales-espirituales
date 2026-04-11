function buildWebhookUrl(config) {
  const normalizedBaseUrl = config.n8nBaseUrl.replace(/\/+$/, "");
  const normalizedPath = config.n8nTikTokPublishWebhookPath.replace(/^\/+/, "");

  return `${normalizedBaseUrl}/webhook/${normalizedPath}`;
}

function buildHeaders(config) {
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(
      `${config.n8nBasicAuthUser}:${config.n8nBasicAuthPassword}`,
    ).toString("base64")}`,
  };
}

export async function triggerTikTokPublish(
  config,
  { taskId, targetAccount },
  fetchImpl = fetch,
) {
  const response = await fetchImpl(buildWebhookUrl(config), {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify({
      task_id: taskId,
      target_account: targetAccount,
      source: "tiktok-miniapp",
    }),
  });

  const payload = await response.json().catch(async () => ({
    message: await response.text(),
  }));

  if (!response.ok) {
    throw new Error(
      payload.message ?? "n8n no aceptó la petición de publicación TikTok.",
    );
  }

  return payload;
}
