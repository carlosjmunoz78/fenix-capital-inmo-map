# CEREBRO Browser Work Total V1 · PREPROD · 2026-10-24

## Estado ejecutivo

- **HECHO**: rama aislada `feat/browser-work-total-v1-20261024`, construida sobre la UX realtime de PR #919 (`565898a669bb61472471a54c7863fb5338185e11`).
- **HECHO**: runtime combinado `BROWSER_INTERACTIVE_V3_CONTRACT.schema_version=3.5.0`: realtime adaptativo + frame inmediato + persistencia cifrada + hibernación inmediata + restauración entre workers.
- **HECHO**: bundles AES-256-GCM, SHA-256, storage state con IndexedDB y pestañas cifradas; `virtual_webauthn_credentials=false` y raw secret logging desactivado.
- **HECHO**: tests de bundle, contratos Work Total, syntax check y `npm run build` verdes.
- **HECHO**: cuatro funciones Work Total aisladas desplegadas en PREPROD; V0/V1 anteriores permanecen intactas como rollback.
- **HECHO**: tres workers Work Total distintos han restaurado físicamente el workspace. Dos ciclos finalizaron en hibernación y un tercero certificó takeover → handback → AI resume → emergency stop.
- **HECHO**: emergency stop cerró sin guardar un bundle nuevo; el bundle activo previo quedó intacto.
- **HECHO**: owner API PREPROD versión 2 expone profiles, start, status, hibernate, takeover, handback, input cifrado, stop, confirm-account, forget-session y key.
- **HECHO**: coste incremental contractual `0 EUR`; no se añadió SaaS de pago ni IA obligatoria.
- **HECHO**: PROD no modificado por este bloque. Trading no tocado.
- **PARCIAL**: perfil Google principal está definido como metadata PREPROD, pero la primera vinculación física legítima puede requerir login/MFA humano.
- **PARCIAL**: selector visual de perfil/cuenta debe integrarse y certificarse en App/Gateway PREPROD antes de promoción; no conectar un token PROD directamente al owner PREPROD.
- **NO PROMOVIDO**: Work Total V1 no está en PROD.

Estado correcto actual:

`PREPROD_WORK_TOTAL_TECHNICAL_CORE_GREEN`

No declarar todavía `CONFIRMED_OPERATIONAL_PROD`.

## Rama, PR y CI

Rama:

`feat/browser-work-total-v1-20261024`

PR final de integración:

`#921 · Browser Work Total V1: realtime + persistent workspace`

Base:

`fix/browser-realtime-workmode-20261024` / PR #919

PR #921 fue recalculada por GitHub como `mergeable=true`. La integración tentativa #920 fue marcada como supersedida y cerrada.

Workflow:

`.github/workflows/cerebro-browser-work-total-v1-preprod.yml`

Commit CI base certificado:

`6ed1900daf40d992d51ac6b5e164ee2f5ece5c2c`

Runs físicos:

- `40138818495` — SUCCESS.
- `40139153077` — SUCCESS.
- `40139415277` — SUCCESS; incluye no-regresión de control y emergency stop.

En cada ejecución validada se ejecutaron los gates aplicables de tests de bundle, contratos Work Total, syntax y build antes del worker.

## Runtime 3.5.0

Conserva el comportamiento realtime de #919 y lo envuelve con Workspace V1:

- polling interactivo ≈ 90 ms;
- frames activos ≈ 320 ms;
- frames idle ≈ 1200 ms;
- frame inmediato tras acción correcta;
- bundle AES-256-GCM;
- storage state con IndexedDB;
- pestañas cifradas;
- máximo físico de 8 tabs;
- hibernación inmediata por `HIBERNATE_PENDING`;
- restauración en worker nuevo;
- takeover/handback gobernados;
- Google identity verification fail-closed;
- `workspace_prod_enabled=false`;
- `incremental_cost_eur=0`.

## Funciones PREPROD aisladas

Proyecto:

`hnqlnvakzaywtafeiybt`

Funciones nuevas:

1. `cerebro-browser-work-total-dispatch-v1-preprod`
2. `cerebro-browser-work-total-worker-v1-preprod`
3. `cerebro-browser-work-total-v1-preprod`
4. `cerebro-browser-work-total-owner-v1-preprod` — ACTIVE versión 2

OIDC del worker restringido a:

- repo `carlosjmunoz78/fenix-capital-inmo-map`;
- rama `refs/heads/feat/browser-work-total-v1-20261024`;
- workflow `.github/workflows/cerebro-browser-work-total-v1-preprod.yml`.

No usa `main` como identidad del worker Work Total.

## Cadena física de persistencia

Bundle heredado de Workspace V1:

`668684f8-2c4f-43f8-9b4e-b5610096bc44`

### E2E Work Total 1

Session/job:

`2a5d16b3-65a3-4fa9-ae2c-e146199dc93f`

Worker:

`github-work-total-v1-preprod:40138818495:1`

Evidencia:

