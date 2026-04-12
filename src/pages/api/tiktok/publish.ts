import type { APIRoute } from "astro";

import { assertTikTokServerConfig } from "../../../lib/tiktok/config.js";
import { publishTikTokTaskDirect } from "../../../lib/tiktok/direct-publish.js";
import {
  buildTikTokFailureFields,
  buildTikTokProgressFields,
  buildTikTokResultFields,
  buildTikTokStartFields,
} from "../../../lib/tiktok/publish-state.js";
import { getConnectionByTargetAccount } from "../../../lib/tiktok/store.js";
import {
  getTikTokTaskById,
  patchDistributionTask,
} from "../../../lib/tiktok/tasks.js";

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
  let taskId = 0;
  let publishId: string | null = null;
  let statusLast = "FAILED";

  try {
    const config = assertTikTokServerConfig(import.meta.env);

    if (!config.nocodbConfigured) {
      throw new Error(
        "Faltan variables de entorno de NocoDB para recuperar la tarea de TikTok.",
      );
    }

    const formData = await request.formData();
    taskId = Number(formData.get("task_id"));

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

    await patchDistributionTask(config, task.id, buildTikTokStartFields());

    const result = await publishTikTokTaskDirect({
      task,
      connection,
      fetchImpl: fetch,
      pollIntervalMs: config.tikTokPublishPollIntervalMs,
      maxPollAttempts: config.tikTokPublishMaxPollAttempts,
      onProgress: async (progress) => {
        publishId = progress.publishId ?? publishId;
        statusLast = progress.status ?? statusLast;

        await patchDistributionTask(
          config,
          task.id,
          buildTikTokProgressFields({
            publishId,
            status: statusLast,
          }),
        );
      },
    });

    await patchDistributionTask(config, task.id, buildTikTokResultFields(result));

    if (result.state !== "published") {
      return redirectToLanding(requestUrl, {
        publish: "error",
        message: result.errorLast ?? "TikTok no ha completado la publicación.",
      });
    }

    return redirectToLanding(requestUrl, {
      publish: "success",
      message: "TikTok ha confirmado la publicación y NocoDB ya refleja el estado final.",
    });
  } catch (error) {
    if (taskId > 0) {
      try {
        const config = assertTikTokServerConfig(import.meta.env);

        if (config.nocodbConfigured) {
          await patchDistributionTask(
            config,
            taskId,
            buildTikTokFailureFields({
              publishId,
              statusLast,
              error,
            }),
          );
        }
      } catch {
        // No ocultar el error original si también falla la persistencia.
      }
    }

    return redirectToLanding(requestUrl, {
      publish: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se ha podido lanzar la publicación en TikTok.",
    });
  }
};
