# CEREBRO OPERATIVA · Manifiesto de gate y release mínimo · 2026-11-17

Estado: **DEFINIDO / PROD_PROMOTION=HOLD**. Este documento no autoriza un merge, una promoción, una escritura a PROD, un cambio DNS ni un coste.

## 1. Identidades verificadas de despliegues (sin cambio de dominio)

- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`.
- PROD real: `https://app.fenixcapital.es`, `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ`, fuente SHA `a51dd14eac11f02424dce5db426346b041c1824f`, READY. **Protegido, sin modificar**.
- Candidata de Operativa: `https://fenix-capital-preprod-o51yrnx8m.vercel.app`, `dpl_DkYzpF7KADRdEj7K7g4PxxU9gqHp`, fuente SHA `60d84f90117725ce1cab46261151d95ea577caf7`, READY, **sin aliases asignados**.
- PR #66: `cerebro/universal-control-plane-lab-v0-20261113`, DRAFT, base histórica PROD `a51dd14eac11f02424dce5db426346b041c1824f`.
- No reutilizar una aprobación de una SHA para otra SHA ni declarar positivo el acceso privado por el mero hecho de que Vercel muestre READY.

## 2. Riesgo de alcance: no fusionar íntegro el PR

- GitHub PR reportó **315 archivos afectados, +43.086/-66 líneas** en la comprobación del 17/11; la API de comparación devolvió los primeros **300**, no el conjunto completo.
- Entre esos 300: **34 frontend**, **12 APIs**, **4 registros fuente**, **247 pruebas/documentos LAB**, **3 workflows**. La comparación abarcó **665 commits** de la rama respecto de base (dato de API); esto exige control de alcance y dependencias.
- El directorio `api/cerebro-agent-directory.ts` depende de 4 registros fuente nuevos + registros canónicos y `cerebro/media-studio/v2/registry/role-registry.mjs` existentes. La UI `src/CerebroRoleAgentRosterLab.tsx` depende de `src/cerebroAgentDirectoryApi.ts` y de `src/CerebroAgentJobLivePanel.tsx`; `CerebroOperativeCockpitV3.tsx` y su bridge integran otras vistas y motores. **No extraer un subconjunto sin un grafo completo de imports, efectos y pruebas**.
- Alcance de release objetivo: interfaz propietaria de OPERATIVA y directorio **de solo lectura**; no habilitar acciones, roles/instancias activas, Jobs, Trading, Cloudflare, otras empresas ni side effects LAB por la vía de esta promoción.
- La corrección de CORS mediante `api/cerebro-owner-bootstrap.ts` y de sesiones por pestaña `src/stagedOwnerAuthStorage.ts` son rutas **solo staged**; no constituyen por sí mismas un motivo para alterar las rutas directas de `app.fenixcapital.es`.

## 3. Resultados verificables

- Vercel candidata READY sin aliases; PROD antiguo READY y sin cambios.
- CI del commit desplegado `60d84f9`: Governed Main Integration V0, Universal Gateway LAB contract CI y Enterprise Acceleration V0 **SUCCESS**. OLD-vs-NEW canonical automated regression **SUCCESS** (no equivale a aceptación manual completa).
- Opera: candidata actual devuelve pantalla de `Acceso seguro`; el endpoint anónimo `/api/cerebro-owner-bootstrap?resource=context` devuelve `OWNER_SESSION_REQUIRED`. La candidata anterior `cf808c4` sí mostró visualmente listado 1–25 de 2506 perfiles con identidad/nav 200 en Supabase, pero **no autoriza el nuevo SHA**.
- El 17/11 se creó una prueba E2E protegida mediante `vercel curl`; falló una vez por `OWNER_E2E_JWT_EXPIRED`. Los reintentos del flujo de transporte fallaron con `VERCEL_CURL_TRANSPORT_2_PROJECT_SCOPE`, incluso tras vincular explícitamente `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV` en runner efímero. **No es un PASS**, no hay motivo para desactivar SSO ni seguir reintentando.
- El JWT de CI se gestiona exclusivamente mediante `CEREBRO_E2E_USER_JWT` cifrado. No crear secretos falsos ni exponer sus valores.

## 4. Gates de promoción

| Gate | Estado | Aceptación exigida |
|---|---|---|
| Base/branch/PR inventoried | HECHO | confirmar heads/base antes de publicar |
| Contratos + CI de SHA desplegada | HECHO | 3 workflows success en `60d84f9` |
| Negativa anónima owner endpoint | HECHO | `OWNER_SESSION_REQUIRED` |
| Session owner real en candidata exacta | **HUMAN_REQUIRED** | `CARLOS-ADMIN`, GET context/nav 200 sin divulgar secretos |
| E2E roles y tenant-deny con identidad nueva | **BLOQUEADO** | requests verificadas por el propietario |
| Alcance mínimo + dependencias cerradas | **PARCIAL** | revisión de TODOS los archivos y diff frente a base, sin promover LAB por defecto |
| OLD vs NEW app/CRM navegación y flujos reales | **PARCIAL** | además de regresión automatizada, E2E validado del propietario |
| Rollback físico en entorno seguro | **PENDIENTE** | prueba reversible sin sustituir el dominio real |
| Coste marginal y observabilidad | **POR AUDITAR** | estimación y medición sin nuevas suscripciones |
| Promoción y verificación PROD post-release | **NO AUTORIZADA** | solo con TODOS los gates verdes y alcance explícito |

## 5. Preparación de rollback (NO ejecutado)

1. Fijar el deployment actual del dominio y su commit; guardar y verificar **exclusivamente** el ID verdadero `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ` de la sección 1.
2. Conservar snapshot de configuración, mapa de dependencias y confirmación de `app.fenixcapital.es` y `fenix-capital-preprod.vercel.app`. No tocar DNS.
3. Ensayar cambio y restitución del apuntador sobre un dominio **de prueba ya autorizado y protegido**, nunca sobre el dominio del usuario para obtener la primera evidencia.
4. Registrar comportamiento OLD y NEW, tiempos, estado final y disponibilidad del Gateway; si falta prueba o hay duda, **ABORTAR**.
5. Promoción final exclusivamente como operación aprobada tras gate GREEN. Si falla observabilidad o login, rollback al deployment baseline comprobado.

## 6. Próxima intervención mínima

- **HUMAN_REQUIRED (una sola vez):** el propietario autentica su sesión habitual en la candidata privada sin transmitir credenciales al chat. Desde esa misma sesión se observa actor, navegación, 2506 perfiles y negativos de permisos.
- El sistema debe preservar el origen, marcar la evidencia por SHA y desbloquear solo cuando la identidad y el rollback real estén demostrados.
- Sin sesión válida, mantener `PROD_PROMOTION=HOLD` y detener reintentos de CI basados en JWT expirado.
