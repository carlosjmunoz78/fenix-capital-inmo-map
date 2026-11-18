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
