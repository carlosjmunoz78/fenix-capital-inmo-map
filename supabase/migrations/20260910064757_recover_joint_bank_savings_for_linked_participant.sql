-- Source-control snapshot of PROD joint-bank recovery logic.

create or replace function public.fenix_prod_recover_participant_read_failure_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public','fenix_prod'
as $function$
declare
  v_client text;
  v_exp text;
  v_result jsonb;
  v_safe_fields jsonb;
  v_family text;
  v_summary_norm text;
  v_holders_norm text;
  v_participant_norm text;
begin
  if new.status in ('failed','needs_review')
     and new.error in ('participant_read_failed','participant_identity_mismatch')
     and coalesce(new.extraction,'{}'::jsonb) ? 'fields' then

    select l.origin_code into v_client
      from fenix_prod.document_origin_links l
     where l.document_id=new.document_id and l.origin_type='comprador'
     order by l.created_at desc limit 1;

    if v_client is not null then
      select ep.expediente_code into v_exp
        from fenix_prod.expediente_personas ep
        join fenix_prod.expedientes e on e.expediente_code=ep.expediente_code
       where ep.cliente_code=v_client and ep.active
         and lower(coalesce(e.stage,'')) not in ('cerrado','cierre','finalizado','firmado','baja','perdido','pausado')
       order by ep.updated_at desc limit 1;

      if v_exp is not null then
        v_result := public.fenix_prod_recover_participant_extraction(new.document_id,v_client,v_exp,new.extraction->'fields');

        if coalesce((v_result->>'ok')::boolean,false) then
          new.status := 'applied';
          new.error := null;
          new.extraction := jsonb_set(coalesce(new.extraction,'{}'::jsonb),'{canonical_fields}',jsonb_build_object('ok',true,'recovered_from',coalesce(new.error,'participant_read_failed'),'participant_code',v_client,'expediente_code',v_exp,'changes',coalesce(v_result->'changes','{}'::jsonb)),true);

        elsif v_result->>'error'='participant_identity_mismatch' then
          v_family := lower(coalesce(new.extraction->>'document_family',''));
          select lower(regexp_replace(coalesce(c.nombre,'')||coalesce(c.apellidos,''),'[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]+','','g'))
            into v_participant_norm
            from fenix_prod.clientes c
           where c.cliente_code=v_client and c.active;

          v_summary_norm := lower(regexp_replace(coalesce(new.extraction->>'summary',''),'[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]+','','g'));
          v_holders_norm := lower(regexp_replace(coalesce(new.extraction->'fields'->>'titular_cuenta','')||' '||coalesce(new.extraction->'fields'->>'intervinientes',''),'[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]+','','g'));

          if v_family in ('bank_statement','bank_certificate')
             and coalesce(v_participant_norm,'')<>''
             and (v_summary_norm like '%'||v_participant_norm||'%' or v_holders_norm like '%'||v_participant_norm||'%') then
            v_safe_fields := (new.extraction->'fields') - array['nombre','apellidos','documento_identidad','fecha_nacimiento','nacionalidad','domicilio','localidad','provincia'];
            v_result := public.fenix_prod_recover_participant_extraction(new.document_id,v_client,v_exp,v_safe_fields);
            if coalesce((v_result->>'ok')::boolean,false) then
              new.status := 'applied';
              new.error := null;
              new.extraction := jsonb_set(coalesce(new.extraction,'{}'::jsonb),'{canonical_fields}',jsonb_build_object('ok',true,'recovered_from','joint_bank_holder_identity_guard','participant_code',v_client,'expediente_code',v_exp,'changes',coalesce(v_result->'changes','{}'::jsonb)),true);
            else
              new.status := 'needs_review';
              new.error := coalesce(v_result->>'error','participant_identity_mismatch');
              new.extraction := jsonb_set(coalesce(new.extraction,'{}'::jsonb),'{canonical_fields}',v_result,true);
            end if;
          else
            new.status := 'needs_review';
            new.error := 'participant_identity_mismatch';
            new.extraction := jsonb_set(coalesce(new.extraction,'{}'::jsonb),'{canonical_fields}',v_result,true);
          end if;
        end if;
      end if;
    end if;
  end if;
  return new;
end
$function$;

revoke execute on function public.fenix_prod_recover_participant_read_failure_trigger() from public,anon,authenticated;
grant execute on function public.fenix_prod_recover_participant_read_failure_trigger() to service_role;
