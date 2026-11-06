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
