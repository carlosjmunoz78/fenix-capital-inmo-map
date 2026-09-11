import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('src/supabase.ts','utf8');
const directionSource=fs.readFileSync('src/DirectionExecutiveOverviewGuard.tsx','utf8');
const envExample=fs.readFileSync('.env.production.example','utf8');
const preprodWorkflow=fs.readFileSync('.github/workflows/preprod-build.yml','utf8');
const prodWorkflow=fs.readFileSync('.github/workflows/app-prod-promote.yml','utf8');

test('PROD exige configuración Supabase dedicada y separa almacenamiento auth', async () => {
  expect(source).toContain("const runtimeEnv=import.meta.env.VITE_FENIX_ENV||'preprod'");
  expect(source).toContain("runtimeEnv==='production'||runtimeEnv==='prod'");
  expect(source).toContain("IS_PRODUCTION?'fenix-prod-auth-v1':'fenix-preprod-auth-v2'");
  expect(source).toContain("if(IS_PRODUCTION&&(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY))");
  expect(source).toContain("throw new Error('FENIX PROD runtime requires dedicated Supabase URL and publishable key.')");
});

test('PRE-PROD recibe sufijo explícito y PROD usa nombres sin sufijo', async () => {
  expect(source).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':String(import.meta.env.VITE_FUNCTION_SUFFIX||'')");
  expect(source).toContain("if(!IS_PRODUCTION&&!FUNCTION_SUFFIX)");
  expect(source).toContain("throw new Error('FENIX PRE-PROD runtime requires an explicit edge-function suffix.')");
  expect(source).not.toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':'-test'");
  expect(preprodWorkflow).toContain("VITE_FUNCTION_SUFFIX: '-test'");
  expect(prodWorkflow).toContain('VITE_FENIX_ENV: prod');
  expect(prodWorkflow).not.toContain('VITE_FUNCTION_SUFFIX:');
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-app-gateway'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-ana-api'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-direction-kpis'");
  expect(source).not.toContain("authenticatedEdgeFetch<T>('fenix-ana-api-test'");
  expect(directionSource).toContain('fetchDirectionKpisApi');
  expect(directionSource).not.toContain('fenix-direction-kpis-test');
});

test('PRE-PROD permanece manual y PROD promueve automáticamente la rama canónica con gates', async () => {
  expect(preprodWorkflow).toContain('workflow_dispatch:');
  expect(preprodWorkflow).not.toMatch(/^\s+push:\s*$/m);
  expect(preprodWorkflow).not.toMatch(/^\s+pull_request:\s*$/m);
  expect(prodWorkflow).toContain('workflow_dispatch:');
  expect(prodWorkflow).toMatch(/^\s+push:\s*$/m);
  expect(prodWorkflow).toContain('- preprod-app-phase1');
  expect(prodWorkflow).not.toMatch(/^\s+pull_request:\s*$/m);
  expect(prodWorkflow).toContain('Browser QA exact PROD candidate');
  expect(prodWorkflow).toContain('PROD API reachability gate');
  expect(prodWorkflow).toContain('Publish exact validated APP snapshot');
  expect(prodWorkflow).toContain('Verify published source marker');
});

test('PROD no admite fallback de actor QA heredado', async () => {
  expect(source).toContain("!IS_PRODUCTION&&typeof metadata?.fenix_test_actor==='string'");
});

test('ejemplo PROD documenta solo variables frontend realmente consumidas', async () => {
  expect(envExample).toContain('VITE_FENIX_ENV=prod');
  expect(envExample).toContain('VITE_SUPABASE_URL=');
  expect(envExample).toContain('VITE_SUPABASE_PUBLISHABLE_KEY=');
  expect(envExample).not.toContain('VITE_APP_ENV=');
  expect(envExample).not.toContain('VITE_AUTH_STORAGE_KEY=');
  expect(envExample).not.toContain('VITE_FUNCTION_SUFFIX=');
  expect(envExample).not.toMatch(/^VITE_EDGE_/m);
});
