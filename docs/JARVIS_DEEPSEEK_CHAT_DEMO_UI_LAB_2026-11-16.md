# CEREBRO OS · JARVIS · DeepSeek Chat Demo UI · LAB

**Corte:** 2026-11-16 · **Versión:** 0.2.0 · **Estado:** LAB_GREEN_SYNTHETIC / PARCIAL / PROD_NO_GO.

## Objetivo y fuente oficial
- Reutilizar únicamente patrones ligeros de presentación y actualización de respuestas de https://github.com/deepseek-ai/chat-demo (referencia v0.1.1), bajo licencia MIT, Copyright (c) 2026 DeepSeek.
- Código fuente adaptado, sin copiar la aplicación completa. Licencia MIT conservada en `src/jarvis-deepseek-lab/LICENSE-DEEPSEEK-CHAT-DEMO`.
- El código upstream muestra una arquitectura browser→API y guarda API key en localStorage. **No se importa ese mecanismo, IndexedDB ni envío directo de contenido a DeepSeek**.
- La API/modelo DeepSeek es independiente de la licencia del frontend y puede generar costes. Esta implementación no lo llama.

## Contratos preservados
- `src/CerebroConsoleShell.tsx` queda **idéntico al archivo en main**; no hay cambio de permisos, voz, protocolos de confirmación ni llamadas al Gateway.
- `src/cerebroConsoleApi.ts`, `CerebroConsoleHost.tsx`, App, CRM, ANA, Supabase, Notion, Cloudflare, WordPress, DNS, browser y PR anteriores no se modifican.
- `src/JarvisEmbeddedConsole.tsx` incorpora un adaptador de presentación sidecar exclusivamente cuando concurren dos condiciones de build: `import.meta.env.MODE === 'lab'` y `VITE_JARVIS_DEEPSEEK_MARKDOWN_LAB === '1'`.
- Una compilación ordinaria `vite build` tiene el nuevo renderizado **OFF**. La interfaz original sigue disponible como rollback por desactivar la flag/recompilar, sin DB ni modificaciones de backend.
- El sidecar lee el texto ya autorizado y renderizado por la consola existente, crea un portal React por respuesta y oculta visualmente la respuesta original solamente en LAB. No hace solicitudes HTTP, no almacena datos, no extrae credenciales ni eleva permisos.
- El sidecar basado en MutationObserver es una técnica **solo para probar UI**, no debe promoverse como implementación definitiva sin integrar un contrato de datos explícito.

## Piezas incorporadas
- `src/jarvis-deepseek-lab/deepseekUiUtils.ts`: enlaces externos saneados + backoff.
- `useThrottledJarvisMarkdown.ts`: patrón de renderizado con control de frecuencia; **no es streaming del Gateway real**.
- `markdownSafe.ts`: parser puro y acotado, Markdown limitado.
- `JarvisSafeMarkdownLab.tsx`: React seguro con escapes automáticos, nunca `dangerouslySetInnerHTML`.
- `JarvisMarkdownLabSidecar.tsx`: puente no invasivo sobre el DOM ya autorizado de JARVIS LAB.
- `jarvis-markdown-lab.css`: estilo aislado en el chat.
- `tests/jarvis-deepseek-chat-demo-lab.test.mjs` y `tests/jarvis-deepseek-chat-renderer-lab.test.mjs`: tests de parser, URLs, tamaño y regresión.
- `tests/jarvis-deepseek-lab-ui.spec.ts`: test Chromium de respuesta del Gateway simulado con un usuario sintético, responsive 1440/390, enlaces peligrosos y payload HTTP.
- Workflow de CI `.github/workflows/jarvis-deepseek-markdown-lab.yml`: sin secretos, triggers limitados a esta rama.

## Evidencia real y límites
- Commit código evaluado: `f3c9d45e1bf134730e88a8981eacc38bb3bae218`.
- Workflow: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43949312059 · **SUCCESS**.
- Node: **17/17 PASS**. Compilación Vite/TypeScript ordinaria: **PASS**. Compilación específica modo LAB con flag: **PASS**.
- Playwright Chromium: **2/2 PASS**, una prueba cubre ancho desktop 1440 px y viewport móvil de 390 px; prueba de XSS/URL y payload. Las pruebas usan Gateway y usuario **SIMULADOS**. No acreditan uso real en dispositivo físico ni autenticación real de propietario.
- El gate histórico VOICE-001 de una iteración anterior falló porque detectó edición directa del archivo protegido de Console. En el corte actual se **revirtió íntegramente ese archivo** y la integración usa sidecar. No se ha debilitado VOICE-001, ni se declara que ese workflow histórico fuera verde.
- La rama es **DRAFT NO MERGE**; no se desplegó UI, no se conectó DeepSeek API, no hay coste de inferencia.

## Gates pendientes para cualquier integración real
1. Evaluar si el patrón sidecar debe reemplazarse por adaptación explícita de componentes mediante interfaces React, sin MutationObserver.
2. OLD vs NEW visual y de accesibilidad completo; respuestas grandes y Markdown anidado; no afirmar compatibilidad total con GFM, Mermaid, LaTeX ni citas reales.
3. E2E autenticado real de propietario, conversación, voz y navegación, incluyendo desktop y móvil **físico**.
4. Métricas y QA de cambios, rollback físico probado, control de permisos y aprobación bajo tribunal.
5. Registro en GOV-001 sin duplicar motor y promoción gradual únicamente si todos los gates son verdes.

## Gobierno y coste
`company_id=fenix-capital`; `capability_id=JARVIS-UI-DEEPSEEK-LAB`; `environment=LAB`; `version=0.2.0`.
Licencia de código: 0 €. Suscripciones nuevas: ninguna. CI consume recursos de GitHub y su impacto en factura **no está auditado**. Coste total adicional 0 € no se afirma sin verificación de billing. Todo el sistema actual permanece intacto.

**Estado consolidado: probado en CI y navegador sintético de LAB; no desplegado ni operativo en producción.**
