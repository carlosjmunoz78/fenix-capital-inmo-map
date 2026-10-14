-- CEREBRO OS · Multi-company physical E2E PREPROD acceptance V1
-- Replays the durable control-plane chain only. Synthetic data, transaction rollback, 0 EUR, no PROD/Trading.
begin;

do $$
declare r jsonb; s jsonb; e text; green_count integer; human_state text; blocked_state text;
begin
  r:=public.cerebro_company_register_preprod('zze2e001','1.0.0',repeat('a',64),'e2e:reg:001','cerebro-e2e');
  if r->>'next_gate'<>'COMP_ONB_DURABLE_EXECUTION_REQUIRED' then raise exception 'register gate: %',r; end if;
  r:=public.cerebro_company_register_preprod('zze2e001','1.0.0',repeat('a',64),'e2e:reg:001','cerebro-e2e');
  if coalesce((r->>'idempotent')::boolean,false) is not true then raise exception 'register idempotency: %',r; end if;
  r:=public.cerebro_company_onboarding_start_preprod('zze2e001','1.0.0',repeat('a',64),repeat('b',64),'e2e:onb:001','cerebro-e2e');
  if r->>'next_gate'<>'SCAN_001_DURABLE_EXECUTION_REQUIRED' then raise exception 'onboarding gate: %',r; end if;
  r:=public.cerebro_scan001_record_success_preprod('zze2e001','1.0.0','example.com',now(),repeat('1',64),repeat('2',64),200,true,true,4,2,10,3,'e2e:scan:001','cerebro-e2e');
  if r->>'next_gate'<>'POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED' then raise exception 'scan gate: %',r; end if;

  r:=public.cerebro_post_scan_audit_record_preprod('zze2e001','KW-001','1.0.0',now(),repeat('3',64),repeat('4',64),5,2,null,'e2e:kw:001','cerebro-e2e');
  r:=public.cerebro_post_scan_audit_record_preprod('zze2e001','WAUD-001','1.0.0',now(),repeat('5',64),repeat('6',64),5,1,null,'e2e:waud:001','cerebro-e2e');
  r:=public.cerebro_post_scan_audit_record_preprod('zze2e001','SOCAUD-001','1.0.0',now(),repeat('7',64),repeat('8',64),3,1,null,'e2e:socaud:001','cerebro-e2e');
  r:=public.cerebro_post_scan_audit_record_preprod('zze2e001','LOCALP-001','1.0.0',now(),repeat('9',64),repeat('a',64),4,1,null,'e2e:localp:001','cerebro-e2e');
  if r->>'next_gate'<>'BOOTSTRAP_TIER_DURABLE_EXECUTION_REQUIRED' then raise exception 'post-scan gate: %',r; end if;

  r:=public.cerebro_bootstrap_tier_record_preprod('zze2e001','KBOOT-001','1.0.0',now(),repeat('b',64),repeat('c',64),8,4,null,'e2e:kboot:001','cerebro-e2e');
  r:=public.cerebro_bootstrap_tier_record_preprod('zze2e001','SEOBOOT-001','1.0.0',now(),repeat('c',64),repeat('d',64),6,2,null,'e2e:seoboot:001','cerebro-e2e');
  r:=public.cerebro_bootstrap_tier_record_preprod('zze2e001','SOCBOOT-001','1.0.0',now(),repeat('d',64),repeat('e',64),4,1,null,'e2e:socboot:001','cerebro-e2e');
  if r->>'next_gate'<>'MARKETING_CRM_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED' then raise exception 'bootstrap gate: %',r; end if;

  r:=public.cerebro_marketing_crm_bootstrap_record_preprod('zze2e001','MKTBOOT-001','1.0.0',now(),repeat('e',64),repeat('f',64),6,3,null,'e2e:mkt:001','cerebro-e2e');
  r:=public.cerebro_marketing_crm_bootstrap_record_preprod('zze2e001','CRMBOOT-001','1.0.0',now(),repeat('f',64),repeat('0',64),5,2,null,'e2e:crm:001','cerebro-e2e');
  if r->>'next_gate'<>'APP_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED' then raise exception 'marketing CRM gate: %',r; end if;

  r:=public.cerebro_final_onboarding_record_preprod('zze2e001','APPBOOT-001','1.0.0',now(),repeat('0',64),repeat('1',64),5,3,null,'e2e:app:001','cerebro-e2e');
  if r->>'next_gate'<>'AUTOMATION_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED' then raise exception 'app gate: %',r; end if;
  r:=public.cerebro_final_onboarding_record_preprod('zze2e001','AUTBOOT-001','1.0.0',now(),repeat('1',64),repeat('2',64),5,3,null,'e2e:aut:001','cerebro-e2e');
  if r->>'next_gate'<>'TRAINING_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED' then raise exception 'automation gate: %',r; end if;
  r:=public.cerebro_final_onboarding_record_preprod('zze2e001','TRNBOOT-001','1.0.0',now(),repeat('2',64),repeat('3',64),5,3,null,'e2e:trn:001','cerebro-e2e');
  if r->>'next_gate'<>'ENGINE_ACTIVATION_PREPROD_REQUIRED' then raise exception 'training gate: %',r; end if;
  r:=public.cerebro_final_onboarding_record_preprod('zze2e001','ENGACT-001','1.0.0',now(),repeat('3',64),repeat('4',64),5,8,null,'e2e:engact:001','cerebro-e2e');
  if r->>'next_gate'<>'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED' then raise exception 'activation gate: %',r; end if;
  select count(*) into green_count from public.cerebro_company_engine_state_preprod where company_id='zze2e001' and state='GREEN';
  if green_count<>17 then raise exception '17 green required, got %',green_count; end if;

  r:=public.cerebro_lrn001_record_preprod('zze2e001','1.0.0',now(),1,repeat('5',64),repeat('6',64),repeat('7',64),'PREPROD_CONTINUATION_ELIGIBLE',0.71,0.86,true,'NEW_BETTER','eva:e2e:001','jdg:e2e:001','rollback:e2e:001',null,'e2e:lrn:001','cerebro-e2e');
  if r->>'next_gate'<>'MULTICOMPANY_PHYSICAL_E2E_ACCEPTANCE_REQUIRED' then raise exception 'LRN gate: %',r; end if;
  r:=public.cerebro_lrn001_record_preprod('zze2e001','1.0.0',now(),1,repeat('5',64),repeat('6',64),repeat('7',64),'PREPROD_CONTINUATION_ELIGIBLE',0.71,0.86,true,'NEW_BETTER','eva:e2e:001','jdg:e2e:001','rollback:e2e:001',null,'e2e:lrn:001','cerebro-e2e');
  if coalesce((r->>'idempotent')::boolean,false) is not true then raise exception 'LRN idempotency: %',r; end if;

  -- Canonical human-exception path must fail closed.
  r:=public.cerebro_company_register_preprod('zze2e002','1.0.0',repeat('8',64),'e2e:reg:002','cerebro-e2e');
  r:=public.cerebro_company_onboarding_start_preprod('zze2e002','1.0.0',repeat('8',64),repeat('9',64),'e2e:onb:002','cerebro-e2e');
  r:=public.cerebro_scan001_record_success_preprod('zze2e002','1.0.0','example.org',now(),repeat('a',64),repeat('b',64),200,true,true,2,1,4,1,'e2e:scan:002','cerebro-e2e');
  r:=public.cerebro_post_scan_audit_record_preprod('zze2e002','KW-001','1.0.0',now(),repeat('c',64),repeat('d',64),2,1,'LOW_CONFIDENCE','e2e:kw:002','cerebro-e2e');
  if r->>'human_required'<>'LOW_CONFIDENCE' then raise exception 'LOW_CONFIDENCE not raised: %',r; end if;
  r:=public.cerebro_post_scan_audit_record_preprod('zze2e002','WAUD-001','1.0.0',now(),repeat('d',64),repeat('e',64),2,1,null,'e2e:waud:002','cerebro-e2e');
  r:=public.cerebro_post_scan_audit_record_preprod('zze2e002','SOCAUD-001','1.0.0',now(),repeat('e',64),repeat('f',64),2,1,null,'e2e:socaud:002','cerebro-e2e');
  r:=public.cerebro_post_scan_audit_record_preprod('zze2e002','LOCALP-001','1.0.0',now(),repeat('f',64),repeat('0',64),2,1,null,'e2e:localp:002','cerebro-e2e');
  select state into human_state from public.cerebro_company_engine_state_preprod where company_id='zze2e002' and engine_id='KW-001';
  select state into blocked_state from public.cerebro_company_engine_state_preprod where company_id='zze2e002' and engine_id='KBOOT-001';
  if human_state<>'HUMAN_REQUIRED' or blocked_state<>'BLOCKED' then raise exception 'downstream did not fail closed'; end if;
  s:=public.cerebro_company_tenant_boundary_check_preprod('zze2e002','zze2e001');
  if coalesce((s->>'allowed')::boolean,false) is true then raise exception 'cross-company access unexpectedly allowed'; end if;
end $$;

rollback;
