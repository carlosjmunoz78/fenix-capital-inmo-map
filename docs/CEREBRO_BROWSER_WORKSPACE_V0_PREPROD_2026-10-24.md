# CEREBRO Browser Workspace V0 · PREPROD · 2026-10-24

## Estado

- HECHO: rama aislada `cerebro/browser-workspace-v0-20261024` creada desde `40af4aa0d8038ceebf874419a6459752485fc853`.
- HECHO: PROD no modificado por este bloque.
- HECHO: UX del visor ampliado corregida en rama: compositor visible, salida con `Esc`, indicación de órdenes activas.
- HECHO: tabla PREPROD `cerebro_browser_session_bundle_v1` creada con RLS, ciphertext-only y un bundle ACTIVE por perfil.
- HECHO: helper `browser-session-bundle-v1.mjs` con AES-256-GCM, SHA-256, IndexedDB y pestañas completas dentro del payload cifrado.
- HECHO: tests criptográficos y syntax check verdes en GitHub Actions.
- HECHO: dispatch y worker Workspace PREPROD aislados por rama/OIDC activos.
- HECHO: E2E físico PREPROD demostró worker real, `CEREBRO_CONTROLLED`, URL `https://fenixcapital.es/`, título físico y frames vivos.
- EXISTENTE: identidad, cuenta, `browser_profile_id`, profile leases exclusivos, credential bindings y auditoría sin secret material.
- PARCIAL: hibernación/reanudación está implementada en runtime y broker, pero el primer fixture físico todavía no ha producido evidencia de bundle guardado/restaurado al redactar este documento.
- PARCIAL: transición `HIBERNATE_PENDING` y endpoint gobernado de solicitud de hibernación existen en PREPROD; falta cerrar E2E de cambio A→B→A.
- PARCIAL: owner API de perfiles/start/status existe en PREPROD; UI React todavía no muestra selector de perfil/cuenta.
- POR AUDITAR: binding PROD `google-primary` usado históricamente en flujos Facebook; no asumir equivalencia de cuenta/proveedor.
- NO OPERATIVO: verificación determinista de la cuenta Google visible frente al perfil esperado.
- NO OPERATIVO: promoción a PROD del Workspace V0.

## Contrato de identidad

Clave lógica de workspace:

`company_id + environment + identity_id + account_id + browser_profile_id`

Nunca compartir cookies o storage entre perfiles distintos.

## Persistencia

El objetivo no es mantener un GitHub runner vivo indefinidamente. El contrato es:

1. adquirir profile lease exclusivo;
2. restaurar bundle cifrado, si existe y no está revocado/expirado/mismatch;
3. arrancar navegador físico;
4. trabajar;
5. hibernar storage state + pestañas completas dentro del ciphertext;
6. guardar fuera del ciphertext solo metadatos saneados;
7. cerrar worker y liberar lease;
8. reanudar con otro worker cuando sea necesario.

El bundle no guarda contraseñas ni tokens en texto plano. `virtual_webauthn_credentials=false`.

## Google / primer login

- No bypass de MFA, CAPTCHA ni antiabuse.
- Si no existe bundle verificado, la política es `HUMAN_LOGIN_REQUIRED`.
- El humano puede tomar control para completar el login legítimo.
- Tras la primera vinculación debe registrarse un `verified_account_hint` seguro y verificarse en cada reanudación.
- Si la cuenta visible no coincide: `MISMATCH`; no continuar bajo otra identidad.
- Si Google exige autenticación de nuevo: `REAUTH_REQUIRED`.

## Cambio rápido de cuenta

Flujo objetivo:

`perfil A activo → HIBERNATE_PENDING → bundle A → lease A liberado → lease B → bundle B restaurado → cuenta B verificada → perfil B activo`

La parada de emergencia no equivale a hibernación.

## Auditoría mínima

Eventos objetivo:

- `PROFILE_SELECTED`
- `PROFILE_LEASE_ACQUIRED`
- `SESSION_RESUMED`
- `ACCOUNT_VERIFIED`
- `PROFILE_SWITCH_REQUESTED`
- `SESSION_HIBERNATED`
- `LEASE_RELEASED`
- `REAUTH_REQUIRED`
- `SESSION_EXPIRED`
- `LOGOUT`

Todos con `secret_material_logged=false`.

## Coste

Coste incremental objetivo y contrato V0: `0 EUR`.

No se añade SaaS de pago ni API de IA obligatoria.

## Seguridad

- PREPROD únicamente para estas piezas nuevas.
- PROD write no autorizado.
- Trading access=false.
- OIDC GitHub limitado a repo + workflow + rama exactos.
- Profile lease impide uso simultáneo del mismo perfil.
- RLS habilitada en bundles.
- URLs visibles fuera del ciphertext se saneean sin query/hash/credenciales.

## Rollback

1. Desactivar/no invocar funciones `cerebro-browser-workspace-*-preprod`.
2. Volver al workflow anterior de Browser V3 PREPROD.
3. No promover la rama Workspace.
4. La tabla de bundles es aditiva y puede quedar inerte; no es dependencia de Browser V3 PROD.
5. PROD permanece en su línea anterior y no depende de estos contratos.

## Gate antes de PROD

No promover hasta demostrar:

1. save bundle físico;
2. restore bundle en worker distinto;
3. tabs restauradas;
4. aislamiento A/B;
5. cambio A→B→A;
6. reauth segura;
7. verificación de cuenta Google;
8. takeover/handback sin regresión;
9. parada de emergencia sin guardar estado peligroso;
10. cero secretos en logs/tablas;
11. rollback probado;
12. UI selector de perfil/cuenta y visor grande usable;
13. tests y tribunal verdes.
