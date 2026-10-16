# EVT-001 Native V1 — PREPROD Runbook

## Estado

- Entorno autorizado en V1: `PREPROD`.
- `PROD`: denegado por defecto.
- Coste adicional objetivo/medido del baseline: `0 €`.
- No requiere broker externo ni nueva suscripción.
- No sustituye el runtime existente: lo envuelve.

## Existente preservado

EVT-001 V1 reutiliza sin modificar:

- `cerebro/runtime/runtime.mjs` → `EventBus`.
- `cerebro/runtime/persistent-runtime.mjs` → `PersistentEventBus` y `AtomicV8Journal`.
- `cerebro/runtime/rsi-event-outbox.mjs` como evidencia/compatibilidad del patrón outbox ya existente.

Regla aplicada: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Contrato

Contexto obligatorio en cada evento: `company_id`, `engine_id`, `environment`, `version`.

Publicación obligatoria: `type`, `schema_version`, `payload`, `context`. El `idempotency_key` es opcional; si no se aporta se calcula de forma determinista y queda aislado por contexto completo.

Operaciones gobernadas: `PUBLISH`, `LIST_CONTEXT`, `LIST_COMPANY`, `DELIVER_CONTEXT`, `REPLAY_VERIFY`.

## Persistencia y aislamiento

`PersistentEventBus` mantiene el journal durable de eventos. `AtomicV8Journal` mantiene el ledger durable de entregas. Ambos usan escritura atómica y verificación de checksum ya presentes en el runtime. El wrapper no permite publicar fuera de `PREPROD`; la entrega se limita al contexto exacto solicitado y el runtime base mantiene la deduplicación por contexto.

## Entrega

La salida a cualquier transporte se realiza únicamente mediante un adaptador autorizado inyectado (`publish(event)`). V1 no exige Kafka, RabbitMQ, Redis, Supabase Realtime ni SaaS de pago.

Los reintentos están acotados (1–10; default 3). Si se agotan, el evento genera un recibo durable `DEAD_LETTER`. Un evento `DELIVERED` o `DEAD_LETTER` es terminal y no se vuelve a entregar al reconstruir el proceso.

## Observabilidad

Cada autorización expone recibo determinista. Cada publicación conserva `event_id` e `idempotency_key`. Cada entrega genera recibo con contexto, número de intentos, resultado/error y coste adicional. `verifyReplay()` verifica que el journal puede reconstruirse.

## Backup

Antes de una operación de mantenimiento del runtime, copiar/snapshot de los dos ficheros configurados: journal de eventos y journal de entregas. Los ficheros deben permanecer fuera de rutas públicas y con permisos restringidos por el host.

## Rollback

El wrapper V1 puede retirarse sin modificar `runtime.mjs`, `persistent-runtime.mjs` ni `rsi-event-outbox.mjs`. Revertir la PR de V1 restaura el estado anterior. Los journals V1 se conservan como evidencia hasta completar la política de retención.

## Rebuild

1. Restaurar ambos journals desde snapshot o almacenamiento persistente.
2. Instanciar `Evt001Native` con las mismas rutas y `environment=PREPROD`.
3. Ejecutar `verifyReplay(context)` por contexto esperado.
4. Reinyectar el adaptador de transporte autorizado.
5. Ejecutar E2E antes de reanudar entregas.

## Dependencias

Node.js 22 y módulos first-party del repositorio. Sin dependencias npm nuevas, sin credenciales nuevas y sin coste SaaS adicional.

## Gates de promoción

Para declarar `NATIVE_FULL_PREPROD`: registry/versionado, multiempresa, contratos/eventos, permisos/política, wrapper real, ruta de capability, E2E, evaluación/tribunal, comparación OLD vs NEW cuando aplique, observabilidad/idempotencia/coste, fallback, backup/rollback/rebuild, runbook/dependencias/changelog y evidencia PREPROD GREEN.

PROD permanece fuera de alcance hasta una promoción explícita posterior con sus gates completos.

## Changelog

### 1.0.0

- Añadido wrapper gobernado EVT-001 sobre el runtime existente.
- Añadida persistencia durable del ledger de entrega reutilizando `AtomicV8Journal`.
- Añadidos reintentos acotados, dead-letter, replay y política fail-closed PREPROD.
- Sin cambios en PROD, Android, Supabase ni el outbox RSI existente.
