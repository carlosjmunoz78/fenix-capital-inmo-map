import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('src/supabase.ts','utf8');
const directionSource=fs.readFileSync('src/DirectionExecutiveOverviewGuard.tsx','utf8');
const envExample=fs.readFileSync('.env.production.example','utf8');
const workflow=fs.readFileSync('.github/workflows/preprod-build.yml','utf8');

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
  expect(workflow).toContain("VITE_FUNCTION_SUFFIX: '-test'");
  const prodBuild=workflow.slice(workflow.indexOf('- name: Build immutable PROD candidate'),workflow.indexOf('- name: Browser QA exact PROD candidate'));
  expect(prodBuild).not.toContain('VITE_FUNCTION_SUFFIX');
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-app-gateway'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-ana-api'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-direction-kpis'");
  expect(source).not.toContain("authenticatedEdgeFetch<T>('fenix-ana-api-test'");
  expect(directionSource).toContain('fetchDirectionKpisApi');
  expect(directionSource).not.toContain('fenix-direction-kpis-test');
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
