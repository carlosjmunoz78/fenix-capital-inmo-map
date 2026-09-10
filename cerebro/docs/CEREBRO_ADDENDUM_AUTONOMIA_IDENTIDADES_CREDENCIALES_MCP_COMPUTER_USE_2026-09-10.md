# CEREBRO · ADDENDUM CANÓNICO DE AUTONOMÍA OPERATIVA
## IDENTIDADES · CREDENCIALES · MCP/CONNECTORS · COMPUTER USE · MULTICUENTA

Estado de incorporación al repositorio: `DEFINED_NOT_BUILT`.
Fuente canónica: addendum v1.0 de 2026-09-10.

## Directiva de precedencia
Este addendum complementa el Master de Motores, Bootstrap Manifest, Zero-Cost AI/Cloud Runtime y Digital Build Factory + Technology Scout. No sustituye contratos existentes ni interrumpe el loop técnico en curso.

Regla estructural: `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.

Objetivo: human-by-exception. No tocar PROD ni credenciales críticas sin gates, auditoría, backup/rollback cuando aplique y separación de entornos.

Contexto obligatorio de diseño: `company_id`, `identity_id`, `account_id`, `engine_id/capability_id`, `environment`, `version`.

## Capacidades definidas
- Identity & Access Registry.
- Credential Broker / Vault.
- Connector/MCP Registry.
- Connector/MCP/Script Factory mediante FACT-001 solo ante gap real.
- Browser / Computer Use Runtime autorizado como fallback tras APIs/connectors/scripts.
- Account Lifecycle.
- Multi-Account Orchestrator.
- Descubrimiento progresivo de sesiones y métodos de login.
- Renovación/recovery automatizable cuando proveedor y política lo permitan.
- Operación legítima multicuentas para marketing/social, con trazabilidad y rate limits.
- Verificación del resultado real, autocorrección/reintento y aprendizaje del procedimiento validado.

## Ruta de herramienta obligatoria
1. Integración/API oficial o connector ya disponible.
2. MCP existente y autorizado.
3. Automatización propia mediante API/webhooks.
4. Script/CLI/open-source.
5. Browser automation o Computer Use autorizado.
6. Nuevo connector/MCP/adapter por FACT-001 solo si existe gap real documentado.

## Seguridad
- Secretos nunca en prompts, logs, repositorios, Notion o tablas generales.
- Motores y connectors consumen `CredentialRef` o credenciales temporales; nunca copias indiscriminadas de secretos.
- RBAC/ABAC, mínimo privilegio, rotación, revocación, expiración y auditoría.
- Kill switch global y por identidad/cuenta/connector.
- Separación LAB/PREPROD/PROD y Trading LAB aislado.
- No eludir CAPTCHA, MFA, controles antiabuso ni restricciones de plataforma.
- Backups solo cuando sea seguro y nunca copiando secretos a destinos inseguros.

## Data contract mínimo
`Identity(identity_id, owner_type, owner_id, company_id, display_name, status, policy_set)`

`Account(account_id, identity_id, provider, handle/email, login_method, purpose, environment, status, verified_at)`

`CredentialRef(credential_ref_id, account_id, vault_provider, secret_path/ref, scopes, expires_at, rotation_policy)`; `secret_value` queda prohibido en registros generales.

`Connector(connector_id, type, provider, version, permissions, cost_class, status)`, con `type ∈ {API,MCP,SCRIPT,BROWSER,COMPUTER_USE}`.

`Execution(request_id, company_id, identity_id, account_id, engine_id, connector_id, action, policy_result, result, evidence_ref, cost, timestamp)`.

## Loop operativo objetivo
`DESCUBRIR → ENTENDER → PLANIFICAR → SELECCIONAR HERRAMIENTA/IDENTIDAD → OBTENER CREDENCIAL AUTORIZADA → EJECUTAR → VERIFICAR → CORREGIR/REINTENTAR → REGISTRAR → APRENDER → SUPERVISAR`.

## HUMAN_REQUIRED
Solo razones canónicas: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## Gates de promoción
Inventario/dependencias → threat model/permisos → contratos de datos/acciones → tests unitarios/integración/e2e → LAB/alcance mínimo → PREPROD → observabilidad/auditoría → rollback/revocación/rebuild → coste medido/hard-cost guard → tribunal/evaluación → promoción gradual.

Rollout objetivo: `3–4 cuentas reales → estabilidad → siguiente cuenta → al menos 10 → escalar según necesidad`.

## Criterios de aceptación V0
- 3–4 cuentas reales incorporables sin mezcla de identidades ni secretos.
- Método de acceso y estado de sesión identificables.
- Credenciales consumidas mediante broker/vault.
- Al menos una ruta API/MCP y una browser/computer-use controlada en LAB.
- Connector faltante generable por Factory y testeable.
- Tarea multicuentas autorizada ejecutable y verificable.
- Sesión expirada resuelta mediante renovación/fallback/HUMAN_REQUIRED correcto.
- Soporte estructural de al menos 10 cuentas sin rediseño.
- Kill switch, auditoría y revocación.
- Ningún gasto no aprobado, spam, cuentas falsas, engaño de identidad o evasión de controles.

## Estado
- `DEFINIDO`: requisitos de este addendum.
- `PLANIFICADO`: Identity & Access Registry, Credential Broker/Vault, Connector/MCP Registry, Browser/Computer-Use Runtime, Account Lifecycle, Multi-Account Orchestrator.
- `POR_AUDITAR`: cuentas actuales, sesiones, gestores de contraseñas, perfiles de navegador, proveedores y métodos de login existentes.
- `NO_OPERATIVO_POR_DEFECTO`: no afirmar extracción/control/creación autónoma de cuentas hasta implementación, permisos y tests.

## Integración con el loop actual
Este registro se incorpora en paralelo. No modifica ni bloquea el PR/orquestador Digital Build actualmente en gate. Antes de asignar nuevos `engine_id`, debe ejecutarse auditoría de solapamiento contra los 177 motores canónicos y reutilizar/envolver capacidades existentes cuando sea posible.
