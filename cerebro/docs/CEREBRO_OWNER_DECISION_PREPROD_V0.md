# CEREBRO Owner Decision PREPROD V0

## Estado

- `environment`: PREPROD
- `company_id`: FENIX_CAPITAL
- `engine_id`: ACTGW-001
- `version`: v0
- `PROD`: NO AUTORIZADO
- `business_write`: false
- `trading_access`: false
- `additional_cost_eur`: 0
- Estado funcional: PARCIAL hasta cerrar prueba física autenticada con `CARLOS-ADMIN` y ciclo completo controller/ACK.

## Objetivo

Permitir que el owner responda a una solicitud HUMAN_REQUIRED desde un correo de CEREBRO mediante botones comprensibles sin convertir la apertura del enlace en una autorización.

Flujo candidato:

`correo -> /cerebro/decision -> sesión autenticada -> Confirmar -> gateway PREPROD -> control plane -> communication controller -> ACK`

La respuesta exacta por email se conserva como vía de respaldo.

## Contrato de decisión

Decisiones aceptadas:

- `AUTORIZO`
- `NO AUTORIZO`
- `EXPLICAME`
- `APARCO`

Identificador obligatorio: `APR-YYYYMMDD-XXXXXXXX`, con ocho caracteres hexadecimales finales.

El GET del enlace nunca registra una decisión. Solo un POST posterior a una confirmación explícita puede alcanzar el gateway.

## Autenticación y autorización

El gateway PREPROD exige:

1. JWT válido del proyecto Supabase PREPROD.
2. Usuario vinculado mediante `preprod_test_actor_context_by_auth_server`.
3. `actor_code = CARLOS-ADMIN`.
4. `role = Direccion`.
5. `active = true`.

No existe token de autorización dentro del enlace de correo. El enlace contiene únicamente ruta, `approval_id` e `intent`.

## Persistencia

La confirmación se registra en `public.cerebro_action_requests_preprod` como control plane:

- `company_id = FENIX_CAPITAL`
- `engine_id = ACTGW-001`
- `environment = PREPROD`
- `action_type = OWNER_DECISION`
- `state = RECEIVED`
- `result.executed = false`
- `result.business_write = false`
- `result.trading_access = false`

La idempotencia usa el índice único existente sobre `company_id, engine_id, environment, proposal_hash`.

## Reconciliación

`cerebro-owner-decision-worker-v0` solo admite GitHub OIDC del repositorio canónico, `refs/heads/main` y el workflow `cerebro-human-communication-v1.yml`.

El controlador:

1. obtiene decisiones App recibidas;
2. las une con respuestas exactas por email;
3. ejecuta la reconciliación mediante el controlador existente;
4. persiste su estado;
5. solo entonces ejecuta ACK.

El ACK no ejecuta una acción de negocio. Marca la decisión como consumida por el controlador y mantiene `executed=false`.

## Dependencias

- PR App/Supabase: `app/owner-decision-confirmation-preprod-v0` / PR #556.
- Supabase PREPROD: `hnqlnvakzaywtafeiybt`.
- RPC existente: `preprod_test_actor_context_by_auth_server`.
- Tabla existente: `public.cerebro_action_requests_preprod`.
- Controlador existente: `cerebro/communication/communication-controller.mjs`.
- Mail bridge existente: `cerebro/communication/mail_bridge.py`.

No se reactiva el antiguo canal PRE-PROD App Build desactivado por orden del owner.

## Evidencia exigida antes de promoción

- Build de App PREPROD GREEN.
- Navegador: GET del enlace = 0 llamadas al gateway.
- Navegador: sesión + no clic = 0 llamadas.
- Navegador: clic explícito = exactamente 1 POST con APR e intención esperados.
- Tests de comunicación GREEN.
- Dry-run de rama GREEN.
- Prueba física pendiente: sesión PREPROD real de `CARLOS-ADMIN` contra gateway desplegado.
- Prueba física pendiente: `RECEIVED -> controller -> ACK` con evidencia.
- OLD vs NEW y rollback antes de cualquier promoción.

## Rollback

Mientras no exista promoción a PROD:

1. cerrar los PRs candidatos;
2. retirar o sustituir las Edge Functions PREPROD si se decide abandonar el candidato;
3. no consumir registros `RECEIVED` no validados;
4. conservar la respuesta exacta por email como comportamiento anterior.

No se requiere migración destructiva ni cambio de datos de negocio.

## Rebuild

Para reconstruir V0:

1. partir de `main` canónico;
2. aplicar primero PR #556 App/Supabase;
3. verificar build y browser gate;
4. aplicar el PR CEREBRO de comunicación;
5. ejecutar tests de comunicación y dry-run;
6. desplegar las dos Edge Functions solo en PREPROD;
7. verificar vínculo Auth real de `CARLOS-ADMIN`;
8. ejecutar la aceptación física autenticada;
9. ejecutar comparación OLD vs NEW y rollback rehearsal;
10. mantener PROD bloqueado hasta promoción explícita.

## Hallazgos fuera de alcance

Existe deuda de seguridad PREPROD independiente en tablas SEO con RLS desactivado. No forma parte de este cambio y no debe corregirse sin inventario de consumidores, políticas actuales, tests y rollback.
