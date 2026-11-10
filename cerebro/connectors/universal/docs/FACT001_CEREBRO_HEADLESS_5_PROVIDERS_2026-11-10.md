# FACT-001 · CEREBRO sin consola · cinco conectores · 2026-11-10

## Objetivo de negocio
CEREBRO puede ejecutar por (A) órdenes expresas del propietario y (B) automatización registrada, sin depender de la interfaz de la consola ni de OAuth de ChatGPT. Estos dos modos usan las **mismas políticas** con identidades distintas. ChatGPT opera por su propio conector; no se le transfieren las credenciales a CEREBRO.

## Hecho hoy, no equivalente a PROD
1. CREADO `src/headless.mjs`: entrada unificada sin interfaz, recibe `source=owner_order|automation`, `company_id`, `engine_id`, `environment`, `version`, `capability`, `input` e `idempotency_key`. Identidad verificada **externamente**, no aceptada del input; orden de propietario precisa prueba firmada y automatizaciones identidad registrada.
2. Reutiliza `UniversalConnectorCore` existente, su autorización de permisos por recurso, evaluación de riesgo, control de coste, idempotencia durable, auditoría sin secretos y denegación de mutaciones PROD por defecto. **No se ha alterado el núcleo existente** ni desplegado un nuevo servidor.
3. `tests/headless.test.mjs`: 11 pruebas de firmas/políticas/scopes, incluidas suplantación, entrada manipulada, autonomía registrada, PROD, costo a través del núcleo.
4. `registry/headless-gates.v1.json`: 11 gates por proveedor. El estado **VERIFIED_FULL** está prohibido sin todas las pruebas reales; no mezclar prueba OAuth de ChatGPT con credenciales del servicio CEREBRO.
5. `tests/headless-registry.test.mjs`: 5 pruebas del registro y protección contra falsos VERDE.
6. `.github/workflows/fact001-headless-five-connectors-lab.yml`: CI, prueba cruzada del núcleo Vercel/Cloudflare y **GET real GitHub API con GITHUB_TOKEN del runner**; no usa OAuth ChatGPT ni despliega/crea/baja recursos.
7. EVIDENCIA: [GitHub Actions #42819828134](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42819828134), 11+5+10+14=**40 tests PASS**, y `FACT001_GITHUB_SCOPED_REPO_READ=PASS`.
8. Branch aislada DRAFT en repo `carlosjmunoz78/fenix-capital-inmo-map`; `main`, App, CRM, DNS y recursos productivos **sin modificaciones**.

## Estado por proveedor (hechos históricos frente a ejecución actual)
- **Cloudflare**: OAuth ChatGPT en MCP, token de LAB independiente en Vault y pruebas OIDC de D1 Read pasadas previamente. FALTA broker general autorizado, workers/DNS/Access full permission, backup/rollback y producción.
- **Vercel**: E2E real anterior de creación/modificación/despliegue/rollback de configuración y borrado en LAB. Tras petición de limpieza, se eliminó el proyecto LAB y el servicio temporal; por tanto **no hay un runner Vercel permanente conectado a CEREBRO**. Token de servicio protegido en Vault.
- **Supabase**: E2E de DELETE de función de prueba por API Management vía OIDC independiente, verificado 404; artefactos de un solo uso retirados. PAT Scoped protegido en Vault. FALTA broker permanente, contrato general para Edge Functions, Storage, DB, Auth, backups y rollback.
- **Notion**: doble MCP probó CRUD de página aislada **dentro de ChatGPT**, después retirada a la papelera. FALTA identidad/token independiente del servicio CEREBRO y CRUD autónomo, backup/restore y permisos por página.
- **GitHub**: lectura real automática por `GITHUB_TOKEN` del propio repo en Actions sin OAuth ChatGPT. La creación de repositorio privado desde `CEREBRO · GitHub Universal` falló anteriormente con 403; acciones de administración multi-repo para CEREBRO requieren credenciales/instalación con permisos explícitos, test de crear/borrar repositorio aislado, protección de ramas, backup y rollback.

Inventario de nombres de secretos (sin leer valores) de Vault del proyecto `cluhljgonannaafpmblx` en fecha de comprobación: `notion_names=0`, `github_names=0`, `cloudflare_names=3`, `vercel_names=1`, `supabase_names=1`. **No se concluye inexistencia de tokens en otros sistemas**.

## Qué hará verde de verdad
Una capa **headless** de comandos y trabajos, con un solo runtime compartido; fuentes: órdenes del propietario firmadas, reglas y schedules; identidad de servicio distinta por proveedor; token en Vault (o GitHub App token efímero), políticas deterministas, scopes por empresa/motor/entorno/versión, catálogo create/get/update/delete + restore; instrumentación y reconciliación física. Para proveedores sin API se requiere navegación humana-asistida gobernada y con controles, no suponer equivalencia con permisos API.

Prioridad: no contratar ni desplegar servidores duplicados, conservar `main`/App/CRM, no introducir PROD writes sin snapshots/contratos/tests/rollback, usar HEADLESS en paralelo antes de diseñar nueva UI. Si una capacidad requiere autenticar servicio Notion/GitHub, la operación inicial del propietario puede ser HUMAN_REQUIRED, **no pedir autorización repetidamente** una vez delegada.

## Qué no significa
- 40 tests y GET GitHub independiente **no** habilitan cinco proveedores en modo full.
- OAuth concedido a ChatGPT no autoriza por sí solo acceso a la API por el proceso autónomo.
- La consola incompleta **no** es bloqueo estructural: backend y trabajos pueden continuar sin ella.
- El módulo `src/headless.mjs` es un **contrato probado y todavía no conectado a un broker** de producción. No publicarlo como operativa autónoma general.
