# CEREBRO OS · Verificación independiente de suspensión de staging · 14/11/2026

## Mandato del propietario
`staging.fenixcapital.es` queda SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE. No probar disponibilidad, navegar, publicar, escribir, iniciar, reactivar ni apuntar sistemas a producción para eludirlo. La reactivación requiere **nueva orden explícita** del propietario y gates de recuperación.

## Evidencia verificada mediante conectores con permiso de lectura
Proyecto Supabase PREPROD: `hnqlnvakzaywtafeiybt`. GitHub: PR #66, rama `cerebro/universal-control-plane-lab-v0-20261113`. Todas las comprobaciones de este documento son SOLO LECTURA; no se ejecutó petición HTTP a staging.

| Hallazgo | Evidencia | Interpretación |
|---|---|---|
| JOB-001/13 | `public.seo001_probe_wp_bridge_preprod()` devuelve `BLOCKED_DEPENDENCY`, sin `net.http_*` | Ruta concreta bloqueada |
| 3 RPC staging adicionales | `seo001_dispatch_page_quality_for_city_v2_preprod`, `seo001_dispatch_render_qa_preprod`, `seo001_wp_staging_http_preprod` contienen respuesta de suspensión y ya no contienen `net.http_*` | Rutas SQL directas/indirectas bloqueadas |
| Cron SQL de staging | `cron.job` IDs 61, 62, 65, 67, 68, 70 comprobados como `active=false` | Se preserva la configuración/schedule para recuperación |
| Cron SEO adicionales | IDs 2, 22, 23, 52, 53, 55, 56, 66, 69 comprobados como `active=false` | Pausa conservada; comprobar caso a caso antes de restaurar |
| Edge de staging | `fenix-seo-page-quality-preprod` v6; `fenix-seo-elementor-safe-writer-preprod` v9; `fenix-seo-infrastructure-autopilot-preprod` v5; `fenix-seo-sitewide-regression-preprod` v8; `fenix-web-content-ux-audit-v1-preprod` v6; `fenix-blog-visual-audit-preprod` v3 | El código vivo verificado devuelve `BLOCKED_DEPENDENCY/STAGING_SUSPENDED_BY_OWNER` sin realizar fetch |
| Otros endpoints | Se observan actualizaciones adicionales de numerosas Edge PREPROD relacionadas con staging. Su cobertura global y rollback aún NO están certificados | Estado global PARCIAL |
| Último registro WP-bridge | `seo_cerebro_wp_bridge_health_preprod` último `checked_at=2026-11-13 22:05:03 UTC`; ninguna fila nueva después de 2026-11-14 08:00 UTC en la consulta | No prueba por sí solo ausencia de todo tráfico, sí ausencia de nuevas escrituras en esa tabla |
| Cola sitewide | Última actualización observada 2026-11-14 08:03:13 UTC; cero actualizaciones desde 08:12 UTC en la consulta | Datos del sistema auditado, no prueba universal |
| JOB-001 telemetría | `public.cerebro_job001_telemetry_preprod` tenía cero filas | Runtime global NO VERIFICADO |
| Cloudflare | Zona `fenixcapital.es` Free; DNS A `staging.fenixcapital.es` con `proxied=false` | WAF Cloudflare NO protege ese hostname. No cambiar DNS sin análisis/orden |
| Opera LAB | Preview privado en `fenix-capital-preprod-gf6ks5x0r.vercel.app`, ruta `/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=motores` | Carga real en sesión propietario, Gateway LAB acreditó lectura. Ejecución autónoma de motores aún NO VERIFICADA |

## Bloqueos de promoción
1. No hay demostración de que **todos** los productores externos (Hostinger, WordPress, scripts, otros proveedores, Edge no inventariados) respeten la suspensión. No declarar `GLOBAL_STAGING_ISOLATED` hasta tener evidencia end-to-end y pruebas negativas.
2. La suspensión de staging no equivale a tener CEREBRO totalmente operativo. Operativa LAB observa FACT y algunos JOB-001; los 179 motores son definiciones, no 179 motores ejecutándose. Falta un ejecutor seguro general con contratos/permiso por operación, telemetría, auditoría, idempotencia, E2E, rollback, tribunal y eventual canary.
3. La página PREVIEW no acredita la instalación de JARVIS/Neuronal/Navegador/Mobile en el mismo Gateway. Sus SDKs son contratos.
4. Sin alteraciones a App/CRM PROD, WordPress PROD, DNS, Trading LAB, rama main ni contratos de pago. Coste adicional de suscripciones introducidas por esta verificación: 0 €. Consumo de infraestructura existente no medido.

