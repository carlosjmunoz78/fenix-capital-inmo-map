# RSI-RECOVERY-003 · PREPROD runtime host audit

Fecha: 2026-10-08
Estado: HOST_NEUTRAL_WORKER_GREEN_HOST_NOT_SELECTED
PROD: NO AUTORIZADO
Coste adicional objetivo: 0 EUR

## Evidencia CURRENT

El CEREBRO CURRENT ya define `EVT-001` y `JOB-001` como adapters persistentes local/self-hosted PREPROD single-writer, con replay/idempotencia/recovery durable. La documentación CURRENT indica expresamente que siguen en paralelo y todavía NO están cableados como sustitutos del runtime en memoria / `SharedRuntime`.

Por tanto, la arquitectura admite persistencia local/self-hosted a 0 EUR como patrón, pero el repositorio no aporta evidencia suficiente para afirmar que exista hoy un host CEREBRO de larga duración ya seleccionado y operativo para LRN-001.

No se introduce una nueva suscripción, no se usa Supabase como host de este ledger y no se selecciona un proveedor externo sin evidencia de necesidad.

## Implementación host-neutral

Se añade `cerebro/runtime/rsi-learning-worker.mjs` como worker one-shot host-neutral. Su función es:

1. recibir un report de eventos de Skill Supply Chain;
2. construir el bridge RSI shadow in-memory;
3. validar policy/security/local persistence;
4. persistir automáticamente candidatos LOW/MEDIUM en el ledger local PREPROD LRN-001;
5. retener HIGH/CRITICAL con `HUMAN_REQUIRED=HIGH_RISK`;
6. mantener `rsi_publish_authorized=false`, `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false` y coste adicional 0 EUR.

El worker usa un lock de filesystem para preservar single-writer y dispone de kill switch. Puede ejecutarse posteriormente desde un runtime persistente existente, servicio local, scheduler o host self-hosted compatible con Node sin cambiar el contrato de datos.

## Pruebas

Se añadieron tests de:

- persistencia LOW y reejecución idempotente;
- LOW automático + HIGH retenido;
- kill switch sin escritura;
- rechazo de segundo writer concurrente;
- rechazo de cualquier contexto distinto de PREPROD.

El primer gate con el nuevo test detectó un defecto real: el bloque CLI del worker se ejecutaba también al importarse durante tests, dejando `exitCode=2`. Se corrigió la detección de entrypoint y se reejecutó el gate. En el HEAD corregido `5059db1bb7a7bcf0c3b55829e96a0f02a26d9895`, el paso completo `Recovered RSI runtime, PREPROD persistence, worker, governance and bridge regression tests` terminó SUCCESS en run `37778722770`.

## Decisión de host

### EXISTENTE

- Runtime persistente local/self-hosted PREPROD como patrón ya aceptado por CEREBRO para EVT/JOB.
- `AtomicV8Journal` como primitive durable local.
- Worker LRN-001 host-neutral, single-writer, PREPROD-only y con kill switch.

### PARCIAL

- LRN-001 dispone de código + persistencia + restart/idempotencia + worker probado en CI.
- Esto NO demuestra un proceso de larga duración funcionando fuera de CI.

### POR AUDITAR antes de desplegar

- host físico/lógico concreto disponible 24/7;
- ruta persistente de almacenamiento y capacidad;
- permisos del proceso y usuario de servicio;
- backup/snapshot del journal;
- restore/rebuild físico;
- proceso de arranque/restart;
- monitor de vida/heartbeat;
- observability sink real;
- kill switch operativo del host;
- estrategia de actualización/rollback del binario;
- OLD vs NEW frente al flujo shadow-only actual.

## Criterio de selección

Preferencia por este orden: host/runtime ya existente y estable → self-hosted/local ya disponible → free tier compatible con disco persistente → solo después servicio externo de pago con ROI justificado. No usar GitHub Actions como evidencia de host permanente: aquí solo es el entorno de validación CI.

## Next block

`RSI-RECOVERY-004 · LRN-001 HOST BINDING`: inventariar hosts ya existentes del ecosistema CEREBRO (sin exponer credenciales), elegir uno solo si existe evidencia de disponibilidad persistente y ejecutar PREPROD paralelo con backup/restore/heartbeat/kill-switch. Si no existe host apto, mantener el worker listo pero no desplegado y elevar la decisión de infraestructura sin comprar nada automáticamente.
