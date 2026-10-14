# CEREBRO OS · FASE 14 · Multimedia Factory · Bloques 162–175 V0

**Fecha:** 2026-10-14  
**Ámbito:** PREPROD  
**Owner lógico V0:** `FACT-001`  
**Capability:** `DIGITAL-BUILD-MULTIMEDIA`  
**Motores nuevos:** 0  
**Coste adicional objetivo:** 0 €

## Regla arquitectónica

Digital Build ya define pipelines para texto, imagen, fotografía, diseño, vídeo, audio, voz, avatar y presentaciones. Por tanto ComfyUI, modelos y herramientas de edición se tratan como adapters/providers/capabilities y no como motores independientes.

La búsqueda en `main` del repositorio no encontró bindings por nombre para ComfyUI, FFmpeg, HyperFrames, Qwen3-TTS ni los restantes candidatos. No se afirma instalación física ni integración viva. Este V0 construye catálogo, routing contract, gates y tests.

## Mapa 162–175

| Bloque | Adapter/herramienta | Estado V0 |
|---:|---|---|
| 162 | ComfyUI | P1 · seam de adapter |
| 163 | Z-Image Turbo | LAB |
| 164 | Qwen3-TTS | P1 · seam de voz local |
| 165 | HyperFrames | P1 · vídeo programático |
| 166 | procedural-film | P1 · explainers/doodle |
| 167 | OpenMontage | LAB |
| 168 | LTX-Video/LTX-2 | LAB |
| 169 | Watch | P1 · comprensión de vídeo |
| 170 | FFmpeg | REUSE si existe; sin auto-instalación |
| 171 | Open-Sora | HOLD_HARDWARE |
| 172 | Remotion | HOLD_LICENSE |
| 173 | Fish Audio | HOLD_COMMERCIAL |
| 174 | ElevenLabs | HOLD_COMMERCIAL |
| 175 | Open Generative AI | CATALOG_ONLY |

## Componentes V0

`multimedia-factory-runtime-v0.mjs` contiene:

- catálogo canónico de adapters y decisiones;
- planificador de tarea multimedia;
- seam `ROUTE-001` para selección de runtime;
- seam `FREE-001` para zero-cost;
- seam `EVA-001` para calidad;
- seam `OBSERV-001` para observabilidad;
- seam `FINOPS-001` para coste;
- política FFmpeg reuse-if-present;
- benchmark estructurado de voz sin llamadas a proveedores;
- composición de pipeline vídeo no ejecutable;
- gate licencia/coste/hardware;
- idempotencia y telemetría metadata/hash.

## Política física

V0 no instala software, no descarga modelos, no ejecuta binarios, no abre red, no llama APIs y no publica artefactos. Cualquier intento de instalación/descarga/proceso/red queda `POLICY_CONFLICT`; compra/API/subscripción de pago queda `MONEY_LIMIT`.

FFmpeg se marca `REUSE_IF_PRESENT`: la rama no prueba que el binario exista. Si falta, V0 no lo instala silenciosamente.

## Holds explícitos

Open-Sora permanece bloqueado hasta demostrar hardware compatible. Remotion permanece bloqueado hasta resolver su gate de licencia conforme al snapshot maestro. Fish Audio y ElevenLabs permanecen benchmark comercial y no pueden generar gasto. Open Generative AI queda catalogado como referencia, no runtime.

## Privacidad y derechos

El runtime solo usa referencias opacas. PII, secretos, media bruta, muestras de voz y templates biométricos están prohibidos en estado/telemetría. La ejecución física futura deberá añadir gates de licencia/derechos, consentimiento cuando aplique y políticas específicas por media.

## Runbook PREPROD

1. Resolver `company_id`, `engine_id=FACT-001`, `capability_id=DIGITAL-BUILD-MULTIMEDIA`, environment y version.
2. Consultar catálogo.
3. Validar decisión canónica del adapter.
4. Ejecutar gate de licencia/coste/hardware.
5. Crear plan únicamente; no ejecutar físicamente.
6. Si se promociona adapter en otra fase: inventariar binario/modelo/cuenta/licencia/cuota y binding real.
7. Benchmark LAB con `EVA-001` y coste con `FREE-001/FINOPS-001`.
8. Solo tras tribunal/rollback/observabilidad permitir PREPROD físico por adapter.

## Backup, rollback y rebuild

No hay migraciones ni instalaciones. Backup = Git. Rollback = revert del PR/commit. Rebuild = profile + runtime + tests + workflow.

## Estado máximo tras CI

`PREPROD_CODE_TESTED_PLAN_ONLY`. CI no prueba GPU, binarios, licencias, modelos, calidad real ni disponibilidad de proveedores. Ningún adapter queda físicamente operativo por el mero hecho de que este PR sea verde.
