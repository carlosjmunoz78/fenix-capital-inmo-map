# CEREBRO OS · OWNER UNIFIED ACCESS / OPERATIVA V37
Fecha: 2026-11-12
Estado: DEFINIDO (acceso global objetivo) / PARCIAL (enrutadores existentes) / POR AUDITAR (cobertura física de fuentes).

## Decisión del propietario
Todas las interfaces —Operativa web, JARVIS/voz, móvil, escritorio, futuras consolas— son **clientes del mismo CEREBRO OS**, no asistentes independientes con permisos/capacidades inventados o recortados. El propietario, autenticado y autorizado, debe poder **CONSULTAR, SABER y ORDENAR toda capacidad de todas sus empresas** desde cualquiera de ellas. Que una consulta no esté hoy conectada es un GAP técnico; nunca un límite artificial del producto.

**Importante:** "acceso global" significa alcance objetivo sobre las empresas, cuentas y recursos realmente propios/autorizados, con verificación de identidad, autorización y procedencia. No significa abrir endpoints anónimos, revelar secretos en respuestas, acceder a datos de terceros o eliminar gates legales, de seguridad o coste.

## Contrato de diseño
```
Operativa web ─┐
JARVIS / voz  ─┼─> CEREBRO Gateway [autenticación+identidad] -> [Owner Entitlements] -> [Company/Context Registry] -> [Knowledge+Source Router] -> [Motor/Action Orchestrator] -> [Policy] -> [Audit/Evidence] -> respuesta
Móvil/escritorio┘
```
- Identidad central: identidad del propietario verificada en servidor; `owner=true` solo por dato de confianza del backend, **nunca** por botón, rol declarado en el prompt, claims sin validar o parámetro `company_id` enviado por cliente.
- Alcance: `company_id`, `engine_id`, `environment`, `version` más identidad autorizada. `company_id` selecciona contexto, no concede acceso. Denegar por defecto cruce de tenants no vinculados.
- Consulta: todas las fuentes empresariales autorizadas, también las que solo se incorporen más adelante. Los adaptadores explican `CONNECTED_VERIFIED`, `PARTIAL`, `NOT_CONNECTED`, `ACCESS_DENIED` o `SOURCE_UNAVAILABLE`, con `observed_at`, fuente y estado de frescura; no inventar resultados.
- Orden: cualquier motor/acción entra por **el mismo Gateway/Orchestrator**, no por accesos directos desde cada UI a Supabase, WordPress, Cloudflare, GitHub, APIs de modelos, etc. `proposal` != `execution`. Usar contratos de operación, verificación de permisos, idempotencia, límites de coste, eventos y rollback.
- Human-by-exception para `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`. El trabajo ordinario ya autorizado no requiere permisos repetidos.
- Secretos: vault/referencias y privilegio mínimo por herramienta. La capacidad de usar una credencial autorizada **no** equivale a devolverla en texto ni a conceder scopes arbitrarios.
- Coste adicional: 0 € por defecto. Reutilizar adaptadores, conectores y runtimes existentes.

## Matriz mínima de cobertura prevista — NO confundir con acceso operativo confirmado
| Dominio | Consulta y evidencias | Acciones (mediante contrato) | Estado a 12/11 |
|---|---|---|---|
| App/CRM Fénix | expedientes, personas autorizadas, documentos, tareas, firmas, KPIs | acciones CRM específicas | PARCIAL; no cambiar contratos |
| CEREBRO / Engine Registry / FACT | motores, versiones, estado, colas, CI, fallos, coste | jobs y operaciones gobernadas | PARCIAL; observar antes de escribir |
| GitHub / despliegues | repos, PR, commits, acciones, gates | PR, CI, releases con rollback | POR AUDITAR por cada runtime |
| Supabase | metadatos/estado, base y funciones según permisos | cambios gobernados / migraciones | POR AUDITAR; PROD protegido |
| Cloudflare | Workers, D1, colas, observabilidad, cuotas | recursos aislados y cambios gobernados | POR AUDITAR |
| WordPress / SEO / GSC | páginas, indexación, analítica y fuentes SEO | contenido e infraestructura vía contratos | POR AUDITAR |
| Redes / marketing | calendario, publicaciones, métricas, contenidos | programar/publicar con gates | PARCIAL / según fuente |
| Notion / Drive / documentos | conocimiento, precedentes, archivos y versiones | edición auditada con consentimiento | POR AUDITAR |
| AION / CAPTACASA y empresas futuras | recursos vinculados bajo su company_id | motores por empresa | NO CONECTADO en Gateway v36 |
| Voz/JARVIS / otras UI | mismo Gateway, mismas capacidades por identidad | mismo Orchestrator y Policy | NO CONFIRMADO E2E |

