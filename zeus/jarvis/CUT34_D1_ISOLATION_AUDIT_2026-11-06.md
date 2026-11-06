# CEREBRO OS · JARVIS CUT34 · D1 aislada para CUT33

**Fecha:** 2026-11-06 · **company_id:** fenix · **engine_id:** JARVIS · **environment:** LAB · **version:** CUT34_PREPARED.
**Estado:** HECHO inventario, plantilla fail-closed y gate offline. PENDIENTE alta física de D1, snapshot/export, migraciones, binding remoto y tests E2E. PROD NO-GO.

## Inventario Cloudflare físico (solo lectura)

Cuenta Cloudflare: e39a57e1ac42650ca5a6d5307cf0ac8e. Plan Zero Trust Free confirmado; D1 Free permite hasta 10 bases según documentación oficial.

| DB | UUID | Estado |
|---|---|---|
| cerebro-jarvis-lab-eu | 988b11e1-21aa-4cf9-8b9d-110319df7ccc | Fuente LAB EU: PROTEGIDA |
| cerebro-jarvis-lab-eu-restore-cut32 | 8f966fb3-32db-43a0-aa55-67f88616a522 | Restore CUT32: PROTEGIDA |
| cerebro-jarvis-lab-eu-restore-cut29 | c446f17c-c26d-4c76-a3ea-f62c843d461b | Restore CUT29: PROTEGIDA |
| cerebro-jarvis-lab-cut21 | a859fde1-126b-4c40-bc0d-aec2f8839f7b | Histórico: PROTEGIDO |

Panel de Cloudflare: fuente y restore CUT32 con jurisdicción Unión Europea, replicación de lectura deshabilitada. Las copias previas deben conservarse; no están certificadas como restauración de sesiones reales de producción.

## Contratos y dependencias

- El Worker paralelo remoto cerebro-jarvis-cut32-lab-eu tiene el binding privado JARVIS_LAB_DB conectado actualmente a la fuente EU (988b...). Es una dependencia real; no existe aislamiento de datos entre candidato CUT33 y fuente.
- El Worker original cerebro-jarvis-lab-eu mostraba 'Sin vinculaciones conectadas' de D1 en su panel; ello NO prueba ausencia de consumidores externos o indirectos. No tocar Worker original, sus rutas, versiones, Access o secretos.
- Código origen de PR #25: branch cerebro/jarvis-b3-owner-auth-hardening-lab-v0-20261105, HEAD d325cd7186dff6b65cb800de3aead670072a5a72, DRAFT y sin merge. El archivo wrangler-b2-parallel.staging.lab.jsonc apunta a fuente EU. CONSERVARLO SIN CAMBIOS.
- El código worker-b2-device-probe.mjs consume JARVIS_LAB_DB para verificación de sesión y posible inscripción B2. El binding lógico seguirá igual para no cambiar el contrato del código.
- Migraciones SQL aditivas candidatas 0001–0006 existentes. Fuente remota tenía evidencia previa de 0001–0005; 0006 no está acreditada en la fuente. Nunca aplicar a una base antigua. D1 SQLite no incorpora RLS PostgreSQL.
- CUT33 URL workers.dev y previews OFF; JARVIS_ACCESS_PROBE_ENABLED, JARVIS_B2_DEVICE_ENABLED, JARVIS_B2_ENROLLMENT_ENABLED, JARVIS_B2_B3_LIVE_ENABLED y JARVIS_GATEWAY_ENABLED todos false en la lectura remota.

## Nuevo almacenamiento reservado (NO CREADO)

**Nombre exacto:** cerebro-jarvis-cut33-lab-eu. **Jurisdicción:** eu (obligatoria al crear, no modificable después). **Read replication:** disabled. **Sin Worker vinculado inicialmente.** **Sin ruta pública.** Objetivo coste de nueva suscripción: 0 € dentro de Free, con consumos siempre medidos.

Archivos añadidos SOLO en esta rama separada:

- cloudflare-lab/wrangler-b2-parallel.cut34-isolated.TEMPLATE.json: referencia UUID intencionadamente inválido CUT34_UNPROVISIONED_DO_NOT_DEPLOY; NUNCA desplegar como está.
- cloudflare-lab/verify-cut34-d1-isolation.mjs: prueba determinista offline de Worker exacto, LAB/OFF, sin rutas, vínculo nuevo y bloqueo de todos los UUID protegidos; no llama Cloudflare ni escribe datos.

Comprobación: node zeus/jarvis/cloudflare-lab/verify-cut34-d1-isolation.mjs --template.
Tras crear y verificar la DB, hacer SOLO copia del template con UUID real nuevo, ejecutar --resolved PATH y comparar vieja/nueva antes de plantear un deploy separado.

## Gates requeridos antes de migración/despliegue

1. Inventariar consumidores y esquema real; conservar la fuente, CUT29, CUT32 e histórico. Verificar export/restore independientes antes de cualquier cambio a un Worker.
2. Crear **una sola quinta D1 nueva**, jurisdicción eu desde su creación y replicación disabled. Comprobar UUID distinto a los cuatro existentes; sin upgrade de plan.
3. Inspeccionar D1 recién creada: 0 tablas/sesiones, ninguna vinculación externa, no PII; hacer export basal y dejar rollback documentado.
4. Aplicar SOLO sobre la quinta D1 las migraciones 0001 a 0006 bajo permiso y backup, con lectura post-migración y restauración verificada sin tocar los 4 orígenes protegidos. Esperado 8 tablas, 6 índices, 6 triggers (verificar, no asumir).
5. Materializar configuración resuelta exclusivamente con UUID nuevo y superar gate local; ejecutar tests con datos sintéticos y comparar OLD vs NEW. Nunca actualizar el Worker viejo ni PROD.
6. Mantener Access propietario, URL OFF, B2/B3/Gateway OFF, PR25 DRAFT; no registrar dos dispositivos ni pasar a producción sin tribunal, rollback probado y permisos.

## Reversión y estados

- Rama nueva documental/candidata: reversible abandonándola; NO modifica main, PR25 ni despliegues.
- Estado ACTUAL: no se ha creado ni modificado una D1 desde esta rama. Físico D1 aislado PENDIENTE.
- Backups históricos y Time Travel no autorizan sobrescribir/restaurar sobre ninguna D1 protegida.

Documentación oficial: https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/d1/configuration/data-location/ ; https://developers.cloudflare.com/d1/reference/time-travel/
