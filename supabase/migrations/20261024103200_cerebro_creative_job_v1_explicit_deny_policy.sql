do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='cerebro_creative_job_v1' and policyname='cerebro_creative_job_v1_no_direct_user_access'
  ) then
    create policy cerebro_creative_job_v1_no_direct_user_access
      on public.cerebro_creative_job_v1
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;