## Siguientes validaciones exigibles
- Conciliar inventario completo de rutas con destino staging y cron externos, incluyendo consumidores indirectos y dependencias de Edge; comprobar que cada ruta que puede iniciar tráfico está cerrada sin contactar staging.
- Comparar snapshots originales y actuales, confirmar reversión disponible SIN ejecutarla durante la suspensión.
- Actualizar monitor de Operativa con estado LIVE de suspensión y prueba de cron/Edge, sin inventar verde.
- Conectar ejecutores reales de CEREBRO mediante Gateway y políticas específicas, inicialmente LAB, sin staging; probar rechazo por empresa/rol/entorno, durabilidad, resultados reales, coste y rollback.
- Mantener PR #66 DRAFT y promoción PROD bloqueada hasta evidencia completa.

## Semántica
`HECHO` = verificación física del alcance citado; `PARCIAL` = rutas fuera del alcance no verificadas; `BLOCKED_DEPENDENCY` = staging suspendido; `NO VERIFICADO` = no inferir ejecución de un estado histórico o test simulado.


## Ampliación aplicada y probada · endpoints adicionales

A raíz de la orden directa de suspensión se han **reemplazado exclusivamente tres Edge Functions PREPROD dedicadas a staging** por respuestas estáticas HTTP 423. Sus versiones originales se guardaron ANTES de reemplazarlas en `cerebro_lab_private.staging_edge_source_snapshot_v1` (schema privado, sin acceso a `anon`/`authenticated`, RLS habilitado):

| Función | Versión anterior → bloqueada | Snapshot |
|---|---|---|
| `fenix-seo-conversion-e2e-preprod` | v7 → v8 | 1 fichero exacto, checksum de bundle conservado |
| `fenix-cerebro-city-signer-preprod` | v5 → v6 | 1 fichero exacto, checksum de bundle conservado |
| `fenix-seo-coreguard-bootstrap-probe-preprod` | v2 → v3 | 1 fichero exacto, checksum de bundle conservado |

**Verificación posterior física de código desplegado**: las tres Edge son ACTIVE, responden con contrato `423/BLOCKED_DEPENDENCY/STAGING_SUSPENDED_BY_OWNER`, y su código vigente carece de `fetch`, `net.http_*`, URL de staging y escrituras `insert/update/delete`. No hay reactivación automática. `verify_jwt=false` se ha conservado exactamente como configuración anterior (no se han relajado controles existentes).

**Smoke remoto independiente sin credenciales:** PR #66 incorpora `staging-suspension/edge-423-remote-smoke.mjs` ejecutado en el workflow `CEREBRO Universal Gateway V0 LAB contract CI`. GitHub Actions run **43575968721 = SUCCESS** en commit `c4771e73c457d9308d625a3d93fddb910edaeb1c`. El smoke hace GET **solo a Supabase PREPROD**, NO a `staging.fenixcapital.es`, y exige respuesta 423, estado bloqueado y ausencia de ejecución.

**Rollback preparado, NO ejecutado:** el código original y `verify_jwt` de cada versión se encuentran en la tabla privada, recuperables únicamente bajo nueva orden explícita del propietario, pre-check de dependencias y tests. La reversión no significa autorizar el tráfico; mientras staging esté suspendido, mantener siempre el bloqueo.

**Limite de certificación:** existen numerosos consumidores históricos de WordPress y funciones de otros sistemas. Esta verificación asegura las rutas nombradas, pero no permite declarar el cierre integral de todas las rutas externas. La conexión de Operativa sigue LAB READ-ONLY + FACT dry-run; el ejecutor general human-by-exception no está certificado.


## JOB-001 · suspensión selectiva aplicada

**HECHO en Supabase PREPROD:** el Gateway heredado `cerebro-job001-gateway-preprod` v11 se auditó en lectura y contiene un control efectivo antes de despachar: si `cerebro_job001_control_preprod.enabled != true` devuelve `SKIPPED_DISABLED` y no invoca `cerebro_job001_dispatch_preprod`.

