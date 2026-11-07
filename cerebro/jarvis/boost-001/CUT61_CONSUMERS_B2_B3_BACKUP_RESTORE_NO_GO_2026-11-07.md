# CEREBRO OS · JARVIS V2 · CUT61 — Inventario físico de consumidores, B2/B3 y backup/restauración

**Fecha:** 2026-11-07
**Compañía:** `fenix`
**Engine / environment / version:** `JARVIS` / `LAB` / `CUT61-v0.1`
**Repositorio y rama de trabajo:** `carlosjmunoz78/fenix-capital-inmo-map` / `cerebro/jarvis-deepseek-weekend-lab-20261106`
**Objetivo real:** cerrar requisitos para JARVIS V2 en PROD, no dar por finalizado en LAB.
**Resultado:** **HECHO auditoría del plano SQL y B3 real; BLOQUEADO alta/ingesta y PROD**; 0 escrituras, 0 coste nuevo de IA.

## 1. Inventario REAL del destino Supabase `cluhljgonannaafpmblx`

Se ejecutó exclusivamente SQL de lectura sobre PostgreSQL 17 para `pg_proc`, `pg_constraint`, `pg_class`, `pg_policies` y recuentos de entidades CEREBRO.

- **17 funciones públicas SQL**, cuyos cuerpos refieren expresamente a una o más de `cerebro_company_registry_preprod`, `cerebro_company_onboarding_preprod`, `cerebro_company_engine_state_preprod`, `cerebro_marketing_crm_bootstrap_run_preprod`, `cerebro_lrn001_continuation_preprod`.
- **10 claves externas** relacionadas con la cadena de empresa/onboarding, que también afectan el historial de registro, historial de onboarding, scan, postscan, bootstrap tier y final onboarding. No asumir que solo existen las 5 tablas inicialmente conocidas.
- **5 tablas centrales con RLS activado; 0 políticas `pg_policies` para esas tablas**. Las RPCs administrativas examinadas en CUT60 permiten `service_role`, no `anon` ni `authenticated`; no abrirlas a clientes ni a JARVIS.
- 0 filas de `fenix` en `registry`, `onboarding`, `engine_states`, `marketing_crm_run` y `lrn001_continuation`, verificadas otra vez en CUT61.
- El snapshot exacto de 17 funciones con flags de referencias, 10 FKs, 5 tablas/estado RLS, B3 y recuentos está en `cerebro/jarvis/boost-001/cut61-consumer-identity-observation-20261107.json`, commit `b70c58c26eb6aa13233f227b6a6a87a2d47c7304`.
- **Límite de alcance**: inventario de consumidores **SQL directos**, NO inventario exhaustivo de repositorios, frontend, clientes externos, Edge Functions ni plugins. GitHub Code Search del índice por defecto no devolvió coincidencias útiles para estas RPCs; eso no demuestra ausencia de consumidores en otras ramas/archivos. Falta la revisión completa de dependencias de App/CRM, pruebas y consumidores operativos.

### Dependencias contractuales imprescindibles

- `company_registry_preprod` → `company_onboarding_preprod`.
- `company_onboarding_preprod` → `company_engine_state_preprod`, `bootstrap_tier_run_preprod`, `marketing_crm_bootstrap_run_preprod`, `lrn001_continuation_preprod`, `final_onboarding_run_preprod`, `post_scan_audit_run_preprod`, `scan001_run_preprod` e historial de onboarding.
- El registro tiene además historial de registro dependiente de su `company_id`.
- **La función `cerebro_company_onboarding_start_preprod` genera 17 filas**, con 3 estados iniciales GREEN de scaffold **sin prueba de runtime físico**. Prohibido contarlas como 3 motores certificados para PROD o LRN-001.

## 2. Identidad B2/B3 · Estado REAL hoy

