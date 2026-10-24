create or replace function public.cerebro_creative_enqueue_v1(p_request jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_idempotency text := nullif(trim(p_request->>'idempotency_key'),'');
  v_company text := nullif(trim(p_request->>'company_id'),'');
  v_target_company text := coalesce(nullif(trim(p_request->>'target_company_id'),''),nullif(trim(p_request->>'company_id'),''));
  v_engine text := nullif(trim(p_request->>'engine_id'),'');
  v_department text := coalesce(nullif(trim(p_request->>'department_id'),''),'creative');
  v_environment text := upper(coalesce(nullif(trim(p_request->>'environment'),''),'PREPROD'));
  v_version text := coalesce(nullif(trim(p_request->>'version'),''),'v1');
  v_channel text := upper(coalesce(nullif(trim(p_request->>'channel'),''),'MARKETING'));
  v_output text := upper(coalesce(nullif(trim(p_request->>'output_type'),''),'STATIC_POST'));
  v_audit text := nullif(trim(p_request->>'audit_id'),'');
  v_created_by text := nullif(trim(p_request->>'created_by'),'');
  v_priority integer := least(greatest(coalesce((p_request->>'priority')::integer,50),0),100);
  v_max_attempts integer := least(greatest(coalesce((p_request->>'max_attempts')::integer,2),1),3);
  v_expected_cost numeric := coalesce((p_request->>'expected_cost_eur')::numeric,0);
  v_row public.cerebro_creative_job_v1;
begin
  if v_idempotency is null or v_company is null or v_engine is null or v_audit is null or v_created_by is null then raise exception 'CREATIVE_JOB_SCOPE_REQUIRED'; end if;
  if v_target_company is distinct from v_company then raise exception 'CREATIVE_JOB_CROSS_COMPANY_DENIED'; end if;
  if v_environment not in ('PREPROD','PROD') then raise exception 'CREATIVE_JOB_ENVIRONMENT_DENIED'; end if;
  if v_expected_cost <> 0 then raise exception 'CREATIVE_JOB_MONEY_LIMIT'; end if;
  if lower(coalesce(p_request->>'publish_requested','false')) = 'true' then raise exception 'CREATIVE_JOB_PUBLISH_AUTHORITY_DENIED'; end if;
  if p_request::text ~* '"(password|secret|access_token|refresh_token|api_key|apikey|private_key|dni|nie|nif|iban)"[[:space:]]*:' then raise exception 'CREATIVE_JOB_RAW_SECRET_OR_PII_DENIED'; end if;
  if jsonb_typeof(coalesce(p_request->'creative_payload','{}'::jsonb)) <> 'object' then raise exception 'CREATIVE_JOB_PAYLOAD_INVALID'; end if;
  insert into public.cerebro_creative_job_v1(idempotency_key,company_id,engine_id,department_id,environment,version,channel,output_type,request,status,priority,max_attempts,audit_id,created_by)
  values (v_idempotency,v_company,v_engine,v_department,v_environment,v_version,v_channel,v_output,p_request,'QUEUED',v_priority,v_max_attempts,v_audit,v_created_by)
  on conflict (idempotency_key) do update set updated_at=public.cerebro_creative_job_v1.updated_at
  returning * into v_row;
  return jsonb_build_object('ok',true,'job_id',v_row.job_id,'status',v_row.status,'company_id',v_row.company_id,'engine_id',v_row.engine_id,'environment',v_row.environment,'channel',v_row.channel,'output_type',v_row.output_type,'expected_cost_eur',0,'publish_authorized',false);
end;
$function$;

revoke all on function public.cerebro_creative_enqueue_v1(jsonb) from public, anon, authenticated;
grant execute on function public.cerebro_creative_enqueue_v1(jsonb) to service_role;
