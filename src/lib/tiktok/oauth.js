import { randomBytes } from "node:crypto";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url";

export const TIKTOK_STATE_COOKIE = "tiktok_oauth_state";
export const TIKTOK_TARGET_COOKIE = "tiktok_target_account";

export function buildTikTokAuthorizeUrl({
  clientKey,
  redirectUri,
  scope,
  state,
}) {
  const url = new URL(AUTHORIZE_URL);

  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return url.toString();
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export async function exchangeCodeForTokens(
  { code, clientKey, clientSecret, redirectUri },
  fetchImpl = fetch,
) {
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(async () => ({
    error: {
      message: await response.text(),
    },
  }));

  if (!response.ok || payload.error?.code && payload.error.code !== "ok") {
    const message =
      payload.error?.message ??
      payload.error_description ??
      "TikTok no ha aceptado el intercambio del código OAuth.";

    throw new Error(message);
  }

  return {
    accessToken: payload.access_token ?? payload.data?.access_token ?? "",
    refreshToken: payload.refresh_token ?? payload.data?.refresh_token ?? "",
    openId: payload.open_id ?? payload.data?.open_id ?? "",
    scope: payload.scope ?? payload.data?.scope ?? "",
    expiresIn: Number(payload.expires_in ?? payload.data?.expires_in ?? 0),
  };
}

export async function fetchTikTokUserInfo(accessToken, fetchImpl = fetch) {
  const response = await fetchImpl(USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(async () => ({
    error: {
      message: await response.text(),
    },
  }));

  if (!response.ok || payload.error?.code && payload.error.code !== "ok") {
    const message =
      payload.error?.message ??
      "No se ha podido recuperar la identidad básica de la cuenta de TikTok.";

    throw new Error(message);
  }

  return payload.data?.user ?? {};
}
