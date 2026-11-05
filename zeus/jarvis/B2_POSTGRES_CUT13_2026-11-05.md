# ZEUS · JARVIS CUT13 · B2 HMAC → PostgreSQL aislado
Fecha: 2026-11-05
Estado: IMPLEMENTADO_EN_RAMA / QA_CI_EN_CURSO / PROD_NO_GO

## Cambios en PR #25 (sin fusionar)
- core/jarvis-b2-postgres-lookup.mjs: SELECT parametrizado por canal y HMAC, una única fila aceptable, fail-closed, LAB-only.
- core/jarvis-b2-postgres-lookup.test.mjs: seguridad del SQL, denegación por duplicados, caída DB, suplantación, revocación, integración con resolver HMAC de CUT12.
- gates/20261105_cut13_b2_isolated_lab_schema.sql: candidata para PostgreSQL temporal, esquema independiente, RLS ENABLE+FORCE, sin políticas/grants de acceso por defecto, sin altas de propietario.
- gates/cut13_lab_pg_acceptance.sh: fixture sintético, rol lector sin escritura, snapshot pg_dump, restauración a otra DB del mismo servicio temporal.
- .github/workflows/jarvis-cut13-b2-pg-lab.yml: PostgreSQL 17 efímero en GitHub Actions, Node 22, tests y restore.

## Evidencias y límites
- Consultas GitHub: PR #25 abierta y DRAFT, head 0a4115c210427c087f5078727c318b9f748d06d9.
- Se han observado in_progress las suites JARVIS Universal Core, B4, B7 y Governed Main Integration para ese head; no se declara PASS hasta conclusión.
- La ejecución de workflow dedicado CUT13 todavía debe comprobarse; el número 551 PASS histórico se refiere a CUT11, no al head actual.
- Ninguna conexión a datos PROD, ninguna migración aplicada; no hay vinculación de una identidad humana, secreto Vault ni E2E real.
- El test PostgreSQL temporal no demuestra persistencia de un servicio 24/7 ni recuperación ante reinicio real.
- CUT13 no instala ni certifica una tabla de identidad de PROD. El SQL anterior en public permanece intacto.
- No se usó API de IA ni se añadieron suscripciones; pueden consumirse minutos de Actions ya disponibles.

## Siguiente bloqueo P0
1. Certificar CUT13 con CI y PostgreSQL temporal/restauración, corregir solo fallos de ese ámbito.
2. Elegir/habilitar infraestructura LAB persistente aprobada, con copia probada y aislamiento comprobado, sin reutilizar PROD por conveniencia.
3. Conectar Vault/HMAC de servidor, role reader y resolver de identidad real bajo flag OFF; registrar únicamente tras prueba de sesión OWNER_ROOT auténtica.
4. Dos dispositivos reales, revocación entre sesiones, store de misiones durable, auditoría, B10/tribunal, OLD vs NEW y rollback.
5. Solo entonces promover gradualmente controles autorizados sin exponer App/CRM legacy.

## GATE
PROD NO-GO. B3/B4 kill switch ON. No merge, no deploy, no nuevos grants, ningún secreto creado.
Rollback: revertir exclusivamente los cinco artefactos de CUT13 en la PR DRAFT; no hay reversión de DB PROD porque no se ha tocado.
