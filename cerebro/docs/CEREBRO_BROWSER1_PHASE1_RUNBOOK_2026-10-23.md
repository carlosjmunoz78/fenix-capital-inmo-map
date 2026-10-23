# CEREBRO Browser 1 · Fase 1 · Runbook

Fecha: 2026-10-23

## Objetivo

Dejar a CEREBRO una capacidad transversal de navegador real, ejecutable en cloud sin depender del PC de Carlos, con un contrato simple y límites deliberados. Esta fase NO incluye el pool/orquestador de concurrencia ni el visor humano en directo.

## Estado de entrega

- `BROWSER-1`: capacidad transversal, no motor de autoridad.
- Entrada canónica: `CEREBRO Console -> ACTGW-001 -> browser1.observe | browser1.act -> Browser 1 -> Chromium`.
- Runtime físico: Playwright + Chromium.
- Superficie cloud de aceptación: GitHub Actions ephemeral runner.
- Coste adicional requerido: 0 EUR.
- PROD: solo observación pública mediante canary hasta que una mutación PROD cumpla las puertas canónicas de promoción del motor de origen.

## Límites deliberados de Fase 1

- sesiones activas simultáneas: 1;
- sesiones/cuentas registradas: hasta 64;
- pestañas por sesión: hasta 8, incluidos popups abiertos por la web;
- acciones por trabajo: hasta 50;
- timeout de acción por defecto: 30 s;
- ejecución: serial.

Estos límites son el punto de partida de Fase 1. Su ampliación corresponde exclusivamente a Fase 2 y no debe introducirse durante el cierre de esta entrega.

## Multiidentidad / multicuentas

Una empresa puede registrar múltiples identidades independientes. Ejemplo:

- `company_id=fenix`, `identity_id=google-a`, `account_id=facebook-a`, `browser_profile_id=A`;
- `company_id=fenix`, `identity_id=google-b`, `account_id=facebook-b`, `browser_profile_id=B`.

Cada perfil conserva cookies/storage/login por separado. Se deniega reutilización entre `company_id`, `environment` o departamentos no autorizados. En Fase 1 pueden existir muchas cuentas registradas, pero Browser 1 procesa una sesión activa cada vez.

## Capacidades Fase 1

Navegación, atrás/adelante/recarga, abrir/cerrar/cambiar pestaña, click/doble click/hover, rellenar/escribir/teclas, checkbox, select, upload, drag, scroll, espera, extracción de texto/HTML, screenshot, PDF y descarga mediante click.

No se autoriza JavaScript arbitrario de página, bypass de CAPTCHA, bypass de MFA ni bypass anti-abuso.

## Seguridad y autoridad

Browser 1 nunca concede autoridad. ACTGW-001 y el motor de origen deben autorizar la operación. La autoridad del navegador se inyecta desde servidor mediante `authority_provider`; no se acepta desde el payload del usuario.

Campos de secreto crudo como contraseñas, tokens, cookies, `storage_state` o `session_bundle` están prohibidos en el payload del Gateway. Las sesiones autenticadas usan bundles registrados y material de sesión cifrado/resuelto por el resolver gobernado.

Mutaciones PROD continúan bloqueadas salvo que el motor de origen tenga autoridad PROD y estén verdes promoción, rollback, observabilidad, auditoría e idempotencia. Coste incremental > 0 sigue la política `MONEY_LIMIT`.

## Evidencia y acceptance gate

Workflow: `.github/workflows/cerebro-cloud-browser-worker-v0.yml`.

Acceptance gate: `BROWSER1_PHYSICAL_E2E_AND_REGRESSION_GREEN`.

La aceptación exige simultáneamente:

1. Chromium real arranca en cloud.
2. Browser 1 navega, escribe, pulsa y verifica resultado.
3. La cadena física Console -> ACTGW-001 -> Browser 1 -> Chromium es GREEN.
4. El límite físico de pestañas también se aplica a popups de la web.
5. El aislamiento de cuentas de la misma empresa está probado.
6. Raw secrets fallan cerrado en Gateway.
7. Full CEREBRO regression queda GREEN.
8. El código se promociona a `main` por PR con el gate GREEN.
9. El canary PROD de observación pública queda GREEN después de la promoción.

## Dependencias

- `cerebro/runtime/browser1-access-v1.mjs`
- `cerebro/runtime/cloud-browser-worker-v0.mjs`
- `cerebro/runtime/cloud-browser-governed-session-v1.mjs`
- `cerebro/runtime/browser-session-binding-v1.mjs`
- `cerebro/runtime/browser-session-secret-resolver-v1.mjs`
- `cerebro/runtime/browser-transversal-autonomy-v1.mjs`
- `cerebro/gateway/action-gateway-v1.mjs`
- `cerebro/gateway/browser1-action-gateway-binding-v1.mjs`
- `cerebro/console/gateway.mjs`
- `cerebro/console/action-gateway-binding-v1.mjs`
- `cerebro/registry/browser1-access-policy.v1.json`

## Backup / rollback / rebuild

No hay migración destructiva ni sustitución de Browser Bridge. El cambio es aditivo. Backup y rollback están cubiertos por historial Git y por el kill switch del navegador.

Rollback inmediato: desregistrar `browser1.observe`/`browser1.act` o revertir el commit de promoción. Las sesiones y perfiles quedan aislados y no autorizan acciones por sí mismos.

Rebuild: checkout del commit canónico, `npm ci`, instalación de Chromium con Playwright, ejecución del workflow de aceptación. No requiere nueva suscripción.

## Fases posteriores — NO incluidas aquí

- Fase 2: ampliar concurrencia, pool de workers, colas/prioridades, recuperación y límites todo lo posible.
- Fase 3: visor humano en directo, estado de sesiones y takeover/control visible.

No iniciar Fase 2 ni Fase 3 como parte de este runbook de cierre de Fase 1.
