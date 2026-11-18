# CEREBRO OS · OPERATIVA P0 · Estado comprobado · 18/11/2026

**ESTADO: PARCIAL / PRODUCCIÓN INTACTA.** Objetivo original: fuentes reales en OPERATIVA y al menos otra interfaz con misma fuente, sin inventar 2506 agentes activos.

## Hecho físicamente
- Fuente canónica original leída completa en la rama `cerebro/operativa-runtime-p0-handoff-20261118`.
- PR #78 DRAFT: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/78.
- Commit principal `9f60f44fe6bf728f8cd93c62ad49cdd21f37815b`; fallback preparado `379459b8f26bfb32c926382328f783ef72a88204`; pruebas específicas y de seguridad añadidas `184e5ad6bdcb7291660ea96847f95cbf0f96e7ee`.
- Directorio API/cliente/interfaz implementado en candidato: comparte `cerebro-console-activity-v0`, que JARVIS y NEURONAL usan mediante `src/cerebroActivityApi.ts`. Solo lectura, owner-only, no mapea engine_id a perfil sin identidad exacta; fuente caducada/503 => DEGRADED.
- Feed real recuperado: GitHub workflow `44272965727` SUCCESS, snapshot `generated_at=2026-11-18T09:07:47.055Z`. Nuevas ejecuciones de actualización sucesivas `44273078958`, `44273810570`, `44274151505` SUCCESS (lecturas puntuales, no SLA certificado).
- Preparado fallback público por API GitHub (sin token adicional), **solo como código candidato, NO desplegado en Supabase**. Versión Supabase PROD sigue 7. El original se preserva como `cerebro/universal/v0/supabase-activity/backup/cerebro-console-activity-v7-index.ts`.
- Confirmación física de UI actual `https://app.fenixcapital.es` desde navegador Opera: directorio 2506 perfiles, NEURONAL consultando el feed con dos runs visibles in_progress en la lectura, JARVIS abierto. Eso verifica interfaces existentes, **no la UI candidata**, ni vínculo perfil↔ejecutor.
- Vercel preview privado `dpl_HosSkpwg9czo4jQ5QEB6suSmNB5Q` READY, SHA exacto `184e5ad6bdcb7291660ea96847f95cbf0f96e7ee`, sin alias a app.fenixcapital.es. En preview, API sin bearer denegó con 401 `OWNER_SESSION_REQUIRED`. El acceso positivo protegido requiere prueba E2E adicional.
- Fuente Cloudflare: 45 Workers. Supabase: 118 Edge Functions ACTIVE en lectura posterior (en traspaso inicial figuraban 117). No son 163 agentes. Ver mapa de evidencia `cerebro/registry/operativa-runtime-evidence-20261118.v1.json`.
- Dos Engine IDs vinculados físicamente a Worker por Cloudflare settings: `SOC-FB-FINANCIAL-REAL-ESTATE-V1` → `cerebro-facebook-autoqual-lab`, `SOC-IG-FINANCIAL-REAL-ESTATE-V1` → `cerebro-instagram-autoqual-lab`; ambos LAB OFF, sin cron, sin vínculo certificado con un rol individual.

## QA / incidencias
- CI específica `44274069634` (API/cliente/identidad/degradación) SUCCESS; `44274069643` (fallback + auth policy) SUCCESS en SHA `184e5ad6...`.
- Vercel exact SHA del candidato READY, no promocionado.
- Enterprise Acceleration `44274079044`: primer intento FAIL en test PREPROD no relacionado `prod-max-load-matrix-v1.test.mjs` por `47 !== 50`, del total 2698 pruebas; 2687 PASSED, 1 FAIL, 10 skipped. Un reintento dirigido del job fallido fue solicitado; **consultar resultado antes de cualquier decisión**. No relajar la prueba.
- Logs Supabase posteriores al nuevo snapshot desde 09:07:47Z mostraron 34 GET 200 y 6 GET 503; últimos 503 a las 09:09:43Z. El feed recupera servicio, pero causa de todos los 503 históricos no queda acreditada. No atribuir indiscriminadamente todo a TTL.
- El despliegue privado requiere login independiente y no se verificó la ruta 200 como propietario; Vercel share-link no permitió bypass de autenticación. No conceder permisos ni desactivar auth.

