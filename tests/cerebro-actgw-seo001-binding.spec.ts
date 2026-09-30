import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('CEREBRO gateway binds confirmed SEO action through signed PREPROD transport',async()=>{
  const source=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
  expect(source).toContain('cerebro-actgw-seo001-preprod');
  expect(source).toContain('CEREBRO_ACTGW_PROD_TO_SEO001_PREPROD_V1');
  expect(source).toContain('x-cerebro-actgw-signature-ed25519');
  expect(source).toContain('status:"ACTION_ACCEPTED"');
  expect(source).toContain('execution_environment:"PREPROD"');
  expect(source).toContain('completed:false');
  expect(source).not.toContain('prod_execution_enabled: true');

  const executor=fs.readFileSync('supabase/functions/cerebro-actgw-seo001-preprod/index.ts','utf8');
  expect(executor).toContain('CAPITAL_EXCEPTIONS');
  expect(executor).toContain('activation_rejected');

  const reactShell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');
  const accepted=reactShell.indexOf("data?.status==='ACTION_ACCEPTED'");
  const returnedAction=reactShell.indexOf('data?.action');
  expect(accepted).toBeGreaterThan(-1);
  expect(returnedAction).toBeGreaterThan(accepted);

  const staticShell=fs.readFileSync('public/cerebro/index.html','utf8');
  const staticAccepted=staticShell.indexOf("data?.status==='ACTION_ACCEPTED'");
  const staticAction=staticShell.indexOf('data?.action');
  expect(staticAccepted).toBeGreaterThan(-1);
  expect(staticAction).toBeGreaterThan(staticAccepted);

  const prereq=fs.readFileSync('supabase/migrations/20260930111700_seo001_preprod_activation_prerequisites.sql','utf8');
  expect(prereq).toContain('create table if not exists public.seo_cerebro_territories_preprod');
  expect(prereq).toContain('create table if not exists public.seo_cerebro_expansion_jobs_preprod');
  expect(prereq).toContain('create table if not exists public.seo_cerebro_city_runs_preprod');
  expect(prereq).toContain('create table if not exists public.seo_cerebro_city_growth_stack_preprod');
});
