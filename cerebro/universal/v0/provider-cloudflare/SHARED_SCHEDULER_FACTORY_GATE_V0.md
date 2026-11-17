# CEREBRO OS · FACT-001 · Planificador compartido Cloudflare · Decisión técnica V0

**Fecha:** 2026-11-15 · **Ámbito:** Fénix LAB únicamente · **Estado:** `DEFINIDO / SHADOW_TESTED`, no incorporado a un Worker programado.

## 1. Problema físico, no supuesto
Workers Free tiene límite documentado de **5 cron triggers por cuenta**. Cloudflare rechazó añadir el sexto cron al canario aislado: HTTP 400 código 10072. Se conservaron por GET cinco cron originales; el canario tiene [] y sin public worker route. La cuenta contiene 38 Workers. No modificar ni liberar un cron para avanzar sin mapas de dependencias y rollback.

Documentación de proveedor (consulta 2026-11-15):
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/durable-objects/
- https://developers.cloudflare.com/durable-objects/platform/pricing/

## 2. Inventario de los cinco programadores existentes

| Worker | Cron UTC | Dependencias vistas en código o bindings | Riesgo de tocarlo |
|---|---|---|---|
| `cerebro-fact001-headless-operator-lab-20261111` | `*/5 * * * *` | `RECOVERY_DB` D1, credenciales Cloudflare Workers y Pages; tick de Workers + Pages + D1 + Vercel; pruebas y recuperación FACT | **ALTO**, puede romper más de una integración |
| `cerebro-fact001-recovery-runner-lab` | `*/5 * * * *` | D1 `RECOVERY_DB`, aceptación/probes P5, programaciones de recuperación | **ALTO**, no cambiar el camino de restauración |
| `cerebro-facebook-buffer-replenisher-lab` | `*/20 * * * *` | token externo Buffer, KV/DO, service bindings; flags de publicación y despacho verificadas false | **ALTO**, jamás disparar publicaciones ni cambiar flags sin contrato específico |
| `cerebro-ums001-multisource-scout-lab-eu` | `12 7 * * *` | `REFRESH_QUEUE`, `LAB_KV`, fuente externa, flags de adquisición de contenido y licencias | **MEDIO/ALTO**, no descargar activos automáticamente |
| `cerebro-ums001-polyhaven-dualmode-candidate-lab-eu` | `23 6 * * *` | `MEDIA_COORDINATOR` Durable Object, KV; invocación diaria | **MEDIO/ALTO**, preservar coordinador |

**Resultado:** ninguno de esos cinco puede darse por libre, inerte o apto para sustituirse; su eliminación rompería obligaciones. No se modifica código, binding, cron, ruta, base ni secret de los cinco.

## 3. Opción preferida de fábrica: SHARED SCHEDULER SHADOW
El algoritmo fuente `shared-scheduler-shadow.mjs` sólo devuelve planes deterministas. Sus pruebas validan:
- identidad `fenix/LAB`, scheduler exacto, cuota 5/5 y versiones de registro;
- prioridad 1 a 5, pausa, due dates, límites de entrada, deduplicación por idempotency_key;
- máximo 2 planes por tick, concurrencia futura 1, cero euros adicionales y cero efectos externos;
- denegación para gastos, PROD, identidades ajenas y discrepancias de snapshot;
- ausencia total de red, D1, despliegues y mutaciones.

Un resultado `SHADOW_PLAN_ONLY` **no equivale a ejecutar ni a haber compartido un cron**. Antes de integrar necesita:
1. Snapshot binario/contractual del Worker elegido, versión desplegada real, scripts, bindings y cinco cron. Nunca usar `GET /settings` como evidencia de configuración efectiva sin unirse a `GET /deployments` → `GET /versions/{id}`: una versión subida todavía sin desplegar modifica lo que reporta `GET /settings`.
2. Contrato OLD y golden tests del `scheduled()` original con probes D1, Pages, Vercel, fact recovery.
3. Wrapper paralelo, flag `SHARED_SCHEDULER_ENABLED=false` por defecto, sin conexiones a otros engines hasta evaluación. No cron adicional.
4. Sandbox con inyección determinista de eventos, tests idempotentes y auditoría sin secretos; **no** publicar ni ejecutar real.
5. PREPROD/QA, OLD vs NEW, backup y rollback físico de versión, monitoreo y coste de llamadas antes de activación.
6. Promoción progresiva explícita del canario, nunca acciones de Facebook, SEO, App, CRM o Trading por defecto.

## 4. Alternativa de coste bajo a evaluar
Los **Durable Objects SQLite-backed** están disponibles en Workers Free y tienen soporte de alarms, separados de cron triggers. Posible camino: alarma persistida con idempotencia y presupuesto diario. Esta opción NO evita diseñar una vía privada de bootstrap/administración, las políticas de consumo y el aislamiento. No crear recursos ni habilitar alarmas hasta probar quotas, permisos y una vía privada sin exponer workers.dev. No se afirma estar operativo.

## 5. Control Cloudflare V0.2: aceptación física separada
El Worker **único** `cerebro-operativa-control-canary-lab` sí se sometió a prueba física de **configuración** mediante versiones inmutables:
- deployed `1a6d2051-…` PAUSED true → `44d92703-…` PAUSED false → de nuevo `1a6d2051-…` PAUSED true.
- En las tres lecturas se mantuvo cron=[], subdominio OFF, previews OFF.
- Los cinco programadores existentes conservaron sus cron, verificados con GET.
- Recibos exactos: `canary/physical-provider-control-2026-11-15.json`.

Esto acredita **cambio de configuración con readback y rollback en Cloudflare**, no ejecución de un trabajo del canario, no disponibilidad del control desde la app y no un scheduler compartido.

## 6. Gate de promoción (todo debe VERDE)
Inventario, mapa de dependencias, backup y versión desplegada, contrato OLD, pruebas de regresión, implementación paralela, PREPROD, comparación, rollback físico, tribunal, observabilidad, coste real, permisos y política de human exception. Hasta entonces `RUNTIME_EXECUTION_VERIFIED=false` y `PRODUCTION_ELIGIBLE=false`.

**Principio:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
