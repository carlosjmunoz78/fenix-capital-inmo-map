-- Solo rollback controlado de los 4 casos exactos, si NO han sido editados tras migración.
-- No ejecutar automáticamente si ya han existido cambios operativos posteriores.
begin;
do $$
declare v_expected int;
begin
 select count(*) into v_expected
 from fenix_prod.expedientes
 where payload_operacion->'cerebro_fases_v2'->>'migration_id'='expedientes_8_phases_20261109'
   and version=(payload_operacion->'cerebro_fases_v2'->>'version_tras_migracion')::int;
 if v_expected<>4 then
   raise exception 'ROLLBACK_ABORTED: changed records or missing snapshot, current eligible %',v_expected;
 end if;
end $$;
with original as materialized (
 select expediente_code,stage,version,payload_operacion,
        payload_operacion->'cerebro_fases_v2'->>'fase_origen' as old_stage,
        (payload_operacion->'cerebro_fases_v2'->>'updated_at_origen')::timestamptz as old_updated
 from fenix_prod.expedientes
 where payload_operacion->'cerebro_fases_v2'->>'migration_id'='expedientes_8_phases_20261109'
 for update
), updated as (
 update fenix_prod.expedientes e
 set stage=o.old_stage,
     version=e.version+1,
     updated_at=o.old_updated,
     payload_operacion=jsonb_set(e.payload_operacion,'{cerebro_fases_v2}',
       coalesce(e.payload_operacion->'cerebro_fases_v2','{}'::jsonb) || '{"rolled_back":true}'::jsonb,true)
 from original o
 where e.expediente_code=o.expediente_code and e.version=o.version
 returning e.expediente_code,o.stage as from_stage,e.stage as to_stage
)
insert into fenix_prod.expediente_stage_history(expediente_code,actor_code,from_stage,to_stage,source)
select expediente_code,'CARLOS-ADMIN',from_stage,to_stage,'phase_hierarchy_rollback_20261109' from updated;
commit;