Con base en esa evidencia se guardaron las **15 filas completas originales** (`enabled=true`) en la tabla privada `cerebro_lab_private.staging_job001_control_snapshot_v1` (RLS ON, no grants anon/authenticated) y se aplicó una actualización **limitada** a empresa `FENIX_CAPITAL`, motor `SEO-001`, entorno `PREPROD`:

- **15 desactivados:** job IDs `5,7,8,9,10,11,13,14,15,16,18,20,21,22,23`. Todos se verificaron con `enabled=false`.
- **5 conservados activos (no acreditados como dependencias de staging):** job IDs `2,6,12,17,19`; siguen `enabled=true`. No se cambió su configuración ni sus programadores.
- **15 snapshots originales verificados**, con `prior_row.enabled=true`. Se conserva trazabilidad de los IDs y de sus parámetros anteriores.
- Sin modificar el código del Gateway JOB-001, Hostinger Master, App/CRM PROD, WordPress PROD, DNS ni main.

Esta suspensión **es doble**: bloqueo de las Edge y SQL específicas más el `SKIPPED_DISABLED` del Gateway para los 15 jobs seleccionados. **No hay equivalencia de aislamiento global**: faltan verificar otros consumidores externos y las posibles invocaciones directas que no pasen por el Gateway.

**Rollback documentado, NO EJECUTAR ahora:** tras nueva orden explícita y revisión de seguridad/contrato, restaurar cada `enabled` desde `cerebro_lab_private.staging_job001_control_snapshot_v1.prior_row` con comparación OLD vs NEW y pruebas de no regresión. No restaurar toda la tabla a ciegas ni antes de autorizar staging.


## V0.16 · Live Observation integrada en Operativa

**Misión:** continuar Operativa/CEREBRO sin levantar staging ni abrir un segundo Gateway. Esta intervención introduce una única capacidad determinista, acotada, con evidencia real y sin ejecutar motores externos.

### HECHO · Fuentes y entorno
1. Se creó `public.cerebro_universal_staging_status_lab_v0()` en Supabase PREPROD desde SQL GitOps `cerebro/universal/v0/staging-suspension/lab-live-observation-v0.sql`. SQL de solo lectura y sin tráfico hacia WordPress. La función es `SECURITY DEFINER`, `search_path=pg_catalog`, cero parámetros, sin SQL dinámico, y **EXECUTE solo para service_role**. Revocado para anon/authenticated; permisos comprobados mediante SQL.
2. Se creó la tabla de auditoría `public.cerebro_universal_staging_observation_lab_v0`, RLS activa, grants anon/authenticated revocados, inserción/consulta service_role exclusiva, `idempotency_key` UNIQUE y `executed_external_actions=false` obligatorio. **No se registró aún una fila vía UI**: `COUNT(*) = 0` en la lectura a 08:48 UTC del 14/11.
3. Se desplegó `cerebro-universal-staging-observe-lab-v0` **v1 ACTIVE**, Edge PREPROD con permiso solo para propietario mediante verificación server-to-server del contexto `CARLOS-ADMIN` existente. `GET` observa, `POST` inserta únicamente evidencia con control idempotente. No recibe URLs dinámicas, no publica y no tiene ruta de reactivación.
4. Se amplió **el Gateway Universal Preview existente** con `get_staging_suspension_live` y `capture_staging_suspension`, sin ampliar permisos de AION/CAPTACASA ni abrir PROD, sin alterar las operaciones FACT-001/JOB-001/voz.
5. Interfaz Operativa V3: panel **«Suspensión de staging · evidencia en vivo»**, botón `Actualizar estado real`, botón `Guardar evidencia LAB`, advertencia explícita **«Aislamiento global: NO CERTIFICADO»**.
6. **Consulta SQL real** (08:39 UTC): 15/15 JOB-001 pausados, 8/8 cron de staging inactivos, 4/4 SQL guardados, cinco de veinte controles generales JOB-001 aún activos y última fila del puente 2026-11-13T22:05:03Z. `known_controls_closed=true`, `global_isolation_verified=false`.
7. **CI real** GitHub Universal Gateway LAB [43577501403](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43577501403): **SUCCESS**, incluye tests con mocks del adapter y negative smoke remoto anon GET/POST del nuevo Edge, sin credenciales. Governed Main Integration [43577501378](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43577501378): SUCCESS.
8. **Preview Vercel real** `dpl_7HwbjupdTeDrebgsojHBtbZ22q6h`, `READY`, commit `d62632a8b901cc89e46c60465b2545ee50545a9b`, dirección inmutable `https://fenix-capital-preprod-2710i8ofb.vercel.app` (NO PROD). Alias estable del Preview conservado.
9. **Owner UI E2E de lectura acreditada**: sesión Opera en la pestaña existente 1381967780 con alias estable. El panel cargó el snapshot real 15/15 · 8/8 · 4/4, cinco activos de veinte, último puente 23:05 hora Madrid. No se visitó staging. El **POST de captura vía clic owner sigue SIN prueba física**, no atribuirle auditoría persistida hasta una fila real.

