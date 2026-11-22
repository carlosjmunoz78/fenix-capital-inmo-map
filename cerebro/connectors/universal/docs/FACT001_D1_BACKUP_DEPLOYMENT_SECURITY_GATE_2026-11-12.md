# FACT-001 · Cloudflare D1 real backup · Gate de despliegue seguro (12 Nov 2026)

## Orden del propietario

El propietario ha autorizado expresamente la recuperación permanente de la D1 LAB y el despliegue del motor. **La autorización existe**, pero **no sustituye el control de seguridad de la plataforma**. Dos intentos del conector Supabase de promover el backend sensible fueron bloqueados por los controles de seguridad de OpenAI. **No continuar mediante otro conector, navegador, runner, SQL ni herramienta alternativa para eludir el bloqueo.**

## Identidad de los recursos verificados por API

- Cloudflare cuenta: `e39a57e1ac42650ca5a6d5307cf0ac8e`.
- D1 LAB: `cerebro-fact001-recovery-lab-eu`, UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, jurisdiction `eu`. Metadato Cloudflare API `version=production` corresponde al tipo de instancia D1 del proveedor, **no autoriza** promoción de CEREBRO LAB a CEREBRO PROD.
- Token existente `CEREBRO-FACT001-GATEWAY-RECOVERY-D1-WRITE-LAB-20261111`: `active`, caducidad `2026-12-11T00:00:00Z`; ref nominal en Supabase Vault `cerebro_cf_gateway_recovery_d1_write_lab_20261111`. No se ha leído ni publicado el secreto.
- Clave AES-256 LAB dedicada: `cerebro_fact001_d1_backup_aes256_lab_v1`, Vault existente; no hay escrow independiente ni clave exportada.
- Edge independiente `cerebro-fact001-d1-backup-seal-lab`: v1 `ACTIVE` **INERTE (404)**, SHA256 `a7b8ea376ab5f5e769c9573f268c8463641d1d14ed017d438949f0bef4c2a86c`. **El candidato firmado v2 NO está desplegado**.
- Fuente candidata GitHub commit `5a6952872023a5fba5a83842340e5b89e97fef92`: token D1 Write desde Vault, SQL parametrizado, borrado de key en `finally`. GitHub Security CI [#43126052486](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43126052486) SUCCESS. Fuente aprobada por CI **NO** implica despliegue autorizado o funcionalidad end-to-end.
- Drive privado: carpeta `FACT-001 · D1 · BACKUPS CIFRADOS LAB`, ID `1ho4w2YufG7C_iRgN9iATtERyPTgnXBPR`. Contiene exclusivamente subcarpeta `PRUEBAS SINTÉTICAS · NO ES BACKUP REAL`. No copia real D1.
- PR [#44](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/44) **DRAFT, nunca fusionar para desbloquear esto**.

## Gates obligatorios y no eludibles

1. **HUMAN_REQUIRED: SECURITY_INCIDENT / POLICY_CONFLICT** según interpretación y revisión del rechazo. Obtener resolución explícita del control de despliegue por canal autorizado; no repetir la llamada bloqueada ni cambiar de canal para evitarla.
2. **Export D1 bloquea temporalmente consultas** mientras está en progreso. Antes de activar: ventana segura o garantía de quiescencia del D1 LAB, inventario de trabajos dependientes, supervisor y rollback. No exportar en presencia de jobs críticos.
3. Revisar necesidad y alcance de **reutilizar** el token D1 Write ya usado por Gateway. El token es account-scoped, de alcance amplio. El candidato limita la ruta por UUID, pero eso **no convierte al token en permiso por base de datos**; evaluar credencial segregada bajo política, sin emitir o revelar secretos al chat.
4. Validar acceso de ejecución del Edge a Vault y compatibilidad de `SUPABASE_DB_URL` del entorno sin mostrar claves. Verificar que JWT de Supabase se desactiva sólo para función que valida OIDC propia firmada, `issuer/audience/repo/branch/event/workflow/actor` exactos y negativos 401/403 antes de tocar Vault.
5. Antes de ejecutar la orden `once`, probar una solicitud OIDC firmada al `health` de la v2, negativa 401 sin token y sin petición de exportar; error -> rollback **sólo del nuevo slug** a la baseline v1, no tocar otras functions.
6. Export D1 **sin SQL en logs ni chat**, cifrado AES-256-GCM dentro del backend; salida solo envelope cifrado con AAD 4D+UUID D1, tamaño, SHA256. Verificar cumplimiento presupuestario y si el endpoint de export ofrece una URL firmada dentro de dominio seguro realmente soportado.
7. Una única orden GH firmada con límites; evidencia de ciphertext, sin secretos en artefacto; Drive privado, readback con SHA256 y permisos, restore SQLite aislada desde bytes de Drive; rollback probado del slug.
8. **Escrow independiente de la clave real** fuera de Supabase Vault, realizado mediante custodia segura aprobada por el propietario. Sin esa custodia, recuperación tras pérdida del propio proyecto Vault no está garantizada.
9. Registrar evidencia verificable en Registry, contracts, runbook, changelog, observabilidad/coste y estado de autonomía. Nunca declarar `backup_and_rollback=VERIFIED` ni FULL hasta cumplir 1-8.

## Estado de aceptación

| Gate | Estado |
|---|---|
| Código, CI criptografía y contrato OIDC | VERIFIED (candidate only) |
| D1 destino y token activo | VERIFIED (metadata only) |
| EDGE v2 firmado desplegado | BLOCKED_SECURITY |
| Cloudflare D1 real exportada y cifrada | NOT_STARTED |
| Drive copia cifrada real y readback | NOT_STARTED |
| SQLite recuperación aislada de D1 real | NOT_STARTED |
| Key escrow independiente | NOT_STARTED |
| Coste contractual adicional | Sin nuevas suscripciones; cuotas de uso por medir |
| App / CRM / main / DNS | Intactos por esta misión |
| backup_and_rollback | **PENDING** |
