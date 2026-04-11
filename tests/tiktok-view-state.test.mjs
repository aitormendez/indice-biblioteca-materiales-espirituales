import test from "node:test";
import assert from "node:assert/strict";

import { getTikTokBannerState } from "../src/lib/tiktok/view-state.js";

test("getTikTokBannerState keeps connected status when a connection exists without callback params", () => {
  const banner = getTikTokBannerState({
    callbackStatus: null,
    callbackMessage: null,
    connection: {
      targetAccount: "tiktok:espacio_sutil",
      displayName: "Espacio Sutil",
    },
  });

  assert.equal(banner.title, "Cuenta conectada");
  assert.match(banner.message, /sigue activa en NocoDB/i);
  assert.match(banner.tone, /border-cyan-400/);
});
