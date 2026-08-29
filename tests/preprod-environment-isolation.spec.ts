import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PRE-PROD aplica siempre sufijo -test a funciones Edge',()=>{
  const text=fs.readFileSync(path.resolve('src/supabase.ts'),'utf8');
  expect(text).toContain("const runtimeEnv=(import.meta.env.VITE_FENIX_ENV||'preprod').toLowerCase()");
  expect(text).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':'-test'");
  expect(text).toContain('const functionName=(base:string)=>`${base}${FUNCTION_SUFFIX}`');
  expect(text).toContain('functionName(baseFunctionName)');
  expect(text).toContain("functionName('fenix-app-gateway')");
  expect(text).not.toMatch(/functions\/v1\/fenix-[a-z0-9-]+(?:[/'"`])/i);
});

test('cliente y almacenamiento de sesión mantienen aislamiento PRE-PROD/PROD',()=>{
  const text=fs.readFileSync(path.resolve('src/supabase.ts'),'utf8');
  expect(text).toContain("const AUTH_STORAGE_KEY=IS_PRODUCTION?'fenix-prod-auth-v1':'fenix-preprod-auth-v2'");
  expect(text).toContain("const LEGACY_AUTH_STORAGE_KEY='fenix-preprod-auth'");
  expect(text).toContain('if(IS_PRODUCTION||key!==AUTH_STORAGE_KEY)return null');
  expect(text).toContain("const PREPROD_SUPABASE_URL='https://hnqlnvakzaywtafeiybt.supabase.co'");
  expect(text).toContain("? String(import.meta.env.VITE_SUPABASE_URL||'')");
  expect(text).toContain("throw new Error('FENIX PROD runtime requires dedicated Supabase URL and publishable key.')");
});

test('workflow PRE-PROD solo publica desde preprod-app-phase1 y no escribe main',()=>{
  const text=fs.readFileSync(path.resolve('.github/workflows/preprod-build.yml'),'utf8');
  expect(text).toContain('name: PRE-PROD App Build');
  expect(text).toContain('- preprod-app-phase1');
  expect(text).toContain("github.ref == 'refs/heads/preprod-app-phase1'");
  expect(text).toContain('git push origin HEAD:preprod-app-phase1');
  expect(text).not.toMatch(/git push[^\n]*\bmain\b/);
  expect(text).not.toMatch(/git push[^\n]*HEAD:main/);
});
