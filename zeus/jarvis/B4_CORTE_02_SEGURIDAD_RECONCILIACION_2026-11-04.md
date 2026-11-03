# ZEUS / JARVIS · B4 · CORTE 02 — conciliación física y doble autorización
Fecha: 2026-11-04 (Europe/Madrid)
Estado: **PARCIAL / LAB VERIFIED / PROD INSTALLED LOCKED / NOT_OPERATIONAL**

## RECTIFICACIÓN documentada del corte 01
El corte 01 decía que el SQL B4 no se había aplicado. **Esa información quedó desactualizada** tras el corte: inventario vivo confirmó la migración `20261103225907 / jarvis_b4_private_memory_events_locked_v0`, instalada en Supabase PROD `cluhljgonannaafpmblx`. Se conserva el acta histórica y esta rectificación acredita el estado actual.

Tablas reales privadas `zeus_jarvis.b4_memory_control` y `zeus_jarvis.b4_memory_event`, con RLS + FORCE RLS, sin USAGE de esquema ni SELECT para `anon` o `authenticated`. Eventos en tabla = **0**. En `fenix/PROD`, `b4_memory_control.enabled=false`, `kill_switch=true`. El control B3 también continúa `enabled=false / kill_switch=true`. No hay lectura/escritura abierta al público. No se ha modificado App, CRM ni datos heredados.

## CONTRATO NUEVO: doble cierre antes de escribir/leer en PROD
- `createJarvisB4GuardedControlStore`: obtiene en una consulta parametrizada los controles B3 y B4, para la misma empresa y entorno. Permite `enabled=true` únicamente si **ambos** están habilitados y los dos kill switches desactivados; cualquier control ausente cierra acceso.
- `createJarvisB4Memory` en `PROD`: además requiere `b3PolicyService.authorize` (sistema de decisiones B3 con identity/grants/audit de servidor), con permisos granulares **`JARVIS_MEMORY_APPEND`** y **`JARVIS_MEMORY_READ`**. Falta de servicio, DENY o fallo de auditoría => acceso denegado.
- Las pruebas usan proveedores simulados y no suponen que exista un OWNER_ROOT autenticado ni grants reales. El catálogo confiable de acciones B3 y grants reales siguen sin activar. No conectar un adapter de pruebas a PROD.
- El código mantiene scopes `ownerId + companyId + environment + projectId`; la memoria con contenido, sus referencias y borrados legítimos requieren contrato de privacidad/retención antes de activar.

## Evidencia y límites
- GitHub Draft PR #14, base PR #13 (no fusionadas), commits incrementales de doble gate y política B3 obligatoria.
- CI de la primera mejora de doble gate: run `41736388675`, **90/90 PASS**, y `41736388661` CEREBRO Governed Main Integration SUCCESS.
- Suite complementaria de autorización granular presentada para nuevo CI; registrar su run final antes de elevar estado.
- La migración ya existe; **no repetirla**.
- No se ha ejecutado aún E2E autenticado PC+móvil, reinicio/cross-process contra PostgreSQL real, restore de snapshot, auditoría independiente ni borrado material RGPD.

## Rollback / recuperación
1. No activar `enabled` ni poner `kill_switch=false` en B3/B4.
2. Con rollback de código, revertir commits exclusivos de PR #14 **sin fusionar PR #13 ni tocar main**.
3. Con rollback de esquema, **no hacer DROP automático**: el esquema instalado permanece cerrado e inerte para no destruir evidencias. Cualquier eliminación posterior requiere backup físico, prueba de restauración y revisión de dependencias.
4. Antes de escribir registros sintéticos en la tabla instalada verificar copia de seguridad/restauración completa. Ninguna simulación sin snapshot debe declararse como prueba física de restore.
5. Comprobar `b3_runtime_control`, `b4_memory_control`, cuentas de eventos, permisos y RLS tras cada cambio.

## Dependencias bloqueantes
- B2: identidad OWNER_ROOT real, token/sesión verificada, persistencia de misiones, E2E dos dispositivos/reinicio.
- B3: grants y revocación reales, acción confiable y auditoría; conservar kill switch ON.
- B4: almacenamiento durable y persistencia multi-proceso E2E, pruebas concurrentes de corrección y checkpoints con conciliación de recibos, backup físico/restauración, RLS/revisión de privilegios, privacidad, observabilidad, costes.
- Solo preparar B5 documentalmente; B4 permanece PARCIAL.

## Estado
`next_block=B4_CUT_03_DURABLE_CONCURRENCY_BACKUP_RESTORE_AND_AUTHENTICATED_E2E`.
Sin nuevas suscripciones ni consumo DeepSeek. No afirmar PROD operativo por la presencia de tablas o CI.
