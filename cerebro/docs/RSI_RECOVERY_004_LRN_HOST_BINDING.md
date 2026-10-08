# RSI-RECOVERY-004 · LRN-001 HOST BINDING

Fecha: 2026-10-08
Estado global: PARCIAL · SOFTWARE_GREEN / ALWAYS_ON_CORE_HOST_POR_AUDITAR
Entorno: PREPROD exacto
Coste adicional objetivo: 0 EUR
PROD authority: false
Trading access: false

## Objetivo

Convertir `LRN-001` de worker probado a runtime persistente y autónomo sin depender de ChatGPT Scheduler, Make, Supabase para jobs largos, Browser Bridge ni de un PC de usuario que pueda estar apagado.

## Corrección de arquitectura 2026-10-08

El PC Windows de Carlos NO estará encendido permanentemente. Por tanto:

- queda descartado como host core 24/7 de `LRN-001`;
- no puede ser single point of failure de learning, scheduler, MetaLearn ni supervisor;
- el binding Windows construido se conserva como EDGE RUNNER opcional, aceptación física, Computer Use/Browser Bridge y capacidad local cuando el PC esté disponible;
- el runtime `LRN-001` mantiene diseño host-neutral para poder ejecutarse en un host always-on independiente;
- antes de introducir gasto se debe auditar infraestructura ya existente y gratuita/contratada;
- no se autoriza nueva suscripción mientras exista alternativa razonable de coste 0 EUR.

## Inventario y decisión actual

1. GitHub Actions sigue siendo CI y puede producir/publicar eventos; NO se trata como daemon persistente 24/7 ni como almacenamiento local permanente.
2. Supabase no se selecciona como runtime de jobs largos de `LRN-001`; permanece principalmente como core transaccional.
3. Windows Task Scheduler se conserva como binding EDGE opcional, no como autoridad core 24/7.
4. La autoridad operativa 24/7 queda pendiente de `ALWAYS_ON_CORE_HOST_AUDIT`.
5. Orden de selección del host: infraestructura ya contratada/always-on → self-hosted existente → free tier con almacenamiento persistente → servicio externo barato solo con justificación.

## Implementación HECHA

### Runtime host-neutral

`cerebro/runtime/rsi-learning-host.mjs`

- daemon PREPROD-only;
- tenant-scoped por `company_id` + `LRN-001`;
- inbox no destructivo;
- receipts SHA-256 idempotentes;
- heartbeat atómico;
- kill switch;
- single-writer host/worker locks crash-recoverable;
- ledger durable local `learning.v8`;
- rechazo cross-company;
- preservación de source event files;
- backup con checksum + manifest;
- restore fail-closed y preservation backup;
- anti-loop same-error-family;
- coste adicional 0 EUR;
- `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false`.

### Real event wiring

Ya existe el camino automático Skill Factory / improvement events → outbox persistente → consumer → inbox `LRN-001` → ledger PREPROD, con idempotencia, checksum y sin JSON manual.

### Scheduling y horizontes

Ya existen DAILY / WEEKLY / MONTHLY + EVENT planning y execution en PREPROD, con estado persistente, ejecución idempotente y sin autoridad PROD.

### Binding Windows conservado como EDGE

`cerebro/host/windows/Install-CerebroLrn001Host.ps1` y herramientas asociadas:

- útiles para ejecución local cuando el PC esté disponible;
- arranque `AtStartup`, SYSTEM, StartWhenAvailable, restart acotado;
- health, kill switch, backup/restore y aceptación física;
- no dependen de Chrome ni Browser Bridge;
- no usan credenciales nuevas ni proveedores pagados;
- no son requisito del core 24/7.

## Evidencia CI

La suite valida runtime, real event wiring, scheduling/horizons, MetaLearn observability, host binding, PowerShell parsing, aislamiento multiempresa, kill switch, backup/restore, anti-loop y no-PROD.

El CI GREEN prueba comportamiento de software; NO demuestra disponibilidad física 24/7.

## Lo que NO está demostrado todavía

- No existe evidencia viva de un host always-on asignado a `LRN-001`.
- No se afirma disponibilidad 24/7.
- No se afirma restart/reboot del host core.
- No se autoriza PROD.
- No se introduce gasto.

## Gate para cerrar RSI-RECOVERY-004

Para declarar `CONFIRMED_OPERATIONAL_PREPROD_24X7` se requiere:

1. identificar host always-on real;
2. demostrar almacenamiento persistente y capacidad suficiente;
3. desplegar copia versionada del runtime;
4. heartbeat continuo;
5. restart automático;
6. fixture LOW + HIGH_RISK;
7. kill switch;
8. backup + verify + restore;
9. restart/reboot o redeploy real;
10. verificar continuidad de ledger/receipts/orchestrator;
11. observabilidad y rollback probados;
12. coste medido y aceptado.

## Rollback

- detener host core sin borrar estado;
- conservar ledger, receipts, backups, outbox y config;
- mantener Windows EDGE separado;
- no tocar Browser Bridge/App/CRM/Supabase/SEO/Notion/WordPress/Training/Trading.

## Next block

`RSI-RECOVERY-004B · ALWAYS_ON_CORE_HOST_AUDIT`:

- inventariar hosting ya contratado y procesos persistentes existentes;
- descartar explícitamente opciones incompatibles con persistencia/jobs largos;
- elegir host core con coste adicional 0 EUR si existe;
- solo si no existe, elevar alternativa de pago con ROI/coste justificado.
