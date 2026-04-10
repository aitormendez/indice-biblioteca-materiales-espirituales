import { resolve } from "node:path";

const DEFAULT_SCOPE = "user.info.basic,video.publish";
const DEFAULT_TARGET_ACCOUNT = "espacio_sutil";
const DEFAULT_REDIRECT_URI = "https://espaciosutil.org/tiktok/callback";
const DEFAULT_STORE_FILE = ".data/tiktok-connections.json";

export function getTikTokConfig(env = import.meta.env) {
  const clientKey = env.TIKTOK_CLIENT_KEY ?? "";
  const clientSecret = env.TIKTOK_CLIENT_SECRET ?? "";
  const redirectUri = env.TIKTOK_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;
  const scope = env.TIKTOK_SCOPE ?? DEFAULT_SCOPE;
  const targetAccount = env.TIKTOK_TARGET_ACCOUNT ?? DEFAULT_TARGET_ACCOUNT;
  const connectionsFile = resolve(
    process.cwd(),
    env.TIKTOK_CONNECTIONS_FILE ?? DEFAULT_STORE_FILE,
  );

  return {
    clientKey,
    clientSecret,
    redirectUri,
    scope,
    targetAccount,
    connectionsFile,
    configured: Boolean(clientKey && clientSecret && redirectUri),
  };
}

export function assertTikTokServerConfig(env = import.meta.env) {
  const config = getTikTokConfig(env);

  if (!config.clientKey || !config.clientSecret) {
    throw new Error(
      "Faltan TIKTOK_CLIENT_KEY o TIKTOK_CLIENT_SECRET en el entorno del servidor.",
    );
  }

  return config;
}