## Estado de gates
`PROFILE_COUNT=2506`; `RUNTIME_DISCOVERED_BY_PROVIDER=Cloudflare 45/Supabase 118/GitHub observable`;
`LINKED_VERIFIED_PROFILE_COUNT=0`; `ACTIVE_CONFIRMED_PROFILES=0`; `DEGRADED_CONFIRMED=feed 503 histórico / fallback no desplegado`;
`UNLINKED=2506`; `FEED_FRESHNESS=RECOVERED_POINT_IN_TIME`;
`SHARED_GATEWAY=COMMON_ACTIVITY_SOURCE_CODE_PROVEN; LIVE_CANDIDATE_CROSS_INTERFACE_NOT_PROVEN`;
`PROD_DEPLOYMENT=dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h`;
`ROLLBACK_READY=BASELINE_IDENTIFIED_NOT_PHYSICALLY_RETESTED`;
`ADDITIONAL_SPEND=0_EUR_NEW_SUBSCRIPTIONS`.

## Siguiente bloque único
1. Revisar final de reintento CI `44274079044` y la exactitud de pruebas del SHA.
2. Verificar el candidato owner positivo y dos interfaces autenticadas sobre la misma evidencia. Conservar App/CRM actuales.
3. No promover a PROD hasta green en CI, pruebas físicas Auth/tenant, OLD vs NEW y rollback. No fusionar #76/#77 ni cambiar DNS/Auth.
4. Si gates pasan, promoción controlada solo del SHA probado y smoke propietario/anon/CRM, publicación documentada. Si no, conservar producción y registrar LOW_CONFIDENCE solo ante incertidumbre de seguridad real.

No se han creado nuevas cuotas, Workers, D1 ni funciones Edge. Ninguna ejecución se atribuye a los 2506 perfiles por nombre.

## Actualización física posterior · Activity Function V8

**HECHO EN SUPABASE PROD, ALCANCE SOLO FUNCION DE ACTIVIDAD:**
- Desplegada `cerebro-console-activity-v0` **v8**, misma función, mismo `function_id=f4417ef4-3ff2-41f0-84e9-ddf6d38abdea`, `verify_jwt=true`, `status=ACTIVE`.
- SHA de artefacto Supabase v8: `08c33889f71df9374400fb07d27a0f9d05fd7518a078dddc99a196226129a012`. Source code: PR #78, `cerebro/universal/v0/supabase-activity/index.ts` + `public-github-fallback.mjs`.
- Código v7 verificado byte a byte antes de desplegar; rollback exacto documentado en `cerebro/universal/v0/supabase-activity/backup/cerebro-console-activity-v7-index.ts` (SHA de artefacto original `72c99c22bafa4e0a6a26057dbd87145f7a9bc8eb4b4f8ee1ab92744c52f30410`). **Rollback restaurable por despliegue, no se ha ejecutado un rollback real**.
- Incidencia reproducida: snapshot GitHub generado `2026-11-18T09:15:27.429Z` aún obsoleto al iniciar v8; últimos siete GET 503 de v7 entre 09:35:27Z y 09:36:19Z.
- Tras v8: nueve GET HTTP 200 y una petición sin credenciales HTTP 401 hasta 09:38:19Z (logs de `function_edge_logs` filtrados por versión 8). Fuente UI NEURONAL vuelve a `CACHED` desde `UNAVAILABLE`. Este resultado demuestra recuperación puntual, todavía no SLA estable de días.
- UI anónima Opera al endpoint Edge devuelve `UNAUTHORIZED_NO_AUTH_HEADER`; conserva aislamiento. App/CRM/Auth/DNS no modificados.
- El feed publisher programado continúa existente, sin cambiar workflow ni permisos; el fallback solo entra si snapshot falla o caduca. Se requieren más observaciones para identificar todos los 503 históricos.

