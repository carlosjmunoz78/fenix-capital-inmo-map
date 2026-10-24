# CEREBRO Browser Work Total V1 · PREPROD · 2026-10-24

## Estado

- HECHO: rama aislada `feat/browser-work-total-v1-20261024`, creada sobre la UX realtime de PR #919 (`565898a669bb61472471a54c7863fb5338185e11`).
- HECHO: runtime combinado `BROWSER_INTERACTIVE_V3_CONTRACT.schema_version=3.5.0` con realtime adaptativo + persistencia cifrada + hibernación inmediata.
- HECHO: tests de bundle cifrado, contratos Work Total, syntax check y `npm run build` verdes en GitHub Actions.
- HECHO: funciones Work Total aisladas desplegadas en PREPROD; V0/V1 anteriores permanecen intactas como rollback.
- HECHO: dos ciclos físicos consecutivos Work Total → hibernar → worker nuevo → restaurar → continuar → hibernar.
- HECHO: owner API PREPROD versión 2 expone perfiles, start/status, hibernate, takeover, handback, input cifrado, stop, confirm-account, forget-session y key.
- HECHO: coste incremental contractual `0 EUR`; no se añadió SaaS de pago ni IA obligatoria.
- HECHO: PROD no modificado por este bloque. Trading no tocado.
- PARCIAL: perfil Google principal definido como metadata PREPROD, pero todavía requiere primera vinculación humana legítima si Google pide login/MFA.
- PARCIAL: selector visual de perfil/cuenta todavía no está promovido en la App PROD; debe entrar por gateway/feature flag tras PREPROD UI, nunca conectando PROD directamente al owner PREPROD.
- NO PROMOVIDO: Work Total V1 no está en PROD.

## Rama y CI

Rama:

`feat/browser-work-total-v1-20261024`

Commit CI certificado:

`6ed1900daf40d992d51ac6b5e164ee2f5ece5c2c`

Workflow:

`.github/workflows/cerebro-browser-work-total-v1-preprod.yml`

Run 1:

`40138818495`

- Validate Work Total contracts and build: SUCCESS.
- Watch PREPROD Work Total queue: SUCCESS.
- Browser Work Total V1 governed worker: SUCCESS.
- Rearm PREPROD Work Total consumer: SUCCESS.

Run 2:

`40139153077`

- Validate Work Total contracts and build: SUCCESS.
- Watch PREPROD Work Total queue: SUCCESS.
- Browser Work Total V1 governed worker: SUCCESS.
- Rearm PREPROD Work Total consumer: SUCCESS.

## Runtime 3.5.0

Combina sin eliminar comportamiento existente:

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
- verificación Google fail-closed;
- `workspace_prod_enabled=false`;
- `incremental_cost_eur=0`.

## Funciones PREPROD aisladas

Proyecto PREPROD:

`hnqlnvakzaywtafeiybt`

Funciones nuevas:

1. `cerebro-browser-work-total-dispatch-v1-preprod`
2. `cerebro-browser-work-total-worker-v1-preprod`
3. `cerebro-browser-work-total-v1-preprod`
4. `cerebro-browser-work-total-owner-v1-preprod` — owner desplegado versión 2 tras cerrar paridad de rutas.

OIDC restringido a:

- repo `carlosjmunoz78/fenix-capital-inmo-map`;
- rama `refs/heads/feat/browser-work-total-v1-20261024`;
- workflow `.github/workflows/cerebro-browser-work-total-v1-preprod.yml`.

No usa `main` como identidad de worker Work Total.

## Cadena de bundles y workers

Bundle heredado de Workspace V1:

`668684f8-2c4f-43f8-9b4e-b5610096bc44`

### E2E Work Total 1

Session/job:

`2a5d16b3-65a3-4fa9-ae2c-e146199dc93f`

Worker:

`github-work-total-v1-preprod:40138818495:1`

Evidencia viva:

