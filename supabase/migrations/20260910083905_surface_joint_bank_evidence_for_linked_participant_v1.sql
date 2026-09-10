-- Source-control snapshot of PROD participant evidence projection, including shared bank evidence.

create or replace function public.fenix_prod_participant_evidence_profile(p_exp_code text,p_cliente_code text)
returns jsonb
language sql
stable
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $function$
with person as (
  select c.cliente_code,c.nombre,c.apellidos,c.dni_nie,e.id as expediente_id,e.payload_operacion
  from fenix_prod.clientes c
  join fenix_prod.expediente_personas ep on ep.cliente_code=c.cliente_code and ep.active
  join fenix_prod.expedientes e on e.expediente_code=ep.expediente_code
  where c.cliente_code=p_cliente_code and e.expediente_code=p_exp_code and c.active
  limit 1
), op as (
 select x.item from person p cross join lateral jsonb_array_elements(coalesce(p.payload_operacion->'intervinientes','[]'::jsonb)) x(item)
 where (p.dni_nie is not null and upper(regexp_replace(coalesce(x.item->>'dni_nie',''),'[^A-Z0-9]','','g'))=upper(regexp_replace(p.dni_nie,'[^A-Z0-9]','','g')))
    or (lower(coalesce(x.item->>'nombre',''))=lower(coalesce(p.nombre,'')) and lower(coalesce(x.item->>'apellidos',''))=lower(coalesce(p.apellidos,''))) limit 1
), docs as (
  select d.id,d.document_code,d.title,r.extraction,r.status as extraction_status,r.updated_at,
         lower(coalesce(r.extraction->>'document_family','')) family,
         lower(regexp_replace(coalesce(r.extraction->>'person',''),'[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+',' ','g')) person_norm,
         lower(regexp_replace(coalesce(r.extraction->>'summary',''),'[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+',' ','g')) summary_norm,
         upper(regexp_replace(coalesce(r.extraction->'fields'->>'documento_identidad',''),'[^A-Z0-9]','','g')) extracted_dni,
         exists(select 1 from fenix_prod.document_origin_links ol cross join person pp where ol.document_id=d.id and ol.origin_type='comprador' and ol.origin_code=pp.cliente_code) origin_match
  from person p join fenix_prod.documentos d on d.expediente_id=p.expediente_id
  left join lateral (
    select rr.extraction,rr.status,rr.updated_at from fenix_prod.document_intelligence_runs rr
    where rr.document_id=d.id and rr.extraction is not null and rr.status in ('applied','needs_review') order by rr.updated_at desc limit 1
  ) r on true
), matched as (
  select d.*,
    case
      when p.dni_nie is not null and d.extracted_dni=upper(regexp_replace(p.dni_nie,'[^A-Z0-9]','','g')) then 'direct_identity'
      when d.extraction is not null and length(trim(coalesce(p.nombre,'')))>=3 and d.person_norm like '%'||lower(trim(p.nombre))||'%' and length(trim(coalesce(p.apellidos,'')))>=3 and d.person_norm like '%'||lower(split_part(trim(p.apellidos),' ',1))||'%' then 'direct_identity'
      when d.extraction is null and length(trim(coalesce(p.nombre,'')))>=4 and lower(d.title) like '%'||lower(trim(p.nombre))||'%' and lower(d.title) not like '% y %' then 'filename_identity'
      when d.origin_match and d.family in ('bank_statement','bank_certificate') and length(trim(coalesce(p.nombre,'')))>=3 and d.summary_norm like '%'||lower(trim(p.nombre))||'%' and (coalesce(trim(p.apellidos),'')='' or d.summary_norm like '%'||lower(split_part(trim(p.apellidos),' ',1))||'%') then 'shared_bank_evidence'
    end evidence_relation
  from docs d cross join person p
  where (p.dni_nie is not null and d.extracted_dni=upper(regexp_replace(p.dni_nie,'[^A-Z0-9]','','g')))
     or (d.extraction is not null and length(trim(coalesce(p.nombre,'')))>=3 and d.person_norm like '%'||lower(trim(p.nombre))||'%' and length(trim(coalesce(p.apellidos,'')))>=3 and d.person_norm like '%'||lower(split_part(trim(p.apellidos),' ',1))||'%')
     or (d.extraction is null and length(trim(coalesce(p.nombre,'')))>=4 and lower(d.title) like '%'||lower(trim(p.nombre))||'%' and lower(d.title) not like '% y %')
     or (d.origin_match and d.family in ('bank_statement','bank_certificate') and length(trim(coalesce(p.nombre,'')))>=3 and d.summary_norm like '%'||lower(trim(p.nombre))||'%' and (coalesce(trim(p.apellidos),'')='' or d.summary_norm like '%'||lower(split_part(trim(p.apellidos),' ',1))||'%'))
), extracted as (select * from matched where extraction is not null)
select jsonb_strip_nulls(jsonb_build_object(
 'documentos',(select coalesce(jsonb_agg(jsonb_build_object('document_code',document_code,'title',title,'analysis_state',case when extraction is null then 'Por extraer' else case when extraction_status='needs_review' then 'Revisar extracción' else 'Confirmado' end end,'evidence_relation',evidence_relation) order by coalesce(updated_at,'epoch'::timestamptz) desc,title),'[]'::jsonb) from matched),
 'fecha_nacimiento',coalesce((select extraction->'fields'->>'fecha_nacimiento' from extracted where extraction->'fields'->>'fecha_nacimiento' is not null order by case when family='identity' then 0 else 1 end,updated_at desc limit 1),(select item->>'fecha_nacimiento' from op)),
 'nacionalidad',coalesce((select extraction->'fields'->>'nacionalidad' from extracted where extraction->'fields'->>'nacionalidad' is not null order by case when family='identity' then 0 else 1 end,updated_at desc limit 1),(select item->>'nacionalidad' from op)),
 'residencia',(select item->>'residencia' from op),
 'estado_civil',coalesce((select extraction->'fields'->>'estado_civil' from extracted where extraction->'fields'->>'estado_civil' is not null order by updated_at desc limit 1),(select item->>'estado_civil' from op)),
 'regimen_matrimonial',(select item->>'regimen_matrimonial' from op),'hijos',(select item->>'hijos' from op),
 'empresa_organismo',coalesce((select extraction->'fields'->>'empresa' from extracted where extraction->'fields'->>'empresa' is not null order by case when family='employment_contract' then 0 when family='payroll' then 1 else 2 end,updated_at desc limit 1),(select item->>'empresa_organismo' from op)),
 'antiguedad_laboral',coalesce((select coalesce(extraction->'fields'->>'antiguedad_laboral',extraction->'fields'->>'fecha_alta_actual',extraction->'fields'->>'fecha_inicio_contrato') from extracted where coalesce(extraction->'fields'->>'antiguedad_laboral',extraction->'fields'->>'fecha_alta_actual',extraction->'fields'->>'fecha_inicio_contrato') is not null order by case when family='employment_contract' then 0 else 1 end,updated_at desc limit 1),(select item->>'antiguedad_laboral' from op)),
 'situacion_laboral',coalesce((select case when lower(coalesce(extraction->'fields'->>'tipo_contrato','')) like '%indefin%' then 'Asalariado indefinido' when lower(coalesce(extraction->'fields'->>'tipo_contrato','')) like '%temporal%' then 'Asalariado temporal' when lower(coalesce(extraction->'fields'->>'situacion_laboral_actual','')) in ('activo','activa') and extraction->'fields'->>'empresa' is not null then 'Asalariado' else null end from extracted where family in ('employment_contract','payroll','work_history') order by case when family='employment_contract' then 0 when family='work_history' then 1 else 2 end,updated_at desc limit 1),(select item->>'situacion_laboral' from op)),
 'sueldo_neto_mensual',coalesce((select extraction->'fields'->>'ingresos_netos_mensuales' from extracted where extraction->'fields'->>'ingresos_netos_mensuales' ~ '^[0-9]+([.][0-9]+)?$' order by case when family='payroll' then 0 else 1 end,updated_at desc limit 1),(select item->>'sueldo_neto_mensual' from op)),
 'numero_pagas',(select item->>'numero_pagas' from op),'deudas_mensuales',(select item->>'deudas_mensuales' from op),'tarjetas_otras_cuotas',(select item->>'tarjetas_otras_cuotas' from op),'ahorro_disponible',(select item->>'ahorro_disponible' from op),'origen_fondos',(select item->>'origen_fondos' from op),'aportado_operacion',(select item->>'aportado_operacion' from op)
));
$function$;

revoke execute on function public.fenix_prod_participant_evidence_profile(text,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_participant_evidence_profile(text,text) to service_role;
