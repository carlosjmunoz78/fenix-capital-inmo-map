import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('src/supabase.ts','utf8');
const envExample=fs.readFileSync('.env.production.example','utf8');

test('PROD exige configuración Supabase dedicada y separa almacenamiento auth', async () => {
  expect(source).toContain("const runtimeEnv=(import.meta.env.VITE_FENIX_ENV||'').toLowerCase()");
  expect(source).toContain("window.location.hostname==='app.fenixcapital.es'");
  expect(source).toContain("runtimeEnv==='production'||runtimeEnv==='prod'");
  expect(source).toContain("const PROD_SUPABASE_URL='https://cluhljgonannaafpmblx.supabase.co'");
  expect(source).toContain("IS_PRODUCTION?'fenix-prod-auth-v1':'fenix-preprod-auth-v2'");
  expect(source).toContain("throw new Error(IS_PRODUCTION?'Configuración Supabase PROD incompleta':'Configuración Supabase PRE-PROD incompleta')");
  expect(source).not.toContain('https://hnqlnvakzaywtafeiybt.supabase.co');
});

test('PRE-PROD conserva funciones -test y PROD usa nombres sin sufijo', async () => {
  expect(source).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':'-test'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-app-gateway'");
  expect(source).toContain("authenticatedEdgeFetch<T>('fenix-ana-api'");
  expect(source).not.toContain("authenticatedEdgeFetch<T>('fenix-ana-api-test'");
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
  expect(envExample).not.toMatch(/^VITE_EDGE_/m);
});
