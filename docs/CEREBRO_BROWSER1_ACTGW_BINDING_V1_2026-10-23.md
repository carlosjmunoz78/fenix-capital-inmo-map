# CEREBRO Browser 1 · ACTGW Binding V1 · 2026-10-23

## Estado

**HECHO · PROD**

Ruta física certificada:

`CEREBRO / ACTGW-001 -> BROWSER-001 -> cerebro_browser_job_v2 -> Browser 1 V2 worker -> Chromium -> resultado auditado`

No sustituye ni elimina Browser V1. V1 permanece como rollback.

## Componentes activos

- Core Supabase PROD: `cluhljgonannaafpmblx`.
- Runtime lógico: `BROWSER-001` / `CEREBRO_BROWSER_1_V2`.
- Orquestación V2 PROD: habilitada con capacidad global 8, compañía 4 y departamento 2.
- Edge Function: `cerebro-browser-dispatch-v2` v2.
- Edge Function de binding: `cerebro-actgw-browser-v1` v1.
- RPC interno ACTGW: `public.cerebro_actgw_browser_enqueue_v1(jsonb)`.
- Worker operativo: `.github/workflows/cerebro-browser-job-runner-v2-live.yml`.
- Worker: `cerebro/runtime/browser-job-runner-v2.mjs`.
- Transporte worker: GitHub OIDC; no se exponen secretos al job ni al chat.

## Política de entrada

El binding ACTGW aplica fail-closed:

- `environment=PROD`.
- riesgo autónomo permitido: `LOW` o `MEDIUM`.
- `HIGH_RISK` -> HUMAN_REQUIRED.
- coste esperado obligatorio: `0 EUR`; gasto -> MONEY_LIMIT / HUMAN_REQUIRED.
- capability `browser1.*`.
- authority incluye `browser_use_authorized=true`, attestation fresca y kill switch.
- identidad, cuenta, compañía, departamento y perfil Browser permanecen separados.
- las credenciales se materializan únicamente en el worker cuando el job y el lease lo autorizan; no se devuelven al texto del agente.

## E2E mínimo de conexión

Job ACTGW de conexión:

- `job_id`: `1bcb886d-bb3b-48e9-9645-c4a555535264`
- `engine_id`: `ACTGW-001`
- `capability`: `browser1.observe`
- `risk`: `LOW`
- `coste`: `0 EUR`
- resultado: `SUCCEEDED`
- `authorization_status`: `AUTHORIZED`
- `evidence_captured`: `true`
- `secret_material_logged`: `false`
- texto observado: `ACTGW Browser Binding Connected`

El job no accedió a una web externa: se utilizó una página `data:` inerte exclusivamente para demostrar el binding físico sin producir efectos externos.

Run del worker V2 usado para la conexión: `39998585270`, workflow `CEREBRO Browser 1 V2 Live Worker`.

## Worker operativo

El workflow V2 queda programado cada 5 minutos.

Para no malgastar recursos:

1. primero consulta el estado de la cola;
2. si no existe trabajo pendiente no levanta Chromium;
3. si existe trabajo, activa el pool V2 gobernado;
4. los límites 8/4/2 y el lease/backpressure siguen siendo autoridad del orquestador.

## Rollback

Se conserva Browser V1 sin modificar como fallback.

Ante una regresión en V2:

1. bloquear nuevas entradas a `BROWSER-001` V2;
2. deshabilitar config V2 PROD;
3. conservar jobs/evidencia para auditoría;
4. volver al dispatcher/worker V1 existente;
5. no eliminar V2 hasta comprender el fallo y probar reparación en paralelo.

Regla: `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Alcance que NO certifica este binding

La conexión del Gateway al navegador no implica que todas las sesiones de terceros ya estén configuradas. Facebook/Meta, Canva u otras herramientas requieren sus perfiles/sesiones autorizados y su binding específico antes de declararlos operativos.

Tampoco autoriza bypass de CAPTCHA, MFA, verificaciones humanas, gasto, obligaciones legales o acciones fuera de política.

## Estado de autonomía

`ACTGW_TO_BROWSER1_V2_PROD_CONNECTED_E2E_GREEN`
