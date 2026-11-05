# ZEUS · SUPERAGENTE JARVIS · B5 VOICE-001 · CORTE 01 · 2026-11-05

Estado: **PARCIAL · LAB ROUTING GREEN · TTS DINÁMICA NO CONECTADA · PROD NO-GO**.

## Fuente de continuidad y alcance
- Plan canónico: Biblioteca `/ZEUS/JARVIS/JARVIS_PLAN_EJECUCION_10_BLOQUES_V2_2026-11-03.md`.
- Superagente JARVIS no es la interfaz Jarvis: B1–B10 se mantienen sin rehacerlos.
- B10 base: PR #20 DRAFT, 508/508 PASS en su corte anterior, PROD NO_GO. B7 #17, B8 #18 y B9 #19 DRAFT, sin merge.
- Nueva voz aprobada: JARVIS V2 «Más clara», 1,10×, +0,6 semitonos; V1 maestra guardada en Drive/Biblioteca. El modelo clonado sigue alojado en vidIQ; no existe exportación autónoma acreditada.

## OLD vs NEW
| Superficie | OLD (conservado) | NEW · LAB, por defecto OFF |
| --- | --- | --- |
| `/cerebro?section=jarvis` | Jarvis Work Console + síntesis heredada | política JARVIS V2 |
| `/cerebro?section=operativa` | Operativa | política JARVIS V2 |
| `/cerebro?section=neuronal` | Neuronal | política JARVIS V2 |
| `/cerebro?section=browser` | Navegador | política JARVIS V2 |
| `/cerebro?section=legacy-v0` | Console V0 | política JARVIS V2 |
| Otras rutas de App Fénix Capital | ANA / voz existente | **SIN CAMBIOS** |
| Empresas Fénix/AION/CAPTACASA | Multiempresa no certificada de extremo a extremo | selección lógica JARVIS independiente de empresa; solo tests sintéticos |

## Implementación
- `src/jarvisVoiceSurfacePolicy.ts`: selección determinista por ruta/host/vista; entradas desconocidas `DENY`; ninguna llamada de TTS ni a servicios externos; permisos NO concedidos por la selección.
- `src/CerebroJarvisVoiceLabStatus.tsx`: estado visible para las consolas autorizadas únicamente con `import.meta.env.DEV` **y** `VITE_CEREBRO_JARVIS_V2_LAB=1`. Se explica explícitamente que la síntesis dinámica sigue pendiente.
- `src/CerebroConsoleHost.tsx`: montaje aditivo del estado en las cinco vistas.
- No se han modificado `src/cerebroVoice.ts`, `src/CerebroVoiceSettings.tsx`, `src/CerebroConsoleShell.tsx` ni la identidad de ANA.

## QA y evidencia
- SHA de código probado: `cee773e821956496778f0a57cd94e023f62bfc1e`.
- `JARVIS Universal Core LAB Tests` RUN 42078798569: **534 PASS / 0 FAIL**; incluye las pruebas nuevas de ruta/vista, Fénix/AION/CAPTACASA, ANA y denegación.
- `ZEUS JARVIS B7 Logical Multiagent LAB` RUN 42078798660: SUCCESS.
- `CEREBRO Governed Main Integration V0` RUN 42078798602: SUCCESS, integración/promo PROD SKIPPED.
- Compilación integral TypeScript/Vite **NO VERIFICADA**; conversación real TTS/STT y dos dispositivos **NO VERIFICADOS**.

## Bloques B1–B10: reconciliación
- B1: cerrado documentalmente, gate de interfaz real pendiente.
- B2: parcial; OWNER_ROOT/dos dispositivos y recuperación física pendientes.
- B3: infraestructura aislada en Supabase PROD instalada, pero `enabled=false`, `kill_switch=true`, sin grants reales.
- B4: memoria parcial LAB, PROD OFF con kill switch.
- B5: contratos existentes y TTS OSS sintético; **ahora política de voz V2 de interfaz LAB**. Falta proveedor real, audio firmado, pruebas de voz.
- B6: lectura GitHub/PG17 LAB, permisos productivos ausentes.
- B7: multiagentes LAB, no certificación PROD.
- B8: dirección multiempresa LAB, dos compañías reales no certificadas.
- B9: resiliencia LAB, supervisor/tribunal y DR reales pendientes.
- B10: certificación por capacidades en PR #20; NO_GO por evidencia real incompleta.

## Siguiente corte
`B5_VOICE_INTERFACE_CUT02_AUTHENTICATED_DYNAMIC_TTS_OUTPUT_IN_LAB`: conectar el TTS de la voz V2 al **Gateway existente** mediante un adaptador server-side gobernado y entrega de audio autenticada (sin enlaces públicos no verificados), con B2/B3/consentimiento, FinOps, tiempo de respuesta, interrupción y fallback sin cambiar ANA. No activar PROD por la mera existencia de este corte.

## Rollback
Cerrar PR #24 sin merge; flag LAB por defecto OFF; preservar PR20–PR13, `main`, App, CRM, Supabase, ANA, WordPress, SEO y Trading. Sin DB/DNS/secretos nuevos ni suscripciones.