### Gates abiertos
- No hay certificado global de Hostinger, WordPress, otros ejecutores remotos y llamadas externas que puedan saltarse Supabase. DNS staging `proxied=false` impide aplicar WAF Cloudflare con cobertura total; no se cambió DNS.
- El nuevo sistema observa y guarda evidencia, **NO** ejecuta órdenes empresariales; todavía faltan executor por capacidad, POLICY/JDG, colas existentes verificadas, idempotencia de efectos, rollback de operaciones reales y pruebas old/new para pasar CEREBRO a autonomía.
- La captura owner autenticada del botón está implementada, pero NO se ha pulsado ni auditado E2E. El almacenamiento permanece vacío según consulta.
- PR #66 continúa **DRAFT**, sin fusionar. `app.fenixcapital.es`, CRM PROD, WordPress PROD, DNS, main y trading intactos. No se ha contratado suscripción nueva. El consumo exacto de infraestructura no se ha medido.

### Recuperación
- Reversión del código UI/Gateway: revertir los commits aislados de PR #66 o restaurar el Preview anterior; el despliegue original permanece inmutable.
- Edge y RPC son recursos nuevos y aislados; conservar evidencia y no borrar automáticamente. El alta de esta capacidad **no autoriza** reactivar staging ni alterar las 15 suspensiones.
- Cualquier corrección debe conservar esquema, permisos, RLS, ids de evidencia y la política de owner. Migración PROD prohibida hasta los gates correspondientes.


## V0.17 · Aceptación física owner: evidencia durable e idempotencia

**HECHO en la misma sesión Opera del propietario y en el Preview aislado de Vercel** (14-11-2026, 09:03:54 UTC, 10:03:54 Europe/Madrid). Usando temporalmente un marcador QA de URL, consumido antes del POST, el componente `CerebroStagingSuspensionLab` llamó al **Gateway Universal autenticado** `capture_staging_suspension` y a la Edge PREPROD de auditoría. El navegador mostró literalmente que la evidencia real se había registrado.

**Prueba física en SQL:** tabla `public.cerebro_universal_staging_observation_lab_v0`, 1 fila con `idempotency_key='lab-observe-owner-acceptance-20261114'`, `evidence_id='4250fbc1-f5b8-4df2-b37c-2ebc3e5659b8'`, `created_at='2026-11-14T09:03:54.120602Z'`, `executed_external_actions=false`, `prod_execution_enabled=false`, `additional_cost_eur=0`. Esta es una **escritura durable real de evidencia en LAB**, no una orden de negocio ni una operación de WordPress.

**Replay E2E:** se repitió la aceptación con la misma clave. Opera mostró **«Evidencia anterior recuperada por idempotencia»** con idéntico UUID. La consulta SQL siguió dando 1 fila y el mismo UUID y timestamp. Por tanto: **a lo sumo una escritura** para esa clave, con replay auditable, sin nuevas acciones externas.

**Hardening posterior:** commit `634d2a1c4b5c6024a30e96f9ae215f28fcdd9c40` retiró del componente React el disparador automático temporal por URL. Permanecen los controles normales `Actualizar estado real` y `Guardar evidencia LAB`. La fuente conserva el helper tipado opcional para QA; ya no hay ejecución automática asociada al marcador de aceptación. No se ha modificado PROD, ninguna ruta a staging, ni la configuración de jobs.

