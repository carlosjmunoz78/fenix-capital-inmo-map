# CEREBRO OS · JARVIS V2 · CUT63 · Identidad de Edge + backup físico Supabase PROD

**Fecha:** 2026-11-07 · **Company ID:** `fenix` · **Engine ID:** `JARVIS` · **Environment:** `LAB` · **Version:** `CUT63-v0.1`.
**Repositorio:** `carlosjmunoz78/fenix-capital-inmo-map`, rama aislada `cerebro/jarvis-deepseek-weekend-lab-20261106`.
**Objetivo definitivo:** JARVIS V2 en PROD con identidad Owner E2E, voz, Gateway, aprendizaje y Factory integrados, **sin tocar App/CRM reales prematuramente**.
**Estado:** HECHO verificación de backup existente en UI + 60 fuentes Edge desplegadas inspeccionadas estáticamente + QA; BLOQUEADO restauración real y Owner B2/B3; **NO-GO PROD**.

## HECHO · Backup real visualizado en el proyecto correcto

- `mcp__Supabase__get_organization` indicó que la organización `fkxsrctlzcddwbivmypl` que contiene `fenix-capital-prod` usa el **plan Pro**. No se contrató ni amplió nada.
- Se accedió mediante Opera autenticado a `https://supabase.com/dashboard/project/cluhljgonannaafpmblx/database/backups/scheduled`.
- La pantalla administrativa **Database Backups** lista copias de tipo **PHYSICAL** con entradas entre 31 de octubre y 7 de noviembre de 2026, inclusive. La más reciente visible es **2026-11-07 02:59:58 UTC**. Registro completo en `cerebro/jarvis/boost-001/cut63-prod-backup-ui-observation-20261107.json` (commit `04e6481a58b351f15a7f4894f0e0f9c81a3e65a0`).
- Documentación oficial Supabase (consultada 2026-11-07): los proyectos Pro cuentan con backups diarios hasta 7 días; ruta Database > Backups. Fuente: `https://supabase.com/docs/guides/platform/backups`.
- **Criterio exacto**: pantalla y fechas de entradas = evidencia de que existen backups mostrados; **NO evidencia del resultado final detallado de cada backup, de su contenido ni de una restauración realizada y comprobada**.
- **No se pulsó Restore** ni `Restore to new project`, no se descargaron bytes, no se creó un nuevo proyecto, no se activó PITR ni se utilizó una API de pago. Mantener 0€ adicional.
- **Supabase Storage:** los objetos físicos externos no están incluidos en los backups de base de datos; hay que inventariar también los documentos Storage como dependencia del rollback.
- Ya existe en CUT62 una prueba real de `pg_dump/pg_restore` de 3 filas **SINTÉTICAS** en GitHub Actions PostgreSQL 17, que certifica el mecanismo de laboratorio, **no** la recuperación de `fenix-capital-prod`.
- Para dar por verde el backup real: validar cada respaldo (fecha/estado/verificación), inventario crítico DB+Storage, destino independiente aprobado para restauración, costes evaluados, restore completado, checksums/regresión OLD-vs-NEW, plan probado de rollback. **No restaurar en el proyecto PROD**.

## HECHO · Auditoría estática de TODAS las Edge Functions con `verify_jwt=false`

Lecturas físicas con `mcp__Supabase__list_edge_functions` y `get_edge_function`, solo metadatos y código de funciones desplegadas, no llamadas de ejecución:
- **95** Edge Functions con estado administrativo `ACTIVE` al corte: **35 `verify_jwt=true`**, **60 `verify_jwt=false`**.
- Se leyó el código de las **60/60 funciones sin verificación JWT integrada**, agrupadas en cinco lotes de 12, A–E; no se exportó el código, cookies, secretos, credenciales ni datos personales.
- Se analizó evidencia textual: presencia de cabecera Authorization, Bearer, `auth.getUser/getClaims`, operaciones criptográficas/HMAC, referencias a variables de entorno server-only, ámbitos de owner/company, RPC, service-role y firmas de webhook. Son **marcadores estructurales**, no pruebas de autorización efectiva.
- Conteos estáticos: **37/60** contienen referencia a Authorization, **35/60** a operaciones criptográficas, **42/60** a `Deno.env.get`. Las categorías no son excluyentes. **23/60** no contienen una referencia textual directa a `Authorization`; eso tampoco demuestra vulnerabilidad.
- **13/60** no contienen ninguno de los indicadores de autenticación evaluados; deben clasificarse por ruta y por operación, no etiquetarse como vulnerables automáticamente. Ejemplo: `cerebro-internal-auth-probe-v0` responde mediante una función estática con HTTP 404 y `cerebro-gateway-prod-governed-write-canary-v1` es un canary GET/410, sin mutaciones en el código desplegado inspeccionado. Estas observaciones no validan una defensa completa.
- Las variantes `...canary`, `...once`, `...voice-ui` pueden ser interfaces públicas deliberadas o stubs; hay que contrastar protección en Gateway, cabeceras, HMAC, rate limit, identidad, grants, auditoría, origen, revocación y autorización por recurso en E2E; **JWT OFF no implica automáticamente acceso abierto**.
- Se preservaron cinco instantáneas **sin fuente** en:
  - `cerebro/jarvis/boost-001/cut63-deployed-auth-batch-a-20261107.json`
  - `cerebro/jarvis/boost-001/cut63-deployed-auth-batch-b-20261107.json`
  - `cerebro/jarvis/boost-001/cut63-deployed-auth-batch-c-20261107.json`
  - `cerebro/jarvis/boost-001/cut63-deployed-auth-batch-d-20261107.json`
  - `cerebro/jarvis/boost-001/cut63-deployed-auth-batch-e-20261107.json`
