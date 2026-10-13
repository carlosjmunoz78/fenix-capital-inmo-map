# CEREBRO Human Intelligence · autorización de promoción gradual PROD

Fecha: 2026-10-13
Empresa: fenix
Ámbito: CHAT-001 / VOICE-001 / Human Intelligence V1
Estado inicial: PROD_CANARY_UNROUTED / NEW traffic 0%

## HECHO · autorización del owner

El owner ha autorizado expresamente la promoción gradual del gran motor conversacional hasta el 100% en PROD, manteniendo gates, canary, monitorización y rollback automático.

Esta autorización NO elimina ni debilita los controles de promoción. Habilita únicamente la secuencia gobernada descrita en este documento.

## Límites invariantes

- CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR.
- OLD `cerebro-console-gateway-v0` permanece disponible como rollback durante toda la promoción.
- No big-bang.
- No ampliación de permisos, secretos, presupuesto, Trading ni escrituras de negocio por efecto de esta autorización.
- Coste adicional objetivo: 0 EUR.
- `LRN-001` continúa observation-only para conversaciones individuales; no existe autopromoción de reglas desde una conversación aislada.
- FULL_OWNER / FENIX_OPERATIONAL permanecen según PR #616.
- Cualquier `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT` o `CUSTOMER_HUMAN_REQUEST` conserva HUMAN_REQUIRED.

## Secuencia autorizada

1. Desplegar el router fail-closed en PROD sin consumidores y con NEW=0%.
2. Conectar consumidores al router manteniendo NEW=0%; OLD debe seguir siendo la autoridad efectiva.
3. Verificar físicamente que el comportamiento OLD permanece y que rollback es ejecutable.
4. Habilitar canary real mínimo solo si todos los gates exact-head están GREEN.
5. Incrementar por etapas únicamente con métricas y OLD-vs-NEW no regresivas.
6. Ante regresión, incidente, pérdida de evidencia o gate rojo: rollback inmediato a OLD y detener el avance.
7. Alcanzar 100% NEW únicamente después de superar todas las etapas previas y mantener OLD como rollback durante la ventana de estabilización.

## Evidencia física de fase 0

Antes de este documento se verificó que:

- PREPROD `cerebro-console-human-router-zero-v1` estaba ACTIVE y compilado con `LIVE_CANARY_PERCENT=0`.
- PROD mantenía `cerebro-console-gateway-v0` como autoridad estable y `cerebro-console-gateway-human-v1-canary` como candidato additive/unrouted.
- Se desplegó en PROD, de forma aditiva y sin consumidores, `cerebro-console-human-router-zero-v1` versión 1 con `LIVE_CANARY_PERCENT=0`.
- El despliegue no modifica el gateway OLD, no habilita NEW traffic y no autoriza PROD writes ni Trading.

## Rollback fijado

Rollback de consumidor: volver `VITE_CEREBRO_CONSOLE_URL` a:

`https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/`

Baseline de código anterior a esta misión:

`f54f3d0b5177ac4178d8b27d4f3d927913bc782e`

El workflow `PROD Rollback Rehearsal` permanece como mecanismo de ensayo de snapshot. El router zero es aditivo y puede quedar sin consumidores sin afectar a OLD.

## Estado de esta rama

DEFINIDO / EN PROMOCIÓN CONTROLADA.

La modificación de `prod-live-deploy.yml` prepara el cutover de consumidor a `cerebro-console-human-router-zero-v1`, pero el router sigue compilado a 0%; por tanto, incluso tras ese cutover, la autoridad efectiva continúa siendo OLD hasta una promoción canary posterior y separada.
