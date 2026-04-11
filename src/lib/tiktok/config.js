const DEFAULT_SCOPE = "user.info.basic,video.publish";
const DEFAULT_TARGET_ACCOUNT = "tiktok:espacio_sutil";
const DEFAULT_REDIRECT_URI = "https://tiktok.espaciosutil.org/tiktok/callback";
const DEFAULT_NOCODB_BASE_URL = "https://nocodb.e451.net";
const DEFAULT_NOCODB_BASE_ID = "p0u38cx07ky3btn";
const DEFAULT_TIKTOK_CONNECTIONS_TABLE_ID = "mj4azuo3317m6z3";
const DEFAULT_DISTRIBUTION_TASKS_TABLE_ID = "mp84my6uijzwm43";
const DEFAULT_N8N_BASE_URL = "https://n8n.e451.net";
const DEFAULT_N8N_TIKTOK_PUBLISH_WEBHOOK_PATH = "cde-publicar-short-v1/tiktok-publish";

function readEnvValue(env, key) {
  if (env && env[key] !== undefined && env[key] !== "") {
    return env[key];
  }

  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }

  return "";
}

export function getTikTokConfig(env = {}) {
  const clientKey = readEnvValue(env, "TIKTOK_CLIENT_KEY");
  const clientSecret = readEnvValue(env, "TIKTOK_CLIENT_SECRET");
  const redirectUri =
    readEnvValue(env, "TIKTOK_REDIRECT_URI") || DEFAULT_REDIRECT_URI;
  const scope = readEnvValue(env, "TIKTOK_SCOPE") || DEFAULT_SCOPE;
  const targetAccount =
    readEnvValue(env, "TIKTOK_TARGET_ACCOUNT") || DEFAULT_TARGET_ACCOUNT;
  const nocodbBaseUrl =
    readEnvValue(env, "NOCODB_BASE_URL") || DEFAULT_NOCODB_BASE_URL;
  const nocodbBaseId =
    readEnvValue(env, "NOCODB_BASE_ID") || DEFAULT_NOCODB_BASE_ID;
  const nocodbTikTokConnectionsTableId =
    readEnvValue(env, "NOCODB_TIKTOK_CONNECTIONS_TABLE_ID") ||
    DEFAULT_TIKTOK_CONNECTIONS_TABLE_ID;
  const nocodbDistributionTasksTableId =
    readEnvValue(env, "NOCODB_DISTRIBUTION_TASKS_TABLE_ID") ||
    DEFAULT_DISTRIBUTION_TASKS_TABLE_ID;
  const nocodbApiToken = readEnvValue(env, "NOCODB_XC_TOKEN");
  const nocodbBasicAuthUser = readEnvValue(env, "NOCODB_BASIC_AUTH_USER");
  const nocodbBasicAuthPassword = readEnvValue(
    env,
    "NOCODB_BASIC_AUTH_PASSWORD",
  );
  const n8nBaseUrl = readEnvValue(env, "N8N_BASE_URL") || DEFAULT_N8N_BASE_URL;
  const n8nBasicAuthUser =
    readEnvValue(env, "N8N_BASIC_AUTH_USER") || nocodbBasicAuthUser;
  const n8nBasicAuthPassword =
    readEnvValue(env, "N8N_BASIC_AUTH_PASSWORD") || nocodbBasicAuthPassword;
  const n8nTikTokPublishWebhookPath =
    readEnvValue(env, "N8N_TIKTOK_PUBLISH_WEBHOOK_PATH") ||
    DEFAULT_N8N_TIKTOK_PUBLISH_WEBHOOK_PATH;

  return {
    clientKey,
    clientSecret,
    redirectUri,
    scope,
    targetAccount,
    nocodbBaseUrl,
    nocodbBaseId,
    nocodbTikTokConnectionsTableId,
    nocodbDistributionTasksTableId,
    nocodbApiToken,
    nocodbBasicAuthUser,
    nocodbBasicAuthPassword,
    n8nBaseUrl,
    n8nBasicAuthUser,
    n8nBasicAuthPassword,
    n8nTikTokPublishWebhookPath,
    configured: Boolean(clientKey && clientSecret && redirectUri),
    nocodbConfigured: Boolean(
      nocodbBaseUrl &&
        nocodbBaseId &&
        nocodbTikTokConnectionsTableId &&
        nocodbDistributionTasksTableId &&
        nocodbApiToken &&
        nocodbBasicAuthUser &&
        nocodbBasicAuthPassword,
    ),
    n8nConfigured: Boolean(
      n8nBaseUrl &&
        n8nBasicAuthUser &&
        n8nBasicAuthPassword &&
        n8nTikTokPublishWebhookPath,
    ),
  };
}

export function assertTikTokServerConfig(env = {}) {
  const config = getTikTokConfig(env);

  if (!config.clientKey || !config.clientSecret) {
    throw new Error(
      "Faltan TIKTOK_CLIENT_KEY o TIKTOK_CLIENT_SECRET en el entorno del servidor.",
    );
  }

  return config;
}