## Contrato UI mínimo de una respuesta a pregunta/orden
```json
{
  "owner_scope": {"identity_verified": true, "company_id": "<de un registro autorizado>"},
  "capability": {"id": "...", "status": "CONNECTED_VERIFIED | PARTIAL | NOT_CONNECTED | ACCESS_DENIED | SOURCE_UNAVAILABLE"},
  "kind": "READ | PROPOSAL | EXECUTION",
  "executed": false,
  "evidence": {"source": "...", "observed_at": "...", "freshness": "..."},
  "next_action": "..."
}
```
Este es **contrato objetivo**, no declaración de que v36 ya emita ese JSON.

## Implementación de corto plazo, no romper lo existente
1. V37: corregir las respuestas cortadas y el falso "resumen" por copia literal, conservando Gateway v36 y sus autorizaciones. En rama y PR aislados; no desplegar sin QA.
2. Inventariar **solo gaps de conectividad real** de Gateway/Voice/UI, sin repetir auditorías corporativas terminadas. Registrar `capabilities` contra adaptadores existentes; mapa consulta/acción y nombres de permisos por motor.
3. Crear `Owner Access Resolver` central detrás de la autorización server-side actual; pruebas: owner autorizado, usuario normal, tenant aislado, fuente caída, ausencia de permisos, coste y rollback. **No** elevar privilegios de usuarios normales ni introducir Service Role en frontends.
4. Exponer desde un Gateway compartido consultas/órdenes disponibles; incorporar adaptadores de otros sistemas incrementalmente, en LAB/pruebas, comparando comportamiento OLD vs NEW y preservando contratos.
5. Conectar cada interfaz a esa misma capa, validando permisos, estado de ejecución, historial, voz y continuidad tras recarga. **No** declarar memoria persistente sin ensayo real.
6. Promover a PROD solamente por gates (backup, CI, E2E, permisos, auditoría, rollback y coste). Mantener JARVIS/CRM/APP/Trading LAB protegidos hasta entonces.

## Criterios de aceptación físicos
- Misma orden, autenticada como propietario, funciona con la misma semántica y trazabilidad por web/JARVIS/móvil cuando estén conectados; si falla un canal, error preciso y **sin inventar**.
- Ningún usuario no autorizado ve información, acciones ni secretos de otra compañía.
- Consultas generales de owner no quedan reducidas por diseño a 4 frases fijas; si falta un adaptador, indicar qué falta y cuál sería el siguiente bloque de integración.
- No se ha realizado ningún cambio en App/CRM, DNS, Workers ni otra empresa por definir este contrato.
- Respuesta de "explicar más sencillo" es semánticamente más breve y nunca se corta a mitad de una palabra.

## Rollback
Gateway PROD v36 no se ha modificado por esta rama; respaldos exactos v35 constan en `cerebro/rollback/gateway-v35-20261112`. Para futuras implementaciones cada adaptador deberá tener rollback propio, baseline y comparar OLD vs NEW.

## Estado y next_block
HECHO: PR #56 DRAFT, parche de simplificación v37, contrato Owner Unified Access y prueba aislada sobre código exacto GitHub: **8/8 PASS**.
HECHO: LAB existente `cerebro-console-gateway-v36-followups-lab` actualizado a **versión 4 ACTIVE** con los cuatro archivos v37 exactos (comparación física GitHub vs Supabase: **4/4**); ninguna función adicional creada.
HECHO: PROD `cerebro-console-gateway-v0` sigue en **v36 ACTIVE**, y mantiene exactamente los archivos v36. **No** se ha promocionado v37 a PROD.
POR VERIFICAR: GitHub Actions v37 (no hay resultado confirmado), HTTP E2E owner-only y navegador Opera; el intento HTTP directo desde el canal de consulta no fue accesible. Persistencia tras recarga pendiente.
NEXT_BLOCK: CI/HTTP E2E v37 LAB -> verificar memoria y UI reales -> inventario de conectividad (sin repetir auditorías terminadas) -> resolver owner multiempresa -> promoción solo con gates.
