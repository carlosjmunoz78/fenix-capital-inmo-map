import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('src/supabase.ts','utf8');
const directionSource=fs.readFileSync('src/DirectionExecutiveOverviewGuard.tsx','utf8');
const envExample=fs.readFileSync('.env.production.example','utf8');
const workflow=fs.readFileSync('.github/workflows/prod-preparation-build.yml','utf8');

test('runtime APP es exclusivamente PROD y exige Supabase dedicado', async () => {
  expect(source).toContain('export const IS_PRODUCTION=true;');
  expect(source).toContain("export const SUPABASE_URL=String(import.meta.env.VITE_SUPABASE_URL||'');");
  expect(source).toContain("export const SUPABASE_PUBLISHABLE_KEY=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'');");
  expect(source).toContain("if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY)");
  expect(source).toContain("throw new Error('FENIX PROD runtime requires dedicated Supabase URL and publishable key.')");
  expect(source).toContain("const AUTH_STORAGE_KEY='fenix-prod-auth-v1';");
});

test('candidato PROD no conserva runtime PRE-PROD ni sufijos TEST', async () => {
  expect(fs.existsSync('.github/workflows/preprod-build.yml')).toBe(false);
  expect(workflow).toContain('Build isolated PROD candidate');
  expect(workflow).toContain('VITE_FENIX_ENV: prod');
  expect(workflow).not.toContain("VITE_FUNCTION_SUFFIX: '-test'");
  expect(source).not.toContain('PREPROD_SUPABASE_URL');
  expect(source).not.toContain('PREPROD_SUPABASE_PUBLISHABLE_KEY');
  expect(source).not.toContain('VITE_FUNCTION_SUFFIX');
  expect(source).not.toContain('fenix-preprod-auth');
  expect(source).not.toContain('fenix_test_actor');
  expect(source).not.toContain('qa-refresh-');
  expect(source).not.toContain('@fenix.test');
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-app-gateway'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-ana-api'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-direction-kpis'");
  expect(directionSource).toContain('fetchDirectionKpisApi');
  expect(directionSource).not.toContain('fenix-direction-kpis-test');
});

test('fallback autenticado PROD solo admite actor_code real', async () => {
  expect(source).toContain("const actorCode=typeof metadata?.actor_code==='string'?metadata.actor_code:'';");
  expect(source).not.toContain('fenix_test_actor');
  expect(source).not.toContain('DIR-TEST');
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
