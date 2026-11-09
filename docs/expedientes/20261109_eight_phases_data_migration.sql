-- CEREBRO OS · Migración reversible de fases, 2026-11-09.
-- Ejecutar SOLAMENTE tras QA verde, con reserva de rollback del despliegue actual.
-- No borra ni sustituye notas, payload ni historial.
begin;
do $$
declare v_total int; v_legacy int; v_active int;
begin
  select count(*) into v_total from fenix_prod.expedientes;
  select count(*) into v_legacy from fenix_prod.expedientes where stage in ('Análisis','Oferta');
  select count(*) into v_active from fenix_prod.expedientes e where public.fenix_prod_expediente_is_active(e.stage,false);
  if v_total <> 50 or v_legacy <> 4 then
    raise exception 'PRECONDITION_FAILED: total %, legacy % (expected 50 and 4)',v_total,v_legacy;
  end if;
end $$;
with original as materialized (
 select e.expediente_code,e.stage,e.version,e.updated_at
 from fenix_prod.expedientes e
 where e.stage in ('Análisis','Oferta')
 for update
), updated as (
 update fenix_prod.expedientes e
 set stage=case when o.stage='Análisis' then 'Documentación' else 'FEIN' end,
     version=e.version+1,
     updated_at=now(),
     payload_operacion=jsonb_set(
       coalesce(e.payload_operacion,'{}'::jsonb),
       '{cerebro_fases_v2}',
       coalesce(e.payload_operacion->'cerebro_fases_v2','{}'::jsonb)
       || jsonb_build_object('subpaso',o.stage,'fase_origen',o.stage,'version_origen',o.version,
          'version_tras_migracion',o.version+1,'updated_at_origen',o.updated_at,
          'migration_id','expedientes_8_phases_20261109'),
       true
     )
 from original o
 where e.expediente_code=o.expediente_code and e.version=o.version
 returning e.expediente_code,o.stage as old_stage,e.stage as new_stage
)
insert into fenix_prod.expediente_stage_history(expediente_code,actor_code,from_stage,to_stage,source)
select expediente_code,'CARLOS-ADMIN',old_stage,new_stage,'phase_hierarchy_20261109' from updated;
do $$
declare v_legacy int;v_marked int;
begin
 select count(*) into v_legacy from fenix_prod.expedientes where stage in ('Análisis','Oferta');
 select count(*) into v_marked from fenix_prod.expedientes
 where payload_operacion->'cerebro_fases_v2'->>'migration_id'='expedientes_8_phases_20261109'
   and stage in ('Documentación','FEIN');
 if v_legacy<>0 or v_marked<>4 then
   raise exception 'MIGRATION_VERIFY_FAILED: legacy %, marked %',v_legacy,v_marked;
 end if;
end $$;
commit;
