/**
 * JARVIS LAB · adaptación mínima del patrón de URLs seguras y renderizado fluido
 * de deepseek-ai/chat-demo v0.1.1 (MIT, Copyright (c) 2026 DeepSeek).
 * Fuente: https://github.com/deepseek-ai/chat-demo
 * Atribución y licencia: ./LICENSE-DEEPSEEK-CHAT-DEMO
 *
 * No realiza solicitudes HTTP, no lee claves y no persiste mensajes.
 * Este módulo no está importado por la interfaz de producción.
 */
export const MAX_STREAM_RENDER_BACKOFF_MS = 2_000;

export function streamRenderBackoffMs(elapsedRenderMs: number): number {
  if (!Number.isFinite(elapsedRenderMs)) return MAX_STREAM_RENDER_BACKOFF_MS;
  return Math.min(MAX_STREAM_RENDER_BACKOFF_MS, Math.max(0, elapsedRenderMs) * 2);
}

/** Solo enlaces absolutos web; sin esquemas activos ni credenciales incrustadas. */
export function safeExternalChatHref(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
