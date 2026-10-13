# CEREBRO Human Intelligence · FULL_OWNER 100 V1

## Estado

- `company_id`: `fenix`
- `engine_id`: `CHAT-001/VOICE-001`
- `environment`: `PROD`
- `version`: `FULL_OWNER_100_V1`
- propietario inicial: Carlos / perfil `FULL_OWNER`
- tráfico público externo actual: ninguno declarado
- siguiente usuario previsto: Belén, **no activada por este cambio**

## Objetivo

Permitir que el propietario use el núcleo conversacional Human Intelligence V1 al 100% sin esperar un rollout de volumen público inexistente. La nueva superficie es aditiva y conserva como autoridad al gateway estable `cerebro-console-gateway-v0`.

## Contrato de autoridad

`cerebro-console-gateway-human-v1-owner100` no crea una autoridad de negocio nueva. Reenvía la autenticación y la petición al gateway OLD. OLD sigue siendo autoridad para autenticación de usuario, contexto de actor, conocimiento, acciones y respuestas protegidas. El overlay solo puede intervenir sobre respuestas pasivas `OK` de `/chat` y debe preservar literalmente el mensaje autoritativo.

Respuestas `ACTION_*`, `HUMAN_REQUIRED`, `ERROR`, `INVALID`, acciones, ejecuciones y cualquier resultado no pasivo atraviesan sin modificación semántica. Si el overlay falla, se devuelve OLD.

## Seguridad y permisos

- No `SUPABASE_SERVICE_ROLE_KEY`.
- No nueva escritura de negocio en PROD.
- No acceso Trading.
- No ampliación de permisos de Carlos: reutiliza el contrato `FULL_OWNER` existente.
- Una petición sin sesión Supabase válida debe seguir fallando en OLD.
- GitHub OIDC solo autoriza endpoints sintéticos `/canary/*`; no autoriza rutas de negocio.
- Belén no debe usar esta superficie owner-only. En su onboarding deberá recibir contrato propio `FENIX_OPERATIONAL`/rol y una ruta separada.

## Dependencias preservadas

- `cerebro-console-gateway-v0` — autoridad estable y rollback final.
- `cerebro-console-human-router-zero-v1` — rollback 0%.
- `cerebro-console-gateway-human-v1-live5` — rollback canary previamente validado.
- Supabase Auth/actor-context existentes.
- App Fénix y su build PROD existente; el consumidor se cambia solo en una PR separada después de cerrar este gate.
- LRN-001 continúa gobernado; una conversación no promociona conocimiento canónico por sí sola.
- Trading permanece aislado.

## Gates de promoción

Antes de cambiar el consumidor PROD a owner100:

1. Fuente y overlay contractualmente verificados.
2. OLD/zero/live5 sin cambios.
3. Pruebas Human Intelligence existentes en verde.
4. Función owner100 físicamente `ACTIVE` en PROD.
5. OIDC `/canary/health` confirma `PROD_FULL_OWNER_100`, `live_percent=100`, OLD como autoridad y coste 0.
6. Petición normal sin sesión válida falla cerrada por OLD.
7. Token GitHub OIDC no puede actuar como sesión de negocio.
8. Rehearsal sintético preserva mensaje autoritativo y resultados protegidos.
9. PR de consumidor separada, build PROD y Runtime Smoke posteriores a promoción en verde.

## OLD vs NEW

- OLD: `https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/`
- NEW owner-only: `https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-human-v1-owner100/`
- Rollback intermedio: `.../cerebro-console-gateway-human-v1-live5/`
- Rollback 0: `.../cerebro-console-human-router-zero-v1/`

NEW llama primero a OLD. Por tanto, una regresión del overlay no debe alterar autoridad, permisos ni acciones; el fail-safe devuelve la respuesta OLD.

## Rollback

El futuro cambio de consumidor quedará encapsulado en `VITE_CEREBRO_CONSOLE_URL` de `.github/workflows/prod-live-deploy.yml`, en una PR separada. Para rollback se restaura la URL de `live5`, `zero` o OLD y se ejecuta el deployment canónico. Las superficies anteriores no se eliminan ni se modifican.

## Backup / rebuild

La fuente de owner100 queda versionada en `supabase/functions/cerebro-console-gateway-human-v1-canary/owner100.ts` y reutiliza `overlay.ts` del mismo paquete gobernado. Puede reconstruirse desplegando esos archivos con `verify_jwt=false`; esta excepción es deliberada porque la autenticación de negocio permanece en OLD y los endpoints `/canary/*` implementan verificación OIDC propia.

## Observabilidad

Evento privacy-safe: `CEREBRO_HI_OWNER100_ROUTE_V1`.
No registra mensajes, tokens, IDs de sesión ni PII. Campos: versión, ruta, estado HTTP, overlay aplicado, razón acotada y flags de seguridad.

## Aprendizaje y conocimiento

Este rollout no convierte conversaciones en conocimiento canónico automáticamente. Mantiene el contrato existente: contexto conversacional puede utilizarse para continuidad; aprendizaje persistente/canónico sigue bajo LRN-001, evaluación y políticas. Los humanos sintéticos producen evidencia de evaluación, no evidencia de usuario real.

## Autonomía

- Carlos `FULL_OWNER`: objetivo de esta promoción = 100% NEW con OLD como autoridad y rollback.
- Belén: `PLANIFICADO`, onboarding independiente y permisos recortados.
- Usuarios posteriores: `PLANIFICADO`, alta individual por rol.
- Público/externo: fuera del alcance de este cambio.

## Coste

Coste adicional objetivo y declarado: `0 EUR`.