- `SESSION_RESUMED` desde `668684f8…`;
- `PROFILE_LEASE_ACQUIRED`;
- `CEREBRO_CONTROLLED`;
- URL física `https://fenixcapital.es/`;
- título `Hipotecas en Córdoba: estudio 24 h | Fénix Capital`;
- `frame_seq=6` al cierre;
- hibernación inmediata;
- `SESSION_HIBERNATED`;
- nuevo bundle `9ca0036d-1f59-459a-8426-d7752d3be051`;
- `LEASE_RELEASED`;
- job `SUCCEEDED`;
- sesión `HIBERNATED`;
- `worker_alive=false`.

### E2E Work Total 2

Session/job:

`70330dfb-ad65-4c53-9479-7cefca0284dc`

Worker distinto:

`github-work-total-v1-preprod:40139153077:1`

Evidencia:

- restauró exactamente `9ca0036d…`;
- `PROFILE_LEASE_ACQUIRED` con worker nuevo;
- URL/título reales de Fénix;
- `frame_seq=15`;
- `SESSION_HIBERNATED`;
- nuevo bundle `b21eceef-82fe-4496-ac30-0b218c42e585`;
- `LEASE_RELEASED`;
- job `SUCCEEDED`;
- sesión `HIBERNATED`;
- `worker_alive=false`.

Cadena demostrada:

`668684f8… → worker 40138818495 → 9ca0036d… → worker 40139153077 → b21eceef…`

## E2E Work Total 3 · control humano y parada segura

Session/job:

`eaccf605-0e59-46cd-9753-71da9148c093`

Worker tercero:

`github-work-total-v1-preprod:40139415277:1`

Restauró exactamente el bundle activo:

`b21eceef-82fe-4496-ac30-0b218c42e585`

Evidencia de control:

1. `SESSION_RESUMED` desde `b21eceef…`.
2. `PROFILE_LEASE_ACQUIRED`.
3. `CEREBRO_CONTROLLED` con URL/título reales y frames vivos.
4. transición a `TAKEOVER_PENDING`.
5. el worker creó un lease humano real y pasó a `HUMAN_CONTROLLED`.
6. `HUMAN_TAKEOVER` + `CONTROL_CHANGED CEREBRO → HUMAN`.
7. handback usando el lease vigente.
8. `HUMAN_HANDBACK`.
9. el propio worker emitió `AI_RESUME` con `snapshot_reconciled=true`.
10. `CONTROL_CHANGED HUMAN → CEREBRO`.
11. recuperó `CEREBRO_CONTROLLED`; siguió generando frames.
12. se activó `EMERGENCY_STOP`.
13. el worker liberó el lease y cerró la sesión.
14. job final `SUCCEEDED`, sesión final `CLOSED`, `worker_alive=false`, `emergency_stop=true`, `frame_seq=21`.
15. no existe `SESSION_HIBERNATED` en este tercer ciclo.
16. no se creó bundle tras la parada; el bundle activo sigue siendo `b21eceef-82fe-4496-ac30-0b218c42e585`, con source session del E2E 2.

Esto demuestra que la parada de emergencia no persiste un estado potencialmente peligroso.

## Identidad Google

Perfil PREPROD definido:

- `identity_id=iam:carlos-google-primary`
- `account_id=acct:carlos-google-primary`
- `provider=google`
- `login_policy=HUMAN_LOGIN_REQUIRED`

Política:

1. no copiar password, OAuth token, cookie ni secreto de PROD;
2. login/MFA legítimo inicial, si Google lo solicita, es intervención humana;
3. CEREBRO observa la cuenta y genera HMAC + hint enmascarado;
4. primera cuenta observada requiere confirmación humana;
5. reanudaciones posteriores deben coincidir con el HMAC esperado;
6. mismatch → bloqueo de seguridad;
7. reauth → `HUMAN_REQUIRED / LOW_CONFIDENCE`;
8. no bypass de MFA/CAPTCHA/antiabuse.

## Seguridad

- AES-256-GCM para bundle;
- SHA-256 de integridad;
- HMAC-SHA256 para identidad de cuenta;
- no password en catálogo de perfiles;
- `secret_material_logged=false` en evidencia física;
- `credential_materialized=false` en workers certificados;
- URLs observables saneadas fuera del ciphertext;
- profile lease exclusivo;
- emergency stop probado sin save;
- Trading access=false.

## Rollback

Rollback inmediato:

1. dejar de invocar las cuatro funciones `cerebro-browser-work-total-*`;
2. volver a Workspace V1 o Browser V3 PREPROD anterior;
3. no promover #921;
4. bundles/tablas son aditivos y pueden quedar inertes;
5. #919 conserva por separado la UX realtime;
6. PROD no depende de Work Total PREPROD.

No se eliminó ni reemplazó V0/V1 para conseguir Work Total.

## Gates restantes antes de PROD autónomo

1. vinculación física de Google real con login humano solo si Google lo exige;
2. confirmar identidad Google y demostrar reanudación en worker distinto;
3. test físico de mismatch/reauth Google;
4. selector visual de perfil/cuenta mediante App/Gateway PREPROD;
5. input humano cifrado desde esa UI PREPROD (el lease/control backend ya está probado);
6. comparación OLD vs NEW de UI/latencia y no regresión final;
7. tribunal/promotion evidence final;
8. rollout gradual y rollback final verificado.

Hasta cerrar estos gates: `PREPROD_WORK_TOTAL_TECHNICAL_CORE_GREEN`.