**No atribuir:** la ruta de botón manual `onClick` no se probó mediante un clic sintético real; se probó la misma función de captura desde el componente con sesión auténtica. No extrapolar esta primera escritura auditable a los 179 motores ni al resto de órdenes generales. La funcionalidad human-by-exception necesita inventario y certificados individuales.


## V0.19 · Estado completo visible y aceptación final del Preview

**HECHO y físicamente verificado:**
- La consulta live `public.cerebro_universal_staging_status_lab_v0()` fue ampliada, con SQL de solo lectura y esquema privado de snapshots, para observar **14/14 cron pausados** (IDs 22,23,52,53,55,56,61,62,65,66,67,68,69,70), **15/15 controles JOB-001 pausados** y **4/4 funciones SQL de red protegidas**.
- El mismo RPC devuelve `edge_backups.source_snapshots=94`, `edge_backups.sql_source_snapshots=3` y `edge_backups.live_versions_verified_in_this_rpc=false`. **Son copias de seguridad, NO certificación de tráfico Edge en directo.**
- La fuente también devuelve `durable_evidence.recorded=1` y el UUID `4250fbc1-f5b8-4df2-b37c-2ebc3e5659b8`; fecha `2026-11-14T09:03:54.120602Z`. El replay por clave dejó **exactamente una** fila.
- SQL v2 fuente GitOps: `cerebro/universal/v0/staging-suspension/lab-live-observation-v2.sql`. El Edge nuevo `cerebro-universal-staging-observe-lab-v0` fue actualizado exclusivamente en PREPROD a **v2 ACTIVE**; retorna observación de solo lectura y registro de evidencia owner-auth.
- El gateway, SDK de seis contratos y Operativa V3 fueron actualizados **únicamente en PR DRAFT #66**, sin modificar App/CRM PROD ni DNS.
- **CI de contratos** GitHub Actions [43579292131](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43579292131): `SUCCESS` en commit `06aacb4d7900b19dbd99ecab2d007a2dab46508c`. Governed Main Integration [43579292015](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43579292015): `SUCCESS`.
- **Preview inmutable Vercel `dpl_3EUtS3LkRWqgrBabXhXRfqGXFbUP` READY**, URL `https://fenix-capital-preprod-mmbfl12se.vercel.app`, commit `06aacb4d7900b19dbd99ecab2d007a2dab46508c`. Alias privado estable conservado, target preview (no PROD).
- **Owner E2E lectura en Opera**: en pestaña 1381967780, después de recargar desde el alias estable, aparecen en la UI: 15/15 JOB-001, **14/14 cron**, 4/4 SQL, **94 backups Edge y 3 SQL**, y **1 evidencia durable** con el UUID de aceptación. La advertencia `Aislamiento global: NO CERTIFICADO` sigue presente.
- El disparador QA de URL fue retirado del UI después de la aceptación física; ya no se activa por navegar. `Guardar evidencia LAB` permanece disponible bajo acción expresa del propietario.

**Gates restantes, sin ocultarlos:** la suspensión global de otras rutas externas (especialmente Hostinger y scripts no inventariados) sigue PARCIAL; el Gateway actual ejecuta una **capacidad determinista auditada** de LAB, pero **NO** un ejecutor universal de 179 motores. PR sigue DRAFT, sin canary/tribunal/rollback general ni autorización de promover a producción. Cero suscripciones nuevas; coste total de proveedor no medido.


## V0.20 · Auditoría de deriva 94/94 Edge

**HECHO (solo lectura, sin visitas a staging):** el inventario privado `cerebro_lab_private.staging_suspension_snapshot_v1` contiene **94 snapshots Edge originales**. Se compararon por `artifact_name` y `original_version` con el catálogo administrativo `list_edge_functions` de Supabase PREPROD (362 Edge en revisión previa), con resultado:

- **94/94 funciones localizadas** con el mismo nombre.
- **94/94 estado administrativo ACTIVE** (significa Edge desplegada, no que su carga original esté ejecutándose).
- **94/94 versión desplegada = versión original + 1**, sin versiones rezagadas, desaparecidas ni cambios adicionales tras el corte inventariado.
- Esta prueba acredita **integridad de inventario y ausencia de deriva de versión**; no sustituye a una prueba de tráfico negativo exhaustiva de cada ruta, ni acredita bloqueo de posibles accesos externos que no atraviesen las Edge.

