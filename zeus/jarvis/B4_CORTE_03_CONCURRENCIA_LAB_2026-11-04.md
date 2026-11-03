# ZEUS/JARVIS · B4 CORTE 03 · Concurrencia de memoria (LAB)
Fecha: 2026-11-04 · Estado: **PARCIAL / LAB GREEN / PROD LOCKED**.

## Evidencia canónica
- PR #14 (draft), HEAD anterior a este acta `91a18032eb22b080fa96d43ec290702fa509ca73`.
- JARVIS Universal Core LAB Tests `41737472472`: **98/98 PASS**, 0 fallos.
- CEREBRO Governed Main Integration V0 `41737472515`: SUCCESS.
- `PRJ-SUPERAGENT-001` registrado en PROD como PARCIAL, 30 evidencias auditadas.
- Supabase `cluhljgonannaafpmblx`: B3 y B4 `enabled=false; kill_switch=true`; B4 0 eventos. Esquemas anteriores no alterados.

## Resultados de este ciclo
1. `B4MemoryLabStore.appendUnique`: la sección crítica sin `await` aplica idempotencia y unicidad por `targetId` ante CORRECTION/REVOCATION y por `missionId + checkpoint.sequence`; ante carrera se rechaza la segunda escritura. Estas garantías son exclusivamente de LAB.
2. El adaptador PostgreSQL traduce violación `23505` de un índice único a `B4_CONCURRENT_STATE_CONFLICT`: fail-closed, sin reintento de mutación.
3. Se añade el candidato `gates/20261104_jarvis_b4_concurrency_unique_indexes_candidate.sql` con dos índices parciales scope-bound, **NO APLICADOS A PROD**.
4. La PR #14 refleja ahora el estado físico correcto de la migración B4 previa, y no afirma que los índices nuevos estén instalados.

## Gates para promover el candidato
- Auditar y realizar backup físico/restore probados de la tabla B4 existente, aunque tenga 0 eventos.
- Validar que los índices no colisionan con datos o clientes externos; revisar duplicados y rendimiento.
- Ejecución concurrente real con 2 conexiones PostgreSQL en un runtime aislado, preferiblemente mismo motor/versión que PROD, al menos 10 carreras por cada tipo: corrección/corrección, corrección/revocación, checkpoint/checkpoint, idempotent replay.
- Probar reconexión, corrupción/interrupción controlada, recuperación con recibo sin efectos duplicados.
- Identidad OWNER_ROOT B2 y permisos efectivos B3, más auditoría y revocación real; no basta con CI LAB.
- Privacidad y borrado legítimo, retención y TTL; no activar memoria sin ellos.

## Prevención de daño
No fusionar PR #14, no cambiar B3/B4 flags ni grants, no desplegar el SQL candidato, no tocar App/CRM. La salida segura si se interrumpe es continuar con ambas capas bloqueadas.

## Runbook de reversión
- Código: revertir únicamente los commits B4 en la rama aislada; PR #13 y `main` se conservan.
- PROD: no borrar tablas. Mantener los dos kill switches activos; comprobar RLS, roles y 0 eventos.
- Índices nuevos: no existen en PROD; no requieren rollback físico. Su futura retirada requerirá backup y aprobación de cambio.
- Recuperación completa de desastre no certificada: un manifiesto de esquema o CI verde no equivalen a backup restaurado.

`next_block=B4_CUT_04_REAL_POSTGRES_MULTIPROCESS_PROOF_AND_BACKUP_RESTORE`.
