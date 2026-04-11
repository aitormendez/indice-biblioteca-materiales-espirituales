import type { APIRoute } from "astro";

import { assertTikTokServerConfig } from "../../../lib/tiktok/config.js";
import { updateTikTokTaskSettings } from "../../../lib/tiktok/tasks.js";

export const prerender = false;

function redirectToLanding(requestUrl: URL, params: Record<string, string>) {
  const landingUrl = new URL("/tiktok/", requestUrl);

  for (const [key, value] of Object.entries(params)) {
    landingUrl.searchParams.set(key, value);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: landingUrl.toString(),
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const requestUrl = new URL(request.url);

  try {
    const config = assertTikTokServerConfig(import.meta.env);

    if (!config.nocodbConfigured) {
      throw new Error(
        "Faltan variables de entorno de NocoDB para guardar la configuración de TikTok.",
      );
    }

    const formData = await request.formData();
    const taskIdValue = formData.get("task_id");
    const taskId = Number(taskIdValue);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      throw new Error("La tarea TikTok no es válida.");
    }

    await updateTikTokTaskSettings(config, {
      id: taskId,
      tiktokPrivacyLevel: String(formData.get("tiktok_privacy_level") ?? ""),
      tiktokDisableComment: formData.get("tiktok_disable_comment") === "on",
      tiktokDisableDuet: formData.get("tiktok_disable_duet") === "on",
      tiktokDisableStitch: formData.get("tiktok_disable_stitch") === "on",
    });

    return redirectToLanding(requestUrl, {
      task_update: "success",
      message: "La configuración editorial de TikTok se ha guardado en NocoDB.",
    });
  } catch (error) {
    return redirectToLanding(requestUrl, {
      task_update: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se ha podido guardar la configuración de TikTok.",
    });
  }
};
