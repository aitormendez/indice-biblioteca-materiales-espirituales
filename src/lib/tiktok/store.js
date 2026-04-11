function buildRecordsUrl(config) {
  return `${config.nocodbBaseUrl}/api/v3/data/${config.nocodbBaseId}/${config.nocodbTikTokConnectionsTableId}/records`;
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

function mapRecord(record) {
  const fields = record?.fields ?? {};

  return {
    id: record?.id ?? null,
    targetAccount: fields.target_account ?? "",
    tiktokUsername: fields.tiktok_username ?? null,
    displayName: fields.display_name ?? null,
    openId: fields.open_id ?? null,
    avatarUrl: fields.avatar_url ?? null,
    accessToken: fields.access_token ?? null,
    refreshToken: fields.refresh_token ?? null,
    scope: fields.scope ?? null,
    expiresAt: fields.expires_at ?? null,
    status: fields.status ?? null,
    connectedAt: fields.connected_at ?? null,
    errorLast: fields.error_last ?? null,
  };
}

function buildFields(connection) {
  return {
    target_account: connection.targetAccount,
    tiktok_username: connection.tiktokUsername ?? null,
    display_name: connection.displayName ?? null,
    open_id: connection.openId ?? null,
    avatar_url: connection.avatarUrl ?? null,
    access_token: connection.accessToken ?? null,
    refresh_token: connection.refreshToken ?? null,
    scope: connection.scope ?? null,
    expires_at: connection.expiresAt ?? null,
    status: connection.status ?? null,
    connected_at: connection.connectedAt ?? null,
    error_last: connection.errorLast ?? null,
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

async function listConnections(config, fetchImpl = fetch) {
  const response = await fetchImpl(`${buildRecordsUrl(config)}?page=1&pageSize=100`, {
    headers: buildHeaders(config),
  });
  const payload = await parseResponse(response);

  return Array.isArray(payload.records) ? payload.records.map(mapRecord) : [];
}

export async function getConnectionByTargetAccount(
  config,
  targetAccount,
  fetchImpl = fetch,
) {
  const connections = await listConnections(config, fetchImpl);

  return (
    connections.find((connection) => connection.targetAccount === targetAccount) ??
    null
  );
}

export async function upsertConnection(config, connection, fetchImpl = fetch) {
  const existingConnection = await getConnectionByTargetAccount(
    config,
    connection.targetAccount,
    fetchImpl,
  );
  const payload = existingConnection
    ? [{ id: existingConnection.id, fields: buildFields(connection) }]
    : [{ fields: buildFields(connection) }];
  const response = await fetchImpl(buildRecordsUrl(config), {
    method: existingConnection ? "PATCH" : "POST",
    headers: buildHeaders(config),
    body: JSON.stringify(payload),
  });
  const result = await parseResponse(response);
  const firstRecord = Array.isArray(result.records) ? result.records[0] : null;

  return firstRecord ? mapRecord(firstRecord) : null;
}
