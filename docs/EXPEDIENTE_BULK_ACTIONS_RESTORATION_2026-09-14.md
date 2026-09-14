# Expedientes · acciones masivas · evidencia de restauración · 2026-09-14

## Estado

- HECHO BACKEND: tabla aditiva `fenix_prod.expediente_action_notes`, RLS fail-closed y sin grants directos a usuarios.
- HECHO BACKEND: wrapper server-only `public.fenix_prod_exp_bulk_action_server(text,jsonb,text,text,text)`, ejecución solo `service_role`.
- HECHO BACKEND: Edge Function `fenix-expediente-actions` v1, `verify_jwt=true`, actor autenticado y máximo 100 registros.
- HECHO REHEARSAL: cambio de fase ensayado dentro de transacción y revertido con `ROLLBACK`; ningún expediente real quedó modificado por la prueba.
- HECHO UI EN RAMA: la cartera mantiene la vista enriquecida existente y la cruza con `/expedientes` del App Gateway para obtener `expediente_code + version` canónicos antes de habilitar una escritura masiva.
- HECHO UI EN RAMA: selección múltiple, seleccionar visibles vinculados, fase destino, comentario general, previsualización y confirmación explícita.
- HECHO BUILD: commit `e9efff2f0f73fc18be961df68e9cc6f65395fb7d`, workflow run `34844873073`, conclusion `success`.
- PENDIENTE PROD UI: PR #380 sigue aislado de `main`; la App pública no consume todavía esta interfaz.

## Atomicidad y concurrencia

El servidor valida el lote completo antes de cambiar una sola fila: existencia, ámbito por rol, `expected_version` y fase permitida. Un conflicto de versión devuelve 409 y cancela el lote antes de aplicar cambios.

Fases permitidas: Entrada, Documentación, Documentación incompleta, Documentación completa, Análisis, Tasación, Pre-OK + Tasación realizada, Tasación realizada, Notaría, Cierre, Finalizado, Baja, Pausado, Perdido y Revisión legado.

Cada cambio real de fase escribe también `fenix_prod.expediente_stage_history`. El comentario común se conserva aparte en `fenix_prod.expediente_action_notes`; no sobreescribe `expedientes.notas`.

## Seguridad

Después de la migración, el Security Advisor mantiene 16 warnings SECURITY DEFINER autenticados preexistentes. El nuevo wrapper no aparece porque `authenticated` no tiene EXECUTE directo. La nueva tabla aparece como RLS sin policy, intencionalmente fail-closed.

## Rollback

Desconectar primero UI/Edge Function. Después, si fuera necesario retirar la capacidad y una vez exportadas las notas que deban conservarse:

```sql
revoke execute on function public.fenix_prod_exp_bulk_action_server(text,jsonb,text,text,text) from service_role;
drop function if exists public.fenix_prod_exp_bulk_action_server(text,jsonb,text,text,text);
drop table if exists fenix_prod.expediente_action_notes;
```

No tocar durante rollback `fenix_prod.expedientes`, `fenix_prod.expediente_stage_history`, `fenix_prod_exp_update_server` ni los datos históricos.

## Aprendizaje CEREBRO App Factory

1. Una vista enriquecida externa puede mantenerse para UX, pero ninguna escritura masiva se habilita hasta reconciliarla con IDs y versiones del core transaccional.
2. Nunca sobreescribir un campo de notas de negocio para guardar un comentario masivo si se puede conservar como evento auditable independiente.
3. Las acciones por lote deben prevalidarse completas y ser all-or-nothing ante conflicto de versión.
4. Seleccionar todos significa seleccionar todos los registros visibles y vinculados al contrato transaccional, no registros que no puedan verificarse.
5. Vista, filtro, identidad canónica y contrato de mutación deben quedar explícitamente separados pero reconciliados.