**Estado App OPERATIVA**: PR #78 y preview Vercel siguen sin promoción. CI Enterprise Acceleration `44274079044` terminó **SUCCESS en run_attempt=2** tras fallo intermitente de carga 47/50 en el primer intento; no se ha debilitado la suite. El preview requiere prueba positiva de autenticación owner (Opera preview mostraba formulario de login independiente), reconciliación OLD vs NEW física y rollback de App probado. Por tanto `OPERATIVA_END_TO_END_PROD=PARCIAL`, no completo.

**PROD alias intacto**: comprobación Vercel `get_alias(app.fenixcapital.es)` → `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` SHA `7163dccd962a19fbd5301b14fcacacf08b7245ea`, no preview `dpl_HosSkpwg9czo4jQ5QEB6suSmNB5Q`.

**NEXT BLOCK:** prueba owner positiva sobre el preview protegido, smoke de dos interfaces sobre mismo origen, recuperación probada y promoción exacta del candidato únicamente si pasan gates. Sin privilegios nuevos, sin solicitudes repetidas.

## Gate de autenticación propietario · bloqueado con prueba física

- CI protegido en rama candidata `cerebro/operativa-runtime-p0-fix-20261118`; `CEREBRO_E2E_USER_JWT` existe como referencia de secreto en Actions, pero su valor **no logra autenticar** en Supabase.
- Workflow `44278050023`: petición GET propietario a preview devuelve `HTTP 401`.
- Segundo y último diagnóstico, distinto enfoque, workflow `44278139673`: petición de solo lectura al servicio Supabase `cerebro-console-activity-v0` con **el mismo JWT propietario de Actions** devuelve también `HTTP 401`. Queda distinguido de un posible bloqueo exclusivo Vercel. No se consultaron ni registraron valores del secreto.
- Conclusión: `OWNER_CI_JWT_INVALID_OR_EXPIRED` / `OWNER_E2E_POSITIVE=BLOCKED`. Renovación legítima del secreto E2E usando una sesión real autorizada; NO aflojar Auth, RBAC, RLS, SSO, CORS ni enmascarar fallos con mocks.
- **HUMAN_REQUIRED · LOW_CONFIDENCE** exclusivamente para obtener un JWT de prueba propietario válido o completar el login protegido y certificar el E2E. No exigir otros permisos ya concedidos. Tras ello repetir E2E, rollback y comparación antes de promoción.
- PR #78 comentario de bloqueo: `https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/78#issuecomment-6974750925`.

## Continuación tras autenticación manual del propietario · 18/11/2026

**HECHO · E2E positivo de propietario en despliegue privado desde Opera:** usuario inició sesión por sí mismo en `https://fenix-capital-preprod-4f1il4udq.vercel.app/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=agentes`. El árbol de accesibilidad del navegador autenticado mostró `Centro de mando operativo (ensayo)`, directorio `1–25 de 2506`, estado `Fuente CEREBRO_CONSOLE_ACTIVITY_V0 · observada 2026-11-18T09:41:04.395Z`, `perfiles con identidad exacta 0`; registros marcados `POR VERIFICAR`. Esto prueba lectura real de **una interfaz OPERATIVA** con acceso permitido al propietario, no certifica ejecuciones de 2506 perfiles.

**INCONSISTENCIA DE PERSISTENCIA POR AUDITAR:** al abrir después pestañas adicionales del mismo despliegue para NEURONAL/JARVIS, la vista mostró de nuevo `Acceso seguro`. No se ha demostrado que la sesión perdure ni logrado una segunda interfaz autorizada en ese mismo despliegue; no asumir revocación global por el hecho de ver un formulario. La App en dominio actual seguía mostrando acceso autenticado, sin alterarse.

