# JARVIS · contrato de alcance multiempresa · candidate non-voice · 2026-11-09

**Estado:** PARCIAL · candidato PR #40 · NO DESPLEGADO en PROD.
**Empresa autorizada actualmente:** `fenix`. **Coste adicional previsto:** 0 €.

## Contrato de seguridad actual
- Entrada: `POST /chat` autenticado y restringido previamente por `authorizedOwner(req)`.
- El frontend añade `company_id: "fenix"` de forma explícita, sin extraerlo de parámetros URL ni de texto libre.
- El Gateway conserva compatibilidad con peticiones antiguas que omitían `company_id`. Si se envía cualquier valor distinto de `fenix`, incluso un objeto o `null`, responde HTTP 403 `COMPANY_SCOPE_NOT_AUTHORIZED` **antes** de llamar a `chatReply`.
- `GET /companies` comparte la autenticación de propietario y devuelve únicamente `fenix`, indicando `multi_company_enabled:false`.
- El historial y los motores en la consola Fénix filtran los resultados a `company_id=fenix`.
- No se han habilitado nuevas empresas, escrituras generales, funciones de pago ni acceso a Trading.

## Dependencias y alcance
- UI: `src/CerebroJarvisWorkConsole.tsx`; `src/cerebroConsoleApi.ts`.
- Gateway: `supabase/functions/cerebro-console-gateway-v0/index.ts`, `companyScope.ts`.
- Origen de actividad: `src/cerebroActivityApi.ts` (filtrado de presentación; no sustituye RLS ni el aislamiento del backend).
- Memorias, preferencias, propuestas y conocimiento del Gateway **siguen vinculados a Fénix**. La lista de empresas **no** constituye una autorización para otros tenants.
- App, CRM, DNS, WordPress, Supabase PROD y voz quedan intactos hasta promoción expresa.

## Gates antes de habilitar otra empresa
1. Company Registry real, pertenencia y autorización de servidor por sujeto JWT y `company_id`.
2. Separación real de datos, conocimiento, memoria, actividad, preferencias, propuestas y credenciales por empresa, con pruebas de acceso cruzado denegado.
3. Contratos por motor con `company_id`, `engine_id`, `environment` y `version`; auditoría de permisos de lectura y escritura.
4. Tests positivos y negativos con sesiones autenticadas reales; compatibilidad OLD vs NEW; costes y rollback.
5. Solo entonces activar selector de empresa y el enrutamiento real. No mostrar un selector funcional aparente antes.

## Pruebas de candidato
- `tests/cerebro-console-company-scope.spec.ts`: rechaza compañías ajenas y verifica precedencia de la comprobación.
- `tests/cerebro-jarvis-v1-preview.spec.ts`: comprueba `company_id` en chat y aísla ejecuciones de otras empresas.
- `.github/workflows/jarvis-console-nonvoice-gate.yml`: ejecuta pruebas aisladas sin escribir en PROD.
- CI en verde **no** sustituye autenticación real, pruebas de backend desplegado o aceptación de sesión en Opera.

## Backup / rollback / reconstrucción
- Base `main` anterior a PR #40: `4cf90f47b56300ce70fa30d097713d1e199e5b30`.
- La implementación solo vive en la rama `cerebro/jarvis-console-history-nonvoice-v0-20261109`. No hay migraciones de BD.
- Rollback del candidato: no fusionar PR #40. Si algún día se promueve, conservar commit anterior y recuperar el deployment verificado, ejecutando smoke y comprobando aislamiento por empresa.
- Reconstrucción: checkout de commit candidato, instalación `npm ci`, build y controles CI; despliegue del Gateway únicamente tras gates y autorización de promoción.

## Autonomía
- Consulta/visualización acotada Fénix: **HECHO en código candidato / CI**, no certificado en PROD.
- Activación real multiempresa: **DEFINIDA / NO IMPLEMENTADA**.
- Acciones autónomas PROD: **NO AUTORIZADAS** por este contrato.
- Voz: **APLAZADA** por instrucción del propietario.
