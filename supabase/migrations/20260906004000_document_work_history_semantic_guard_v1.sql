create or replace function fenix_prod.document_intelligence_work_history_guard()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog','fenix_prod','public','pg_temp'
as $$
declare
  v_family text;
  v_bad_antig text;
begin
  v_family := coalesce(new.extraction->>'document_family','');
  if v_family = 'work_history' then
    v_bad_antig := new.extraction->'fields'->>'antiguedad_laboral';
    new.extraction := ((new.extraction #- '{fields,antiguedad_laboral}') #- '{fields,fecha_inicio_contrato}') #- '{fields,fecha_fin_contrato}';
    if new.expediente_code is not null and v_bad_antig is not null then
      update fenix_prod.expedientes
         set payload_operacion = payload_operacion - 'antiguedad_laboral'
       where expediente_code = new.expediente_code
         and payload_operacion->>'antiguedad_laboral' = v_bad_antig;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_intelligence_work_history_guard on fenix_prod.document_intelligence_runs;
create trigger trg_document_intelligence_work_history_guard
before insert or update of extraction,status on fenix_prod.document_intelligence_runs
for each row
when (new.extraction is not null)
execute function fenix_prod.document_intelligence_work_history_guard();

revoke all on function fenix_prod.document_intelligence_work_history_guard() from public,anon,authenticated;