**BLOQUEO INDEPENDIENTE CI:** la credencial cifrada de Actions `CEREBRO_E2E_USER_JWT` produjo 401 en workflow `44278139673` incluso consultando directamente `cerebro-console-activity-v0`. La autenticación manual en Opera NO actualiza automáticamente ese secreto; no se ha leído/copiadado el JWT de navegador. Para poner verde esa prueba automatizada hace falta renovar la credencial en GitHub o establecer un método legítimo equivalente sin debilitar permisos.

**Rollback y publicación:** artefacto histórico `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ` verificado READY con SHA `a51dd14eac11f02424dce5db426346b041c1824f`; artefacto publicado `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` READY SHA `7163dccd962a19fbd5301b14fcacacf08b7245ea`, preview `dpl_HosSkpwg9czo4jQ5QEB6suSmNB5Q` READY SHA `184e5ad6bdcb7291660ea96847f95cbf0f96e7ee`. Esta lectura acredita disponibilidad de artefactos, **no ensayo de reversión efectiva**. Alias `app.fenixcapital.es` sigue en el despliegue original por consulta Vercel `get_alias`.

**Salud Supabase v8:** consulta posterior a logs por GET v8: 108 respuestas 200, 24 respuestas 403 (autoridad denegada/no atribuidas aún), 2 respuestas 401 y **0 respuestas 503** en la ventana disponible hasta 09:51:56Z. No interpretar los 403 sin inspeccionar actor; no equivalen a fallos de disponibilidad.

**NO-GO aún:** faltan prueba duradera de la sesión en preview, dos interfaces autorizadas consultando el mismo backend con fechas comparables, E2E automático corregido y rollback funcional. No promover PR #78 ni cambiar dominio.

## 18/11/2026 · Segunda comprobación real Opera, 10:57 Madrid

**PASÓ E2E CROSS-INTERFACE (lectura visual real):** en la misma sesión del mismo preview `dpl_HosSkpwg9czo4jQ5QEB6suSmNB5Q`, pestaña OPERATIVA `/cerebro?section=operativa&visual_lab=cockpit-v3` devolvió directorio de 2506 perfiles y fuente `CEREBRO_CONSOLE_ACTIVITY_V0`, `observed_at=2026-11-18T09:41:04.395Z`, cero instancias por perfil de identidad exacta. Pestaña NEURONAL `/cerebro?section=neuronal` se mostró **autenticada**, etiqueta `CACHED`, observación `10:41` Madrid y runs auténticos de GitHub `44278180313` y `44277776584`; ambos reportan la misma fuente de datos de actividad. La observación es un snapshot, no confirma SLA futura. También se observó `/inicio` con sesión activa en el preview. Esto resuelve el anterior bloqueo de comprobar físicamente dos interfaces autorizadas.

