import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PRE-PROD aplica siempre sufijo -test a funciones Edge',()=>{
  const text=fs.readFileSync(path.resolve('src/supabase.ts'),'utf8');
  expect(text).toContain("const runtimeEnv=import.meta.env.VITE_FENIX_ENV||'preprod'");
  expect(text).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':'-test'");
  expect(text).toContain('const functionName=(base:string)=>`${base}${FUNCTION_SUFFIX}`');
  expect(text).toContain('functionName(baseFunctionName)');
  expect(text).toContain("authenticatedEdgeFetch<T>('fenix-app-gateway'");
  expect(text).not.toMatch(/functions\/v1\/fenix-[a-z0-9-]+(?:[/'"`])/i);
});

test('runtimes PRE-PROD explícitos fallan cerrados en PROD antes de tocar endpoints -test',()=>{
  const files=['src/notionRuntime.ts','src/notariasRuntime.ts','src/registrosRuntime.ts','src/specialCasesRuntime.ts','src/DirectionKpiDrilldownGuard.tsx'];
  for(const file of files){
    const text=fs.readFileSync(path.resolve(file),'utf8');
    expect(text,`${file} debe importar IS_PRODUCTION`).toContain('IS_PRODUCTION');
    const guard=text.indexOf('if(IS_PRODUCTION)');
    const networkEndpoint=text.indexOf('/functions/v1/');
    expect(guard,`${file} debe tener gate PROD`).toBeGreaterThan(-1);
    expect(networkEndpoint,`${file} debe conservar endpoint PRE-PROD`).toBeGreaterThan(-1);
    expect(guard,`${file} debe cortar PROD antes del endpoint PRE-PROD`).toBeLessThan(networkEndpoint);
    expect(text.slice(networkEndpoint),`${file} debe conservar namespace -test solo tras el gate PROD`).toContain('-test');
  }
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

test('workflow PRE-PROD valida y sella candidato sin publicar ni escribir ramas',()=>{
  const text=fs.readFileSync(path.resolve('.github/workflows/preprod-build.yml'),'utf8');
  expect(text).toContain('name: PRE-PROD App Build');
  expect(text).toContain('- preprod-app-phase1');
  expect(text).toContain("github.ref == 'refs/heads/preprod-app-phase1'");
  expect(text).toContain('fenix-prod-candidate-${{ github.sha }}');
  expect(text).toContain('Browser QA exact PROD candidate');
  expect(text).toContain('Assert PROD candidate contains no test endpoints');
  expect(text).not.toMatch(/git push/);
  expect(text).not.toContain('Publish validated operational snapshot to gh-pages');
});
