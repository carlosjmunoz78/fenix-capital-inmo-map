import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('gate PROD exige promoción explícita y entorno separado',()=>{
  const gate=fs.readFileSync(path.resolve('docs/PROD_RELEASE_GATE.md'),'utf8');
  expect(gate).toContain('Ninguna versión pasa a PROD por automatismo');
  expect(gate).toContain('orden explícita');
  expect(gate).toContain('configuración PROD, dominio/hosting, backend, secretos y almacenamiento');
  expect(gate).toContain('No tocar `main`, PROD, WordPress ni Supabase PROD');
  expect(gate).toContain('No fusionar PR #2 sin orden explícita');
});

test('workflow PRE-PROD permanece parado y solo admite lanzamiento manual',()=>{
  const workflow=fs.readFileSync(path.resolve('.github/workflows/preprod-build.yml'),'utf8');
  expect(workflow).toContain('workflow_dispatch:');
  expect(workflow).not.toMatch(/^\s+push:\s*$/m);
  expect(workflow).not.toMatch(/^\s+pull_request:\s*$/m);
  expect(workflow).not.toMatch(/git push[^\n]*HEAD:main/);
  expect(workflow).not.toMatch(/git push[^\n]*\bmain\b/);
  expect(workflow).not.toMatch(/\benvironment\s*:\s*(?:prod|production)\b/i);
  expect(workflow).not.toMatch(/\bvercel\b[^\n]*--prod\b/i);
  expect(workflow).not.toMatch(/\bdeploy[-_: ]*(?:prod|production)\b/i);
});

test('PRE-PROD conserva separación técnica del backend de producción',()=>{
  const supabase=fs.readFileSync(path.resolve('src/supabase.ts'),'utf8');
  const workflow=fs.readFileSync(path.resolve('.github/workflows/preprod-build.yml'),'utf8');
  expect(supabase).toContain("const runtimeEnv=import.meta.env.VITE_FENIX_ENV||'preprod'");
  expect(supabase).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':String(import.meta.env.VITE_FUNCTION_SUFFIX||'')");
  expect(supabase).toContain('if(!IS_PRODUCTION&&!FUNCTION_SUFFIX)');
  expect(supabase).not.toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':'-test'");
  expect(workflow).toContain("VITE_FUNCTION_SUFFIX: '-test'");
  const prodBuild=workflow.slice(workflow.indexOf('- name: Build immutable PROD candidate'),workflow.indexOf('- name: Browser QA exact PROD candidate'));
  expect(prodBuild).not.toContain('VITE_FUNCTION_SUFFIX');
  expect(supabase).toContain("const AUTH_STORAGE_KEY=IS_PRODUCTION?'fenix-prod-auth-v1':'fenix-preprod-auth-v2'");
  expect(supabase).toContain("? String(import.meta.env.VITE_SUPABASE_URL||'')");
  expect(supabase).toContain('if(IS_PRODUCTION||key!==AUTH_STORAGE_KEY)return null');
  expect(supabase).not.toMatch(/functions\/v1\/fenix-[a-z0-9-]+(?:[/'"`])/i);
});

test('Contactos PROD abre fichas con identificadores canónicos y usa el gateway',()=>{
  const detail=fs.readFileSync(path.resolve('src/ContactDetailShell.tsx'),'utf8');
  const runtime=fs.readFileSync(path.resolve('src/notionRuntime.ts'),'utf8');
  expect(detail).toContain("const active=Boolean(match&&id&&id!=='nuevo')");
  expect(detail).not.toContain('isNotionId');
  expect(detail).not.toContain("replace(/^notion\\|/i,'')");
  expect(detail).toContain("r.data?.contacto||r.data?.item||null");
  expect(runtime).toContain("pathname.match(/^\\/clientes\\/([^/]+)$/)");
  expect(runtime).toContain("fetchAppApi<T>(`/contactos/${encodeURIComponent(id)}`)");
});

test('Contactos PROD conserva todos los teléfonos y correos y abre la ficha creada',()=>{
  const create=fs.readFileSync(path.resolve('src/ContactCreateShell.tsx'),'utf8');
  const detail=fs.readFileSync(path.resolve('src/ContactDetailShell.tsx'),'utf8');
  expect(create).toContain("supabase.rpc('fenix_prod_contact_create_v2'");
  expect(create).toContain('p_emails:Array.isArray(payload.emails)?payload.emails:[]');
  expect(create).toContain('p_telefonos:Array.isArray(payload.telefonos)?payload.telefonos:[]');
  expect(create).toContain('`/contactos/${encodeURIComponent(response.id)}`');
  expect(detail).toContain("textList(row||undefined,['telefonos']");
  expect(detail).toContain("textList(row||undefined,['emails']");
});
