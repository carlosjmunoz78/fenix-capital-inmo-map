# CEREBRO OS · STATE-001 · Cierre de candidato universal (18/11/2026)

**ESTADO: PARCIAL · CONTRATO + LAB GREEN · NO PROMOVIDO A PROD.**

## Qué existe físicamente

- Rama: `cerebro/shared-state-all-interfaces-v0-20261118`, PR [#79 DRAFT](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/79).
- Aplicación: un proveedor compartido `CerebroSharedStateProvider` expone la misma información a JARVIS, OPERATIVA, NEURONAL, NAVEGADOR y V0, sin crear 5 feeds ni 2506 conectores. `api/cerebro-shared-state.ts` ofrece `mode=summary` y `mode=profiles`, con propietario verificado y paginación.
- Arquitectura: 2506 perfiles lógicos originales, `kind:id`, familias y relaciones `parent_id` intactas. **8 familias ≠ 8 departamentos de la empresa**. El catálogo no se ha movido.
- Cambios de estado: `ACTIVO, PERFECTO, PARCIAL, FALLANDO, DEFINIDO, POR_VERIFICAR`, más salud `DEGRADADO` de la fuente. Actualización frontend cada 30 segundos. Ningún especialista pasa a ACTIVO solo por pertenecer a un motor: requiere `profile_key` exacto y `profile_provenance=EXPLICIT_EXECUTOR_ATTESTATION` en la fuente autenticada. Un resultado `success` sin Tribunal+pruebas+rollback no equivale a PERFECTO.
- **No se han añadido nuevos Workers, D1, funciones, suscripciones ni bases de datos.** El proveedor reutiliza el runtime y la actividad actual; el Gateway owner-only original no se ha editado.

## Pruebas

- GitHub Actions [44329932584](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44329932584) SUCCESS en rama: compilación, regresión OLD vs NEW, contrato 2506 y seguridad. Pruebas posteriores de perfil explícito y calidad `PERFECTO` también han pasado en Actions.
- Último despliegue **privado y aislado** `dpl_GmS5Z9FtPBxpVk8hrPFXg7FEhRHL` READY, URL `https://fenix-capital-preprod-a25o9g4yb.vercel.app`, SHA código `5d01a2bebf16900ba0e133bd0fa5660cd1857cc6`, **cero aliases**. La rama posterior solo añade controles GitHub y documentación.
- [Stage 44329932532](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44329932532): 401 sin autenticar, 400 otra empresa, 405 POST, 403 cuenta técnica. **PASS** los cuatro.
- **BLOQUEO OWNER:** mismo stage da 403 al `CEREBRO_E2E_USER_JWT`. [Diagnóstico real 44330328085](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44330328085) confirma mediante su campo `exp` que el JWT guardado caducó y Supabase Auth devuelve rechazo 403. No se ha leído ni impreso su contenido. La cuenta técnica `cerebro-e2e@fenixcapital.es` sí genera JWT nuevos automáticamente pero **no tiene derecho de propietario**; nunca sustituirla por la cuenta owner.
- Alias `app.fenixcapital.es` permanece en `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e` (controlado tras el stage), ninguna promoción ni DNS.

## Qué falta, sin rehacer

1. Renovar de modo seguro el secreto de prueba *propietario* `CEREBRO_E2E_USER_JWT` (no cambiar duración JWT global). Hasta entonces el gate owner no pasa. Una futura solución estructural puede usar un comprobador owner de lectura con identidad de ejecución de privilegios mínimos, sujeto a seguridad.
2. Repetir E2E positive owner contra deployment exacto privado, comprobando `mode=summary`, `mode=profiles`, `total_profiles=2506`, padres/familias intactos. Workflow de verificación fijado a `a25o9g4yb`: `.github/workflows/cerebro-shared-state-verify-pinned-stage.yml`.
3. Verificar la salud funcional de CRM, dependencias, recuperación y todos los checks de PR #79. **No promover** antes de todo VERDE.
4. Adaptar una vez por fuente/runtime la emisión de `profile_key` + eventos verificables; **no** editar manualmente 2506 fichas. Hoy la actividad de GitHub entrega `engine_id` y actividad, pero generalmente no `profile_key`. Por tanto la mayor parte sigue `POR_VERIFICAR` y nunca debe fabricarse actividad.
5. Registrar la semántica `PERFECTO` solo cuando Tribunal GREEN, tests y rollback estén acreditados por el mismo evento del ejecutor. Sin ello `PARCIAL`.

## Rollback

PROD sigue intacta, por tanto no se necesita rollback. En cualquier promoción futura, baseline `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e` reservado. El fallback local mantiene la lectura antigua `/api/cerebro-agent-directory`, el feed `cerebro-console-activity-v0` permanece sin cambios. Reasignar alias únicamente con comprobaciones físicas y consentimiento de la política de CEREBRO.

**Coste adicional de suscripciones: 0 €; uso ordinario de despliegues Vercel existente.**

## Verificación de candidato actualizado · 18/11/2026

- QA con **32 departamentos SEO + 48 Productora**, y 618 adscripciones explícitas: [GitHub run 44339765015](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44339765015) SUCCESS y [run 44340332674](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44340332674) SUCCESS.
- Candidato de **código exacto 06e5893d...** READY, protegido y aislado: Vercel `dpl_5qs5BwJt1FAExuPgJe6z5KBzaUqw`, URL `https://fenix-capital-preprod-kimtw29gj.vercel.app`, **0 aliases**, no PROD. [Stage run 44340332713](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44340332713): acceso anónimo 401, tenant externo 400, POST 405 y cuenta técnica 403: PASS. **Owner +403 por JWT caducado, NO-GO de promoción**.
- El workflow `cerebro-shared-state-verify-pinned-stage.yml` se fija a este candidato y queda en `workflow_dispatch` explícito para que no se repitan pruebas que dependen de una credencial humana caducada y consuman créditos inútilmente. Cuando el secreto owner se refresque, ejecutar el workflow y verificar sus resultados antes de promover.
- GitHub Enterprise load 50-job aislada se recuperó satisfactoriamente por reintento del job fallido, sin tocar la prueba ni el runtime.
- **Ningún cambio en `app.fenixcapital.es`, CRM, DNS, Supabase Auth, main, PR #76/#77 ni servicios de pago.** El alias PROD permanece `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e` y el anterior despliegue `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` sigue registrado como alternativa de restauración.

## Solución de renovación de pruebas CI: sin JWT del propietario (18/11/2026)

La App sigue renovando el JWT del propietario mediante Supabase Auth en el navegador. La tarea CI **no tiene derecho de propietario** y por seguridad no puede generar ese token.

Para eliminar la caducidad del secreto `CEREBRO_E2E_USER_JWT` de este bloque, la verificación automática ahora:
- inicia sesión en Supabase Auth en cada ejecución como `cerebro-e2e@fenixcapital.es`, mediante el secreto `CEREBRO_E2E_TEST_PASSWORD` existente;
- usa el JWT efímero únicamente en la URL de deployment aislado, para `mode=ci_summary`, con verificación administrativa del UUID técnico, correo confirmado y host exacto;
- recibe solo totales del registro y departamentos por fuente, nunca detalles de perfiles, datos de App/CRM ni estados de runtime propietario;
- comprueba que todos los demás endpoints y `mode=profiles` siguen vetados a esa cuenta;
- destruye sesión al terminar el workflow. **No almacena refresh token** ni reescribe secretos GitHub.

Esto resuelve la necesidad de renovar el token *de estas pruebas* por ejecución, sin hacer a la cuenta técnica propietaria. **No equivale a certificar E2E real del propietario.** La autorización de la App permanece idéntica.

## 18/11/2026 · Conexión universal de motores canónicos

La conexión de perfiles ya estaba publicada físicamente en App PROD como `dpl_CdRZireU6DbA3aas6NteKBchfLob` y se verificó con sesión real de Opera en JARVIS/OPERATIVA/NEURONAL/NAVEGADOR. La cuenta técnica obtiene JWT nuevo por ejecución: [44344057653](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44344057653) SUCCESS y no tiene facultades owner.

Ahora `STATE-001` añade proyección determinista de los **179 IDs del catálogo canónico de motores** a partir de las ejecuciones GitHub que emiten `engine_id` exacto, con sus evidencias. No confundir ejecuciones de workflow con motor autónomo íntegramente sano. `engine_activity.runtime_health_verified=0` hasta verificar contratos funcionales, logs y observabilidad por proveedor. La comparación de perfiles exige `profile_key` firmado/atestiguado y no se deduce de `engine_id`. El ID legítimo `3RD-001` se conserva y acepta sin modificar el registro.

**Límite físico:** muchos motores de Cloudflare y Supabase no publican datos de ejecución en esta única fuente GitHub. Su actividad no se debe inferir ni clasificar como perfecta. Integración física por proveedor pendiente en el canal de ejecución correspondiente. El contrato está centralizado, de modo que esa integración será por fuente, no por cada perfil.

## Promoción UI de lectura verificada, 18 de noviembre de 2026

**HECHO · Producción:** alias `app.fenixcapital.es` asignado y verificado físicamente a Vercel `dpl_8bt9hwnbZGtxZDZ11XbKNvBVvcaJ` (SHA código `603f72149ef84c74805320ff966e0cc11c2ca52c`). Restauración inmediata disponible mediante `dpl_CdRZireU6DbA3aas6NteKBchfLob` (sin realizarla).

**HECHO · CI:** [QA de motores/perfiles](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44347849535) SUCCESS; [Vercel STAGE aislado + token renovado automáticamente + negativos de seguridad](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44347849539) SUCCESS. Sin JWT owner en este circuito de CI, sin modificar Auth del propietario, sin persistir refresh token.

**HECHO · Prueba visual real en Opera autenticado:** OPERATIVA presenta ESTADO COMPARTIDO, `2506` perfiles, `82` departamentos con ID de fuente, `179` motores canónicos en inventario y fuente de actividad ACTIVO. En esa observación **0 motores con ejecución GitHub reciente identificada**, **0 perfiles con ejecución individual acreditada** y **2477 por verificar** (29 plantillas). Esto NO significa que los motores reales estén detenidos; significa que la fuente no ofrece todavía esa prueba.

**PARCIAL · Conexión física total:** la consola tiene contrato, sincronización y registro compartidos, pero los motores/agents/subagents que no emiten `profile_key` y eventos firmados siguen sin evidencia de estado. El feeder integrado actualmente inspecciona la actividad GitHub; **Cloudflare, Supabase y otros proveedores todavía no están instrumentados en esa misma fuente por perfil**. Añadir adaptadores por proveedor/runtime (una vez por origen, no 2506 conexiones).

**PARCIAL · JWT owner histórico:** `CEREBRO_E2E_USER_JWT` permanece caducado en flujos heredados; no se ha renovado ni sustituido ese secreto. La nueva validación CI utiliza `cerebro-e2e@fenixcapital.es` con JWT renovado por ejecución para lectura mínima en STAGE, **nunca se hace pasar por CARLOS-ADMIN**.

**MODO DE PROMOCIÓN:** UI lectura, sin habilitar autonomía, sin mutar permisos App/CRM/Auth ni DNS. El PR #79 continúa DRAFT; el despliegue promovido corresponde al SHA probado, no al commit posterior de documentación.

## STATE-001 · Conexión de inventarios a la interfaz (18/11/2026)

- Cloudflare 45 Workers y Supabase 119 funciones verificados físicamente por conectores autorizados. Se creó la rama separada `cerebro/state001-provider-feed-20261118` con el archivo **sanitizado**, sin nombres, credenciales, logs ni clientes: `cerebro/state001/provider-discovery.v1.json`.
- **HECHO:** actualizador `cerebro/state001/cloudflare-provider-refresh.mjs` usa `CEREBRO_CLOUDFLARE_API_TOKEN` secreto GitHub ya contratado, Cloudflare **GET exclusivamente**, y GitHub contents PUT únicamente a la rama de datos. [Acción real 44352091405](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44352091405) SUCCESS; segundos después verificó 45 Workers, 42 con indicación LAB en el nombre, un solo motor canónico enlazado nominalmente (`FACT-001`, 6 Workers + 18 funciones Supabase como candidato, nunca como prueba de ejecución).
- **PARCIAL:** programación horaria aún no habilitada porque GitHub ejecuta `schedule` solo desde la rama por defecto; PR [#80](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/80) aislada sobre `main`, solo 2 archivos, requiere todos sus checks verdes para fusionar sin tocar la App.
- `api/cerebro-shared-state.ts` ahora obtiene el feed desde GitHub RAW en cada ventana corta de caché, valida esquemas y frescura independientes (Cloudflare 2h, Supabase 2h), devuelve `provider_inventory` como inventario *solo de despliegues*, nunca como identidad de perfil ni calidad del motor. Si una fuente no responde, marca no disponible sin cambiar los 2.506 perfiles.
- **PENDIENTE:** Supabase Management PAT para actualizar automáticamente la metadata Edge Functions desde GitHub; el conector sí la verifica directamente, pero no existe un secreto PAT autorizado en los nombres de GitHub inspeccionados. No se copian ni revelan credenciales. Los motores que no publican `profile_key` individual siguen sin acreditación de ejecución.
