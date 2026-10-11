# CEREBRO · AUTO-001 REPAIR VALIDATION + TRIBUNAL V0 · 2026-10-11

## Estado

**DEFINIDO / EN VALIDACIÓN.**

## Objetivo

Cerrar el gate posterior al parche automático sin conceder todavía promoción autónoma a PROD.

Para la primera clase certificada `APP_AUTH_SHELL_ROLE_MAIN_V0`, QA compara el `src/App.tsx` exacto del SHA base contra el candidato y exige:

- un único fichero modificado;
- delta máximo de 4 líneas;
- métrica `public_auth_main_landmarks` 0 → 2;
- ninguna auth shell sin parchear;
- reproducción exacta del candidato al reaplicar el transform certificado sobre el snapshot base;
- snapshot base disponible como rollback;
- build y tests verdes.

Después, `JDG-001` actúa como tribunal independiente. Puede declarar `APPROVE_PREPROD_PATCH`, pero V0 mantiene `merge_authorized=false`, `promotion_authorized=false`, `prod_authorized=false` y `prod_write_authorized=false`.

## Cadena

`QA-001 -> SELF-001 -> QA Source Mapping -> AUTO-001 -> repair PR -> QA OLD vs NEW -> regression -> rebuild/rollback -> JDG-001`.

## Siguiente gate

`GOVERNED_LOW_RISK_PROMOTION_POLICY`.

## Seguridad y coste

0 € adicionales; sin datos de clientes; sin Trading; sin auto-merge; sin escritura directa de PROD.
