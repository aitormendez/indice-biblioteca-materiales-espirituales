import type { APIRoute } from "astro";

import { assertTikTokServerConfig } from "../../../lib/tiktok/config.js";
import {
  buildTikTokAuthorizeUrl,
  createOAuthState,
  TIKTOK_STATE_COOKIE,
  TIKTOK_TARGET_COOKIE,
} from "../../../lib/tiktok/oauth.js";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request }) => {
  const config = assertTikTokServerConfig(import.meta.env);
  const requestUrl = new URL(request.url);
  const state = createOAuthState();
  const targetAccount =
    requestUrl.searchParams.get("target_account") ?? config.targetAccount;
  const isSecureRequest = requestUrl.protocol === "https:";

  cookies.set(TIKTOK_STATE_COOKIE, state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest,
    maxAge: 60 * 10,
  });

  cookies.set(TIKTOK_TARGET_COOKIE, targetAccount, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest,
    maxAge: 60 * 10,
  });

  const authorizeUrl = buildTikTokAuthorizeUrl({
    clientKey: config.clientKey,
    redirectUri: config.redirectUri,
    scope: config.scope,
    state,
  });

  return Response.redirect(authorizeUrl, 302);
};
