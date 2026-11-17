/**
 * CANDIDATO LAB · adaptación aislada de useThrottleMarkdownRender de
 * deepseek-ai/chat-demo v0.1.1, Copyright (c) 2026 DeepSeek, licencia MIT.
 * No conectado a CEREBRO Console; no crea peticiones a modelos.
 * Licencia completa en ./LICENSE-DEEPSEEK-CHAT-DEMO.
 */
import {useEffect, useRef, useState} from 'react';
import {streamRenderBackoffMs} from './deepseekUiUtils';

export function useThrottledJarvisMarkdown(content: string, streaming: boolean): string {
  const renderStartRef = useRef(performance.now());
  const allowedAtRef = useRef(0);
  const [throttled, setThrottled] = useState(content);

  useEffect(() => {
    const now = performance.now();
    allowedAtRef.current = now + streamRenderBackoffMs(now - renderStartRef.current);
  }, [throttled]);

  useEffect(() => {
    if (!streaming) return;
    const update = () => {
      renderStartRef.current = performance.now();
      setThrottled(content);
    };
    const delay = allowedAtRef.current - performance.now();
    if (delay <= 0) {
      update();
      return;
    }
    const timer = window.setTimeout(update, delay);
    return () => window.clearTimeout(timer);
  }, [content, streaming]);

  // Cuando termina el streaming, la salida se actualiza inmediatamente.
  return streaming ? throttled : content;
}
