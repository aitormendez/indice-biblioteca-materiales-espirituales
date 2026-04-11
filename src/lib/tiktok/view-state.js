export function getTikTokBannerState({ callbackStatus, callbackMessage, connection }) {
  if (callbackStatus === "success") {
    return {
      tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
      title: "Cuenta conectada",
      message:
        "TikTok ha devuelto la autorización correctamente y la cuenta ha quedado registrada en la estructura interna.",
    };
  }

  if (callbackStatus === "error") {
    return {
      tone: "border-rose-400/25 bg-rose-400/10 text-rose-100",
      title: "Error de autorización",
      message:
        callbackMessage ??
        "La autorización de TikTok no se ha podido completar en esta petición.",
    };
  }

  if (connection) {
    return {
      tone: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
      title: "Cuenta conectada",
      message:
        "La conexión TikTok sigue activa en NocoDB y está disponible para revisar la tarea y lanzar la publicación.",
    };
  }

  return {
    tone: "border-white/10 bg-white/5 text-slate-200",
    title: "Sin actividad reciente",
    message:
      "Todavía no se ha completado ninguna autorización de TikTok en este entorno.",
  };
}
