import type { APIRoute } from "astro";

import { assertTikTokServerConfig } from "../../../lib/tiktok/config.js";
import { triggerTikTokPublish } from "../../../lib/tiktok/publish.js";
import { getConnectionByTargetAccount } from "../../../lib/tiktok/store.js";
import { getTikTokTaskById } from "../../../lib/tiktok/tasks.js";

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
        "Faltan variables de entorno de NocoDB para recuperar la tarea de TikTok.",
      );
    }

    if (!config.n8nConfigured) {
      throw new Error(
        "Faltan variables de entorno de n8n para disparar la publicación de TikTok.",
      );
    }

    const formData = await request.formData();
    const taskId = Number(formData.get("task_id"));

    if (!Number.isInteger(taskId) || taskId <= 0) {
      throw new Error("La tarea TikTok no es válida.");
    }

    const [task, connection] = await Promise.all([
      getTikTokTaskById(config, taskId),
      getConnectionByTargetAccount(config, config.targetAccount),
    ]);

    if (!task) {
      throw new Error("No se ha encontrado la tarea TikTok solicitada.");
    }

    if (task.channel !== "tiktok_video") {
      throw new Error("La tarea indicada no pertenece al canal TikTok.");
    }

    if (task.targetAccount !== config.targetAccount) {
      throw new Error("La tarea no pertenece a la cuenta TikTok conectada en esta miniapp.");
    }

    if (task.state !== "ready") {
      throw new Error(`La tarea TikTok no está lista para publicar (state=${task.state}).`);
    }

    if (!task.tiktokPrivacyLevel) {
      throw new Error("Falta tiktok_privacy_level en la tarea antes de publicar.");
    }

    if (!connection || connection.status !== "connected") {
      throw new Error(`No hay conexión TikTok activa para ${config.targetAccount}.`);
    }

    await triggerTikTokPublish(
      config,
      { taskId: task.id, targetAccount: task.targetAccount },
    );

    return redirectToLanding(requestUrl, {
      publish: "success",
      message:
        "La publicación TikTok se ha enviado a n8n. Revisa tiktok_status_last y el histórico del workflow.",
    });
  } catch (error) {
    return redirectToLanding(requestUrl, {
      publish: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se ha podido lanzar la publicación en TikTok.",
    });
  }
};