- PR [#25](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/25) sigue **OPEN / DRAFT / NO MERGED**, branch `cerebro/jarvis-b3-owner-auth-hardening-lab-v0-20261105`.
- Su evidencia histórica CUT34 documenta un **GET protegido Access Owner** del Worker original `cerebro-jarvis-lab-eu` con respuesta `ACCESS_OWNER_VERIFIED`; **no** inscribe dispositivos B2, concede B3 ni acredita Gateway PROD. CUT30 no modificado.
- **Consulta actual** en Supabase PROD, esquema `zeus_jarvis`: `b3_owner_grants` contiene **0 filas**; `b3_runtime_control` para `fenix`, `PROD`, `JARVIS-B3-001`: **enabled=false; kill_switch=true**. Su `updated_at` es 2026-11-03. No cambiar.
- `public.jarvis_zeus_identity_binding_v0` no figura en el catálogo de tablas consultado. Requiere inspección de esquema, permisos, ledger y prueba física antes de cualquier habilitación.
- **Intento de consulta actual** al endpoint GET de comprobación Owner del Worker original desde Opera conectada **redirigió a inicio de sesión Cloudflare**. No obtuvimos una nueva respuesta de autorización válida. No guardar ni incluir `login_challenge`, URLs con parámetros temporales, cabeceras o cookies. **No afirmar Owner Access actual**; la sesión del usuario debe autenticarse en el navegador de forma interactiva.
- Worker paralelo CUT32 permanece sin ruta pública y con protección Access por comprobar según estado PR25; no habilitar URL sin probar anónimo DENIED y owner ALLOWED. No se ha modificado Cloudflare, Access ni CUT30.

## 3. Backup y rollback · Diferenciar lo observado de lo probado

- `mcp__Supabase__get_project` confirmó proyecto destino `fenix-capital-prod` **ACTIVE_HEALTHY**, región `eu-west-2`, PostgreSQL 17; `list_branches` devolvió la entrada `main` únicamente.
- **No se dispone, a través de estas consultas administrativas, de un recibo verificable de backup físico ni de restauración en proyecto aislado**. El snapshot de catálogo exportado a GitHub **NO es backup de la base** y la lista de ramas **NO es evidencia de restauración**.
- **No ejecutar** `restore_project` en el proyecto PROD, no crear una rama con coste sin aceptación económica, no recurrir a `pg_dump` usando credenciales expuestas ni llamar RPCs de inserción.
- Para cerrar backup: identificar respaldo canónico con inventario de tablas y datos críticos, copia/snapshot verificable, destino de restauración independiente, ensayo de restauración completo y checksum/contratos OLD-vs-NEW, coste calculado y rollback real. Solo después planificar alta `fenix` con idempotencia y autorización gobernada.
- Rollback del trabajo actual CUT61: Git revert de archivos **solo LAB**; no existe rollback de cambios PROD porque no se modificó ni un registro.

## 4. Validaciones ejecutadas

- Código nuevo `cerebro/jarvis/boost-001/cut61-consumer-identity-restore-gate-v0.mjs`: inventario fail-closed de 17 funciones SQL, 10 FK, 5 tablas RLS y estado de identidad B3, con límites de atribución explicitados.
- Tests `cerebro/jarvis/boost-001/cut61-consumer-identity-restore-gate-v0.test.mjs`: incluye duplicidad, falta de consumidor, FK rota, políticas RLS nuevas, suplantación de empresa, falsedad de backup, simulación de grants B3, Edge Access falso y expiración de autoridad.
- GitHub Actions primer intento [#42389566721](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42389566721) **6/7**, falló por flag de `production_promotion` no incluido explícitamente en respuesta de bloqueo. Se corrigió añadiendo **`production_promotion:false`** en la salida de toda ruta bloqueada.
- GitHub Actions final [#42389664345](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42389664345) **SUCCESS, 7/7 PASS, 0 FAIL**.
- Artifact `jarvis-cut61-consumer-owner-restore-no-go-42389664345`, ID **13580527658**, ZIP digest SHA256 `801898989994da099143b505a185c49d67f5d5bb3b806aa0a6f670f74c7aa0d9`, retención hasta 7 dic 2026.
- Resultado `BLOCKED / NO_INDEPENDENT_PHYSICAL_ACCEPTANCE`: tests sintéticos de vetos, no certificación E2E. **Cero escrituras Supabase**, 0 cambios de permisos, 0 cambios App/CRM/ANA/Trading/SEO, 0 llamadas de pago DeepSeek, 0 servicios nuevos.

## 5. Estado y próximo bloque concreto

| Control | Estado |
| --- | --- |
| Inventario consumidores SQL del backend | HECHO: 17 funciones + 10 FK |
| Inventario completo consumidores App/CRM/Edge/plugins | PARCIAL: falta escaneo código/contratos íntegro |
| RLS núcleo | HECHO: 5 tablas con RLS; sin policies cliente |
| Backup real y restauración probada de destino | NO ACREDITADOS; no usar snapshot Git como respaldo |
| Owner Access sesión actual | BLOQUEADO: Cloudflare requiere login interactivo |
| B2 dispositivo real / revocación | NO ACREDITADO |
| B3 grants y kill switch | VERIFICADO: 0 grants; OFF / ON |
| CUT32 Access independiente verificado | PENDIENTE |
| Company Registry/Onboarding destino | SIN ALTAS, 0 filas |
| LRN-001 ingesta real | BLOQUEADO |
| JARVIS V2 completo PROD | NO-GO |

**CUT62:** priorizar inventario de consumidores App/CRM/Edge, verificar respaldos existentes sin coste y test físico de restauración aislada, finalizar login Owner Access y B2/B3 con dos dispositivos, después revisar coste, tribunal y gobernar inscripción `fenix`; no escribir hasta respaldo+rollback verificados. Mantener DeepSeek `PAUSED`.
