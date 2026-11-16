# CEREBRO OS · JARVIS · DeepSeek Chat Demo UI · LAB no invasivo

Fecha: 2026-11-16. Estado: PARCIAL / LAB CANDIDATE · NO INTEGRADO · PROD NO-GO.

## Evidencia y licencia
- Referencia upstream: https://github.com/deepseek-ai/chat-demo
- Tag de referencia: v0.1.1 (2026-11-13). Código TypeScript + React 18 + Rspack.
- Licencia del código upstream: MIT (Copyright (c) 2026 DeepSeek); conservar copyright/licencia en cualquier redistribución.
- README upstream declara navegador → API directa, clave en localStorage, chats/adjuntos en IndexedDB. **Este patrón NO puede usarse directamente en JARVIS empresarial**.
- No son modelos abiertos ni infraestructura de inferencia gratuita: es principalmente una interfaz de chat de ejemplo; su API puede generar consumo.

## Inventario actual del repositorio Fénix (main, auditado en lectura)
- src/CerebroConsoleHost.tsx: CARLOS-ADMIN, superficies JARVIS / OPERATIVA / NEURONAL / NAVEGADOR.
- src/CerebroJarvisWorkConsole.tsx y src/JarvisEmbeddedConsole.tsx: interfaz workspace ya propia.
- src/CerebroConsoleShell.tsx y src/cerebroConsoleApi.ts: chat existente en Gateway.
- src/CerebroAttachmentBridge.tsx: adjuntos privados con acotación.
- src/CerebroVoiceSettings.tsx / src/cerebroVoice.ts: voz actual.
- GitHub contiene numerosas ramas y PR DRAFT de JARVIS en paralelo. No fusionar ni sustituir trabajo ajeno.

## Contrato de adaptación
- Reutilizar patrones de *renderizado Markdown progresivo*, *enlaces saneados*, citas verificables y, después de pruebas, ergonomía chat.
- Implementados en esta rama como **candidatos aislados sin imports en producción**:
  - `src/jarvis-deepseek-lab/deepseekUiUtils.ts`: backoff acotado + URL externa segura.
  - `src/jarvis-deepseek-lab/useThrottledJarvisMarkdown.ts`: hook React de streaming, basado en upstream.
  - `tests/jarvis-deepseek-chat-demo-lab.test.mjs`: pruebas de contratos puros.
- No copiar la app completa, store, IndexedDB, conexión directa a DeepSeek, claves, historial ni router de modelo.
- No introducir nuevas dependencias en package.json ni servicios, workers, DNS, DNS, cuotas o suscripciones.
- No usar estos helpers todavía en la UI activa: requiere integración y pruebas en un segundo corte; ningún toggle en PROD.

## Gates siguientes
1. Test aislado Node 22+:
   `node --experimental-strip-types --test tests/jarvis-deepseek-chat-demo-lab.test.mjs`.
2. Build repo completo TypeScript/Vite en CI, confirmar cero regresiones (no asumir que pasa).
3. Revisar dependencias y licencias externas antes de adoptar parser Markdown, Mermaid/KaTeX o adjuntos.
4. En LAB, envolver la salida del Gateway existente en renderer seguro, sin mover permisos ni data plane; prueba de enlaces, HTML, streaming, accesibilidad móvil.
5. E2E propietario real con identidad, origen y permisos actuales; OLD vs NEW, latencia, seguridad, rollback, observabilidad.
6. Si gate total GREEN, habilitación gradual por feature flag; **jamás promoción implícita**.

## Gobierno
- company_id=fenix-capital, capability_id=JARVIS-UI-DEEPSEEK-LAB (candidato, no engine_id nuevo), environment=LAB, version=0.1.0.
- Código nuevo no invocado por App ni CRM; rollback = cerrar DRAFT PR/borrar rama candidata después de auditoría; no modificar main.
- Coste de licencia: 0 €. Coste adicional de proveedores: 0 € introducido. Consumos de CI no medidos; no declarar coste operativo global igual a cero sin facturación real.
- Estado: EXTERNAL_SOURCE_VERIFIED / CODE_STAGED_LAB / PROD_NOT_INTEGRATED.
