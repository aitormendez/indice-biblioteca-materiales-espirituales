import type { APIRoute } from "astro";

import { assertTikTokServerConfig } from "../../lib/tiktok/config.js";
import {
  exchangeCodeForTokens,
  fetchTikTokUserInfo,
  TIKTOK_STATE_COOKIE,
  TIKTOK_TARGET_COOKIE,
} from "../../lib/tiktok/oauth.js";
import { upsertConnection } from "../../lib/tiktok/store.js";

export const prerender = false;

function redirectToLanding(requestUrl: URL, params: Record<string, string>) {
  const landingUrl = new URL("/tiktok/", requestUrl);

  for (const [key, value] of Object.entries(params)) {
    landingUrl.searchParams.set(key, value);
  }

  return Response.redirect(landingUrl, 302);
}

export const GET: APIRoute = async ({ cookies, request }) => {
  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (error || errorDescription) {
    return redirectToLanding(requestUrl, {
      callback: "error",
      message: errorDescription ?? error ?? "TikTok ha rechazado la autorización.",
    });
  }

  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const storedState = cookies.get(TIKTOK_STATE_COOKIE)?.value;

  if (!code) {
    return redirectToLanding(requestUrl, {
      callback: "error",
      message: "TikTok no ha devuelto ningún código de autorización.",
    });
  }

  if (!returnedState || !storedState || returnedState !== storedState) {
    return redirectToLanding(requestUrl, {
      callback: "error",
      message: "El estado OAuth de TikTok no coincide con la sesión iniciada.",
    });
  }

  try {
    const config = assertTikTokServerConfig(import.meta.env);
    const targetAccount =
      cookies.get(TIKTOK_TARGET_COOKIE)?.value ?? config.targetAccount;
    const tokenData = await exchangeCodeForTokens({
      code,
      clientKey: config.clientKey,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });
    const userInfo = await fetchTikTokUserInfo(tokenData.accessToken);
    const expiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
      : null;

    await upsertConnection(config.connectionsFile, {
      targetAccount,
      openId: userInfo.open_id || tokenData.openId,
      displayName: userInfo.display_name || targetAccount,
      avatarUrl: userInfo.avatar_url || "",
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      scope: tokenData.scope || config.scope,
      expiresAt,
    });

    cookies.delete(TIKTOK_STATE_COOKIE, { path: "/" });
    cookies.delete(TIKTOK_TARGET_COOKIE, { path: "/" });

    return redirectToLanding(requestUrl, {
      callback: "success",
      target_account: targetAccount,
    });
  } catch (error) {
    return redirectToLanding(requestUrl, {
      callback: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se ha podido completar la autorización de TikTok.",
    });
  }
};
