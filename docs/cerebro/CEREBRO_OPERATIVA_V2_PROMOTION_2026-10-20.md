# CEREBRO OPERATIVA V2 · PROMOTION RECORD · 2026-10-20

## Estado

- Código integrado en `main`: merge de PR #796.
- Merge SHA: `65051c7c5d49d542fac8a621aa6219a3867425d5`.
- PREPROD: `cerebro-console-activity-v0` ACTIVE, `verify_jwt=true`.
- PROD: `cerebro-console-activity-v0` ACTIVE, `verify_jwt=true`, antes de publicar el frontend.
- Coste adicional: 0 €; la primera proyección real usa GitHub Actions público y caché corta en Edge Function.

## Gates previos a promoción

Todos verdes en el head probado `3042c88cec7658574053a5f708fa269dc968431e`:

- CEREBRO Operativa V1 Gate.
- CEREBRO Governed Main Integration V0.
- CEREBRO Session Context Regression Guard.
- CEREBRO Continuous Human QA V0.
- App Restoration Build Gate.

El gate de Operativa incluye Playwright, contrato estático y build TypeScript/Vite.

## Contrato publicado

- VISTA0 se conserva y sigue siendo reversible.
- OPERATIVA es la vista por defecto.
- Selector de interfaz integrado en la cabecera, no flotante.
- Compositor: Adjuntar (fail-closed mientras no exista contrato real de subida), Dictar, Hablar, texto y Enviar.
- Enter envía; Shift+Enter inserta salto de línea.
- Dictado y conversación por voz son controles distintos.
- Los controles flotantes generales de App Fénix se ocultan únicamente dentro de `/cerebro`.
- Actividad: fuente inicial REAL = GitHub Actions; `company_id=fenix` queda explícitamente DERIVED por alcance del repositorio.
- No se fabrica porcentaje ni ETA: se muestran `Sin % fiable` y `Estimación aún no disponible` cuando la fuente no aporta esos datos.
- La ruta visual usa estados observables: cola → ejecución → finalización.
- Evidencia enlazada al run real de GitHub Actions.

## Rollback

Se conserva el baseline anterior registrado:

- rama: `backup/cerebro-console-main-3300ebc-20261019`
- commit: `3300ebc5c15a9216d11b116687a1c4127d1b29ec`

## Límites conocidos / por auditar

- La proyección GitHub Actions no constituye todavía una agregación universal de todos los runtimes CEREBRO; es la primera fuente transversal real conectada a OPERATIVA.
- Micrófono físico sigue `POR AUDITAR · MIC HARDWARE` hasta prueba real con hardware.
- NEURAL permanece `POR AUDITAR` y debe recuperarse desde evidencia histórica, no reconstruirse desde cero.
- La subida de adjuntos permanece bloqueada hasta disponer de contrato real de almacenamiento/permisos/evidencia.
