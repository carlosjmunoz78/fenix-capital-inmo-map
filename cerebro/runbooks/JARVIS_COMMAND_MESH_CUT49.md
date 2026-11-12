# Runbook · JARVIS Command Mesh CUT49

1. Asegurar que CUT48, `PROD_MAX Load Matrix` y las regresiones OLD vs NEW siguen en verde. No promover nada en caso de fallo.
2. Utilizar `inspectJarvisCommandNetworkV0()` para listar 179 IDs de motor y 11 perfiles de rol. **El catálogo no es una conexión operativa.**
3. Para cada destino: verificar implementación real, contrato, company_id, modo y versión, permisos, política, credenciales mediante Vault, salud, logs, idempotencia, costes, backup y rollback. Registrar evidencia física en `verified_targets` del bootstrap de servidor, no desde una orden de voz ni una entrada de chat. Dejar la lista vacía en ausencia de evidencia.
4. Usar **CerebroGatewayV0 existente** y **ACTGW-001 existente**. Conectar únicamente mediante `bindJarvisCommandNetworkV0()`. Conservar worker, eventos, colas y supervisores existentes; no instalar runtime nuevo.
5. Suministrar `verifyOwner` de implementación independiente en backend (no cliente, no atributo de petición). Sin él `dispatch` no puede habilitarse.
6. Primer candidato: ROUTE-001 solo determinista PREPROD, sin datos de clientes ni gastos, invocando `budgetDecision`. La prueba actual de ROUTE-001 utiliza identidad **simulada**; no es el resultado E2E del propietario.
7. Ejecutar `node --test cerebro/tests/jarvis-command-network-v0.test.mjs`, JARVIS LAB CI, test de pérdida de JWT, denegación de Trading y cross-company, OLD vs NEW, recuperación y Tribunal. Si algún test falla: no avanzar.
8. No activar roles/agentes con `reports_to_state=UNRESOLVED` ni `PLAN_ONLY`. No asignar supervisores automáticamente por inferencia. Debe acreditarse cadena de mando.
9. No habilitar producción ni App ni CRM ni Gateway EDGE hasta pruebas físicas de autenticación, permisos, cancelación, supervisión, monitoreo, coste, rollback y aprobación de promoción.
10. Si hay fallo: cerrar PR CUT49 DRAFT o revertir solo la rama CUT49; no hay cambios desplegados ni scripts destructivos que ejecutar.

## Changelog
- 2026-11-07: añadido inventario de conectividad y puente de órdenes PREPROD reutilizando ACTGW; pruebas con motor ROUTE-001 real solo en proceso de test, sin nuevas suscripciones.

## Continuidad de capacidades aprendidas · JARVIS director, CEREBRO ejecutor

- El backend de CEREBRO, no el LLM ni el navegador, debe construir `readCanonicalCatalogue` con `createJarvisCerebroRegistryReaderV0()`. La lectura usa **cada vez** los registros maestros en disco; no duplicar los 179 motores ni la base de conocimientos en JARVIS.
- El mismo backend suministra `readReleaseManifests` desde un **registro independiente de capacidades realmente certificadas**. No se ha conectado aún a ningún manifest vivo; el default seguro en el LAB es `[]`. Un JSON de un modelo o una declaración del cliente nunca es un origen confiable.
- Vincular `bindJarvisCapabilityDelegationV0` al **mismo** `CerebroGatewayV0` y `ActionGatewayV1`, con `verifyOwner` servidor, sin nuevos servidores/procesos. Comandos: `jarvis.capabilities` para descubrir y `jarvis.delegate` para ordenar.
- Ante aprendizaje CEREBRO/FACT/LRN/Skill: (a) registrar como `TESTED_NOT_RELEASED` o `LEARNED_CANDIDATE`; (b) publicar en fuente canónica; (c) evaluar contrato, permisos, tests, tribunal, observabilidad, backup, rollback, rebuild, coste y política; (d) aprobar un manifest confiable del backend; (e) ofrecer a JARVIS el nombre de la capacidad; (f) JARVIS delega a ACTGW / JOB001 tras verificar propietario y riesgo. **No saltar pasos**.
- Al quitar un manifest, la capacidad deja de ser invocable en la siguiente consulta. Si el catálogo deja de ser legible, mantener estado `CATALOGUE_UNAVAILABLE` sin ejecutar nada. No usar caché de un catálogo viejo como permiso.
- JARVIS comunica `delegated` al aceptar el trabajo; para anunciar **completado**, debe consultar el estado terminal real de `JOB-001`, supervisor y comprobación de resultado. El acuse de `enqueue` por sí solo no certifica un trabajo terminado.
- La versión existente de FACT-001 valida el registro maestro de **exactamente 179** motores: su propia evolución y la certificación de extensiones siguen pendientes, sin adulterar pruebas ni forzar un número 180 en el catálogo real.
- La prueba local de 180 registros se realiza en un directorio temporal de test. No se modifica la fuente original ni producción.
- El conocimiento de negocio y conversación continúa en las fuentes CEREBRO existentes y su Gateway; este enlace se ocupa de **capacidades operativas**, no de copiar toda la base de conocimiento. Comprobar aparte la paridad de retrieval y los permisos por empresa.
- Estado actual: 8 capacidades nativas y 2 skills leídas de los registros reales, **0 nuevos permisos activados**; identidad física del propietario no acreditada en LAB/PROD y las 11 cadenas de supervisión de roles siguen sin resolverse.

### Prueba concreta
`node --test cerebro/tests/jarvis-capability-delegation-v0.test.mjs cerebro/tests/jarvis-cerebro-registry-reader-v0.test.mjs`

### Seguridad
No publicar estas funciones como API pública antes de integrar el Gateway, la autenticación, las capacidades firmadas en backend, la evaluación, tribunal, replay, rollback y el paso gradual a producción.