**Sigue BLOQUEADO:** GitHub CI `CEREBRO_E2E_USER_JWT` no es válido; acciones `44278139673` HTTP 401 contra Supabase; la autorización del navegador no repara por sí sola un secreto cifrado persistente. No se han expuesto tokens ni ampliado permisos. Resto de workflow QA específicos 27 éxitos, 1 skip, 1 E2E failure (última consulta PR #78). No promover sin resolver la identidad CI y prueba de rollback.

**Supabase Activity V8:** 126 GET 200, 80 GET 403, 2 GET 401, cero 503 en ventana de observación hasta 09:59:36Z. El 403 indica autorización denegada, no disponibilidad 503. Rollback y App originales intactos.

## 18/11/2026 · RCA del gateway privado y stage con configuración de producción

**HECHO / CAUSA CONFIRMADA:** en el preview de Vercel compilado con `--prod --skip-domain`, `api/cerebro-preview-gateway.ts` tenía gate `process.env.VERCEL_ENV!=='preview'`, de modo que `/api/cerebro-preview-gateway?resource=activity` devolvía `403 PREVIEW_ONLY` aunque el propio despliegue fuese privado, protegido y servía OPERATIVA. NEURONAL usa esa API en `visual_lab=cockpit-v3`. La ruta del directorio, en cambio, ya admitía un deployment production-config *con exact `VERCEL_URL`*.

**HECHO / CORRECCIÓN SEGURA:** la autorización del gateway reutiliza por contrato la misma validación de host privado exacto existente en `api/cerebro-preview-owner.ts`, con comparación de regresión. No se permite PROD alias ni se amplía identidad, tenant, acciones, permisos o recursos. Primer intento en preview `dpl_3NMdt7fCsoGkJ7kr7Pz2U1GLTy4y` tuvo `500 FUNCTION_INVOCATION_FAILED` por importación ESM sin extensión (logs Vercel: `ERR_MODULE_NOT_FOUND /var/task/api/cerebro-preview-owner`); se corrigió incluyendo un guard puro sin dependencia runtime y pruebas de equivalencia/owner/negative. Nuevo stage `dpl_852XekBTRRWSHfiJzJVFbiHd9FDk` (`fenix-capital-preprod-ng0bal2fd.vercel.app`), SHA exacto `55d13170b56c69995f1fd78a9cd742e1f60b7225`, `READY`, production configuration, `--skip-domain`, workflow `44283908024` SUCCESS.

**PRUEBA HTTP REAL:** gateway viejo producción-config `dpl_788PWZ4DJtQsf1bXPjyEPxbfbwT6` sin auth `403 PREVIEW_ONLY`; intento ESM `500`; gateway corregido, misma petición anónima `401 AUTH_REQUIRED` en la nueva URL, que acredita avance hacia validación de identidad sin abrir acceso. FALTA **GET positivo owner desde esta URL** y **NEURONAL + OPERATIVA mismo observed_at** (nueva URL requiere sesión).

**SUPABASE ACTIVITY CORS RESTAURADO:** el intento de permitir de modo exacto el origin privado en v9 se identificó como innecesario para el camino proxy del preview. Se revirtió aplicando código v8 byte-identical, manteniendo fallback GitHub y auth; Edge Function resultante v10 `ACTIVE`, `verify_jwt=true`, SHA binario `08c33889f71df9374400fb07d27a0f9d05fd7518a078dddc99a196226129a012`. La lista CORS vuelve a ser exclusivamente `https://app.fenixcapital.es` y `https://www.app.fenixcapital.es`. Respaldo v8 en GitHub.

**APP REAL INTACTA:** `app.fenixcapital.es` alias Vercel apunta a `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h`; la App/CRM no cambiaron. Nueva versión aislada pendiente de gates completos, la PR #78 sigue DRAFT, sin merge; #76 y #77 sin tocar.

**BLOCKER CI NO RESUELTO:** `CEREBRO_E2E_USER_JWT` repo secret existe, pero Actions devuelve `401` contra función owner en el runner; no se han registrado ni leído tokens. Nada aquí justifica relajar ese gate: renovar credencial con mecanismo legítimo durable o evidenciar prueba física alternativa y decisión de política antes de promoción. Rollback producción anterior identificado y READY, pero no se ha simulado con cambio de alias.

**Gates:** Source/CORS/owner-negative/registry/build PASS; owner-positive nuevo stage PENDING; cross-interface nuevo stage PENDING; CI owner-live FAIL; real alias unchanged; rollback production not physically exercised. No declaración de terminación aún.

## 18/11/2026 · E2E final de dos interfaces en stage corregido · observación 11:19 Madrid

**HECHO:** el stage privado `dpl_852XekBTRRWSHfiJzJVFbiHd9FDk` `READY` / código `55d13170b56c69995f1fd78a9cd742e1f60b7225` devuelve `401 AUTH_REQUIRED` sin sesión para `/api/cerebro-preview-gateway?resource=activity` en lugar de `403 PREVIEW_ONLY` (baseline) o `500 ERR_MODULE_NOT_FOUND` (intento intermedio). `api/cerebro-preview-gateway.ts` ahora comprueba deployment host exacto / VERCEL_URL igual con control owner existente; **sin acceso público**.

**HECHO autenticación positiva física, propietario Opera:** en la misma pestaña del mismo stage, `OPERATIVA` mostró `CEREBRO_CONSOLE_ACTIVITY_V0`, `observed_at=2026-11-18T10:19:23.157Z`, directorio 2.506 registros lógicos, perfiles verificados 0. En la pestaña NEURONAL tras refrescar, estado `CACHED`, momento `11:19` Madrid con enlaces reales a runs de GitHub `44284261428`, `44284187931`, `44284109506`. Las dos interfaces comparten origen/contrato y no inventan el número de motores. En primer render NEURONAL aparecía `UNAVAILABLE` antes de que el servicio respondiese; después se recuperó a `CACHED` sin nuevos cambios. Certificar persistencia futura por observabilidad, no una sola pantalla.

**HECHO rollback CORS:** Supabase Activity v10 `ACTIVE`, `verify_jwt=true`, SHA `08c33889f71df9374400fb07d27a0f9d05fd7518a078dddc99a196226129a012` (byte-equivalent a v8 con fallback); la ampliación CORS temporal de v9 fue retirada. Registros v10 hasta 10:22:24Z: 10 GET 200, sin 503 en esa ventana. No se alteraron Auth/RLS/DNS/CRM.

**GO/NO-GO:** staged build SUCCESS `44283908024`, 28 check runs SUCCESS, 1 skipped, 1 failure `owner-live-gate` por `CEREBRO_E2E_USER_JWT` expirado/inválido. La prueba manual owner positiva no repara un secreto CI. Alias prod `app.fenixcapital.es` → `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` verificado de nuevo; no promover PR #78 ni fusionar PR #76/#77. Rollback de APP está identificado (dpl anterior READY) pero no ejercitado físicamente. El gate crítico pendiente requiere renovación legítima del test de CI; verificar también smoke CRM con usuario antes de promoción. No atribuir sesiones cerradas en Opera a fallo de código sin evidencia causal.

## 18/11/2026 · Reversión física aislada y GitOps reconciliado

**HECHO · Rollback mecánico en alias privado:** Vercel alias `fenix-capital-prep-git-b38c9b-carlosjmunozcabeza-2582s-projects.vercel.app` partió de deployment `dpl_HosSkpwg9czo4jQ5QEB6suSmNB5Q`. Se reasignó temporalmente a `dpl_852XekBTRRWSHfiJzJVFbiHd9FDk`, GET de alias confirmó destino nuevo, se reasignó de vuelta a `dpl_HosSkpwg9czo4jQ5QEB6suSmNB5Q` y GET final verificó el destino original. En comprobación simultánea `app.fenixcapital.es` siguió asociado a `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h`. **No se probó rollback sobre tráfico PROD**; solo se certificó el mismo mecanismo de asignación de alias en una ruta privada reversible. Coste nuevas suscripciones 0 €.

**HECHO · Repo candidate reconciliado:** Git commit `a63592cc5fa870cfde63e3651568638cd39b5c14` restaura `cerebro/universal/v0/supabase-activity/index.ts` al código exacto de v10 ACTIVA en Supabase (idéntico a v8, SHA `08c33889f71df9374400fb07d27a0f9d05fd7518a078dddc99a196226129a012`), y actualiza prueba de origen estricto. Workflow de actividad y QA runtime PASSED; CORS strict PASS. Esta revisión del repositorio no altera el código del frontend/gateway desplegado en `dpl_852XekBTRRWSHfiJzJVFbiHd9FDk`, pero **el source SHA de stage es `55d13170...` anterior al HEAD; la promoción definitiva requiere compilar y validar artefacto exacto del SHA aprobado**.

**No-Go pendiente:** Gate `CEREBRO_E2E_USER_JWT` de GitHub Actions sigue con 401; propietario autenticado probado en browser, pero automatización permanece rota. 28 checks SUCCESS / 1 SKIPPED / 1 FAILURE en la última revisión antes de reconciliación (revisar de nuevo tras ella). No fusionar PR ni cambiar dominio hasta secret E2E legítimo, CI final y prueba de CRM. Faltan ejecución sostenida/autonomía de roles, no declararlos 2506 activos.