- `SESSION_RESUMED` desde bundle `668684f8-2c4f-43f8-9b4e-b5610096bc44`;
- `PROFILE_LEASE_ACQUIRED`;
- `CEREBRO_CONTROLLED`;
- URL física `https://fenixcapital.es/`;
- título `Hipotecas en Córdoba: estudio 24 h | Fénix Capital`;
- `frame_seq=6` al cierre;
- solicitud de hibernación procesada en segundos;
- `SESSION_HIBERNATED`;
- nuevo bundle `9ca0036d-1f59-459a-8426-d7752d3be051`;
- `LEASE_RELEASED`;
- job `SUCCEEDED`;
- sesión `HIBERNATED`;
- `worker_alive=false`;
- `secret_material_logged=false`;
- `credential_materialized=false`.

### E2E Work Total 2

Session/job:

`70330dfb-ad65-4c53-9479-7cefca0284dc`

Worker distinto:

`github-work-total-v1-preprod:40139153077:1`

Evidencia viva:

- `SESSION_RESUMED` específicamente desde bundle Work Total `9ca0036d-1f59-459a-8426-d7752d3be051`;
- `PROFILE_LEASE_ACQUIRED` con worker nuevo;
- URL física `https://fenixcapital.es/`;
- título real de Fénix;
- `frame_seq=15` al cierre;
- `SESSION_HIBERNATED`;
- bundle sucesor `b21eceef-82fe-4496-ac30-0b218c42e585`;
- `LEASE_RELEASED`;
- job `SUCCEEDED`;
- sesión `HIBERNATED`;
- `worker_alive=false`.

Cadena demostrada:

`668684f8… → worker 40138818495 → 9ca0036d… → worker 40139153077 → b21eceef…`

El bundle activo resultante es:

`b21eceef-82fe-4496-ac30-0b218c42e585`

## Identidad Google

Perfil PREPROD definido:

- `identity_id=iam:carlos-google-primary`
- `account_id=acct:carlos-google-primary`
- `provider=google`
- `login_policy=HUMAN_LOGIN_REQUIRED`

Reglas:

1. no se copia contraseña, OAuth token, cookie ni secreto de PROD;
2. si Google pide login/MFA, HUMAN_REQUIRED;
3. después del login, CEREBRO observa la cuenta y genera HMAC de identidad + hint enmascarado;
4. la primera cuenta observada requiere confirmación humana;
5. reanudaciones posteriores deben coincidir con el HMAC esperado;
6. mismatch → bloqueo de seguridad;
7. reauth → HUMAN_REQUIRED;
8. no bypass de MFA/CAPTCHA/antiabuse.

## Seguridad y secretos

- bundles cifrados con AES-256-GCM;
- integridad SHA-256;
- cuenta verificada por HMAC-SHA256;
- raw secret logging desactivado;
- `virtual_webauthn_credentials=false`;
- ningún password se almacena en el catálogo de perfiles;
- URLs observables se saneean fuera del ciphertext;
- profile lease exclusivo evita uso simultáneo del mismo perfil;
- Trading access=false.

## Rollback probado por arquitectura paralela

Rollback inmediato:

1. dejar de invocar las cuatro funciones `cerebro-browser-work-total-*`;
2. volver a Workspace V1 o Browser V3 PREPROD anterior;
3. no promover esta rama;
4. bundles/tablas aditivas pueden quedar inertes sin afectar Browser V3 PROD;
5. PR #919 mantiene por separado la UX realtime;
6. PROD no depende de Work Total PREPROD.

No se eliminó ni reemplazó V0/V1 para conseguir Work Total.

## Gates restantes antes de PROD autónomo

1. vinculación física Google real con login humano si se solicita;
2. confirmar cuenta y demostrar reanudación Google en worker distinto;
3. mismatch/reauth test;
4. takeover → input humano → handback → AI resume en candidato integrado;
5. parada de emergencia y no-save peligroso;
6. selector visual de perfil/cuenta en PREPROD App/Gateway;
7. comparación OLD vs NEW de UI/latencia y no regresión;
8. tribunal/promotion evidence final;
9. rollout gradual con rollback probado.

Hasta cerrar estos gates, estado correcto: `PREPROD_WORK_TOTAL_TECHNICAL_CORE_GREEN`, no `CONFIRMED_OPERATIONAL_PROD`.