Los tres endpoints adicionales bloqueados más tarde tienen snapshots separados en `cerebro_lab_private.staging_edge_source_snapshot_v1`; su prueba remota 423 e idempotencia se documentan arriba.

**Continuidad documental:** `STATE_2026-11-14.md` registra un corte histórico anterior a los tres bloqueos adicionales. Su declaración temporal «fenix-seo-conversion-e2e-preprod no modificado» está **SUPERADA**: versión v8 bloqueada, backup v7 disponible. Este runbook posterior es fuente vigente para el estado de ese endpoint. No reactivar staging.


## V0.21 · Auditoría completa de código vivo de las 94 funciones Edge

**HECHO · 14/11/2026 · Supabase PREPROD · SOLO LECTURA (sin visitar staging):**
- Se extrajo la lista exhaustiva de los **94 `artifact_name`** guardados previamente en `cerebro_lab_private.staging_suspension_snapshot_v1` con `artifact_type='SUPABASE_EDGE'`.
- Se inspeccionó el **código desplegado** de cada una mediante la administración Supabase `get_edge_function` en siete bloques disjuntos de índices 0–14, 15–29, 30–44, 45–59, 60–74, 75–89 y 90–93.
- **94/94** versiones actuales corresponden a la versión original respaldada **+1**; **94/94** contienen `STAGING_SUSPENDED_BY_OWNER` o `BLOCKED_DEPENDENCY`; **94/94** no contienen llamadas `fetch()` ni operaciones de escritura `.insert()`, `.update()`, `.delete()`, `.upsert()` en su código vigente.
- Dos cuerpos completos contrastados adicionalmente: `fenix-blog-card-image-size-fix-preprod` v3 y `fenix-seo-autonomos-runtime-repair-preprod` v4. Ambos son stubs de `Deno.serve` con HTTP 423, `BLOCKED_DEPENDENCY`, `STAGING_SUSPENDED_BY_OWNER`, `executed=false`, `side_effects=false`, sin HTTP saliente. Se conservan respaldos de las versiones previas.
- **Límite**: esta inspección completa certifica el código vivo de esas 94 funciones, **no** el código de otras Edge no incluidas ni el Hostinger maestro. El RPC de observación SQL continúa indicando `global_isolation_verified=false`; no cambiar ese campo por la auditoría de un subconjunto.

### Otras rutas activas revisadas
- El Gateway externo PREPROD `cerebro-job001-gateway-preprod` v11 contiene el control `enabled` antes del despacho. JOB-001/24 y JOB-001/25 están `enabled=false`; no son rutas a staging en su `target` actual.
- Hay 21 trabajos `pg_cron` activos **ajenos al conjunto staging pausado**; sus comandos no contienen un destino staging literal. Se inspeccionaron 15 funciones SQL sociales invocadas por sus cron; ninguna contiene la cadena staging.
- Rutas dinámicas sociales: 45 URL base activas de `cerebro_social_content_patterns_preprod` apuntan a `fenixcapital.es`. En `cerebro_social_queue_preprod`, los 89 `media_urls` inspeccionados apuntan a `fenixcapital.es` (65) y a Supabase PREPROD (24); los 78 `source_media_urls` apuntan a `fenixcapital.es`. No se envió ninguna petición HTTP para verificar disponibilidad de esos destinos.
- Los accesos dinámicos podrían cambiar en el futuro. Estos resultados son **fotografías de datos y código actuales**, no un bloqueo universal de red ni garantía de ausencia de redirecciones.
- En una ventana de dos horas el Gateway JOB-001 PREPROD registró 143 solicitudes HTTP 200, **sin identidad de origen certificada** ni prueba de finalización de trabajos. No atribuirlas a Hostinger como hecho.

**Decisión de conservación**: no se pausaron los 21 cron activos de otros motores, ni se alteraron WordPress PROD, redes sociales, DNS, App, CRM, otros tenants o los cinco JOB-001 no clasificados como dependientes de staging. Para cerrar al 100 % el control de origen hace falta auditoría física de Hostinger y sus jobs externos. No se autoriza reactivación.