- Inventario congelado de **95 despliegues**, versión, `ezbr_sha256` y `verify_jwt`, sin claves ni contenido: `cerebro/jarvis/boost-001/cut63-edge-listing-20261107.json`, commit `44817d4d7b0fbd647fbb81f2f1d8d596ed6de5ee`.

## HECHO · Gate consolidado determinista + prueba en GitHub

- Motor `cerebro/jarvis/boost-001/cut63-edge-auth-backup-admission-v0.mjs`: exige cobertura exacta de los 60 despliegues JWT-off, unicidad, coincidencia de versiones, 95 inventario, 5 snapshots de 12, flags booleanos sin fuente ni secretos, y fechas de backup Pro.
- Tests `cerebro/jarvis/boost-001/cut63-edge-auth-backup-admission-v0.test.mjs`: falsificación de fuentes, duplicados, cambios de proyecto, recuento, etiquetas, evidencia de restauración fingida, escalado de autoridad y permisos PROD.
- Primer run [#42392707683](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42392707683) FALLÓ por normalización de letra A–E del nombre del lote, no por vulnerabilidad real. Se corrigió el verificador manteniendo aserciones estrictas.
- Run final [#42392781259](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42392781259) **SUCCESS, 7/7 tests PASS, 0 FAIL**. Resumen ejecutado: 95 despliegues, 60 fuentes, 8 entradas de backup reales, 13 sin señales estáticas examinadas, `verdict=NO_GO`, `prod_write_authorized=false`.
- Artifact GitHub: `jarvis-cut63-edge-auth-backup-admission-42392781259`, ID **13581214794**, ZIP SHA256 `d3d643f51677bb620cf34aa377234c8002d82af842450bf349147a1c6b10eeaf`, retención 30 días.
- **No** se hizo petición HTTP física anónima contra rutas de negocio ni test autenticado Owner/otro usuario, y por tanto no se acredita `403/401` funcional, HMAC correcto, B2/B3 ni denegación de acceso indebido. No se ha declarado ningún endpoint inseguro sin pruebas.

## Estado físico final confirmado en Supabase PROD

`SELECT` de solo lectura sobre `cluhljgonannaafpmblx`:
- `fenix` `public.cerebro_company_registry_preprod`: **0 filas**.
- `fenix` onboarding: **0**; estados de motor: **0**; recibos Marketing/CRM: **0**; recibos LRN: **0**.
- `zeus_jarvis.b3_owner_grants`: **0 concesiones**.
- `zeus_jarvis.b3_runtime_control` (fenix, PROD, JARVIS-B3-001): **enabled=false, kill_switch=true**.
- El Worker original Cloudflare CUT30 y el paralelo CUT32 no se han modificado. Cloudflare Owner Access exige reautenticación en Opera para las pruebas físicas restantes. No enviar credenciales/códigos al chat.
- DeepSeek permanece **PAUSED** pendiente de conciliación de gasto; 0 llamadas pagadas en CUT63.

## Estado de aprobación

| Bloque | Estado | Autorización |
| --- | --- | --- |
| Inventario de 95 Edge Functions | HECHO · lectura viva | Solo auditoría |
| Lectura estática de 60/60 JWT OFF | HECHO | No certifica auth ni abre permisos |
| Ocho entradas de backup físico en UI Pro | HECHO · existencia visible | No prueba restauración |
| PostgreSQL restore aislado sintético CUT62 | HECHO | No equivale a PROD restore |
| Backup real probado sobre réplica aislada | BLOQUEADO | Restituir solo con proyecto/coste aprobados |
| Tests negativos auth/owner de funciones sensibles | PENDIENTE | Gate E2E en entorno no productivo seguro |
| B2 por dispositivo + B3 mínimo owner | BLOQUEADO | Falta reautenticación Cloudflare y permisos gobernados |
| Company Registry `fenix` y 17 motores backend destino | NO HECHO | No crear datos fingidos |
| LRN-001 + Gateway + Voice/JARVIS PROD | NO-GO | Requiere evaluación, tribunal, backup y rollback reales |

## Siguiente bloque acotado: CUT64

1. **Autenticación física:** tras login interactivo Owner Access en el navegador del propietario, verificar una denegación anónima y propietario permitido sobre el Worker *paralelo* CUT32 antes de habilitar ruta, sin tocar CUT30; completar B2 dos dispositivos y revocación, B3 `MISSION_INSPECT` mínimo, GET de misión real LAB con auditable OLD/NEW.
2. **Endpoints críticos:** auditar los marcadores y controles negativos de los 13 casos sin señales directas, en particular cualquier ruta ejecutable o que escriba, y probar desde cliente sin credenciales antes de conceder permiso. No falsear una aprobación con coincidencias textuales.
3. **Backup:** identificar opción existente Pro para preservar respaldo verificable y restaurarlo en instancia aislada sin tocar PROD. La duplicación de proyectos de Supabase puede tener coste adicional; consultar precio y exigir aprobación de cualquier coste antes de ejecutarla. La restauración directa del proyecto actual genera indisponibilidad y reemplaza datos: **PROHIBIDA** para este ensayo.
4. **Control de cambio:** solo después de certificar identidad, restore, consumidores App/CRM/Edge, compatibilidad y evidencias de negocio de 17 motores, planificar alta gobernada de `fenix`, LRN-001, Gateway/voice y despliegue gradual PROD.

**Hecho sin modificar App, CRM, base de datos, DNS, WordPress, Trading, Cloudflare Access, CUT30, main ni el Worker aislado; coste adicional contratado 0€.**
