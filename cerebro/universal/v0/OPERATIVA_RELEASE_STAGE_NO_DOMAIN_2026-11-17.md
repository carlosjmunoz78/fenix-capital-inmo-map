# OPERATIVA V3 · CANDIDATO DE PRODUCCIÓN · STAGE SIN DOMINIO · 17/11/2026

## Objetivo y autorización
Usuario autoriza cerrar tres gates (catálogo de agentes y motores, QA autenticada, OLD vs NEW/backup/rollback) y promover a PRODUCCIÓN sólo si todas las evidencias están verdes.
Este registro **NO es una promoción**. Desencadena exclusivamente el build production de Vercel mediante `--prod --skip-domain`, sin alias ni cambio DNS/PROD.

## Fuente y destino exactos
- Repository: `carlosjmunoz78/fenix-capital-inmo-map`.
- Source branch PR #66 DRAFT: `cerebro/universal-control-plane-lab-v0-20261113`.
- Target team: `team_qnh6u1Ofy2WPp0MGEKlyMA50`; project: `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV` (`fenix-capital-preprod`, nombre histórico, alberga PROD).
- Domain actual `app.fenixcapital.es` asignado a proyecto; DNS CNAME `cname.vercel-dns.com`, sin cambio autorizado.
- Baseline deploy de PROD: `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ`, `READY`, commit `a51dd14eac11f02424dce5db426346b041c1824f`, branch `cerebro/operativa-stop-and-engine-catalog-20261113`. Guardar este ID para reversión.
- Preview nueva en el proyecto destino: `dpl_4ifzALfxijTCnahEApNVidrZPH95` (`READY`, `target=null`, SHA `4540257a3bf8d95155de94f7ff9fcbbbd33c343c`). PROD en baseline verificado durante el stage.
- Registro directorio: **2.506 entradas** documentadas, incl. 179 motores lógicos en catálogo separado; 2.506 no son 2.506 agentes vivos. Fichas con función técnica, explicación al pasar el cursor, ID, fuente, jerarquía demostrada, filtro empresa y estado. Implementación paginada GET 25/100. Orígenes: GitHub ingeniería, Facebook, Instagram, LinkedIn, UMS y SEO-001, con SHA fijados. Fuentes no indexadas siguen en `PENDIENTE`.
- Endpoint `api/cerebro-agent-directory.ts` permite sólo GET autenticado propietario `CARLOS-ADMIN`, `company_id=fenix`, hostname exacto `app.fenixcapital.es` cuando `VERCEL_ENV=production`; Preview sólo hosts allowlisted. `executed=false`, `total_runtime_instances=null`, sin capacidades de mutación.

## Gate de despliegue seguro
1. CI comparativo actual, tests de origen 2506/tenancy/negativos, build; exigir 3/3 verdes **en el SHA final de release**, sin aceptar pruebas históricas.
2. Workflow `cerebro-operativa-prod-stage-no-domain-20261117.yml` usa `VERCEL_TOKEN` ya existente **si está configurado**, proyecto exacto, CLI 48.0.0 de workflow antiguo, `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod --skip-domain`. Si token no existe, falla sin alterar alias.
3. Comprobar build READY, `target=production` pero no asignado a `app.fenixcapital.es`. Comprobar por API que hostname continúa en deploy baseline antes de cualquier promoción.
4. QA autenticada de propietario, regresiones OLD vs NEW (App rutas/voz/JARVIS/Neuronal/Navegador/CRM), permisos fail-closed, ausencia de nuevos errores, coste medido.
5. Sólo con todos los gates y rollback verificado: promover el ID nuevo con `request_promote` sobre proyecto exacto, comprobar el mismo ID desde `get_deployment(app.fenixcapital.es)` y realizar smoke con owner. Rollback previsto: `request_rollback` al ID `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ`, comprobar alias y SHA; no ejecutar sin disparador.
6. Si el E2E propietario no es posible por sesión/login de Preview, o existe discrepancia/CI roja, `PROD_PROMOTION=HOLD`, no habilitar agentes, no tocar App/CRM/DNS ni main.

**Estado del presente documento:** STAGE SOLICITADO; PROD alias protegido; no se certifican todavía QA autenticada, ejecución de subagentes, compatibilidad total, coste medido o rollback físico del despliegue.

## Gate E2E privado de sesión real (adición 17/11)
- Stage ahora permite exclusivamente su host único firmado por Vercel (`VERCEL_URL`) cuando `VERCEL_ENV=production`, y sólo acepta GET con JWT real de propietario; alias PROD sigue en baseline.
- La aceptación automatizada comprueba `GET` sin sesión 401, `POST` 405, tenant ajeno 400, y `GET` propietario real 200 con 2.506 entradas y `executed=false`.
- Sólo utiliza secretos ya existentes en GitHub Actions; si el JWT falta/expira o el bypass de SSO no está autorizado, falla y prohíbe promover. No crea cuentas, tokens, permisos, dominios ni alias.
