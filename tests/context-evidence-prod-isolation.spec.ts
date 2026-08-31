import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const source=()=>fs.readFileSync(path.resolve('src/ContextEvidenceUpload.tsx'),'utf8');

test('contextual evidence selects isolated resources per environment',()=>{
  const text=source();
  expect(text).toContain("import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase'");
  expect(text).toContain("const BUCKET=IS_PRODUCTION?'fenix-prod-documents':'fenix-preprod-documents-test'");
  expect(text).toContain("const FUNCTION=IS_PRODUCTION?'fenix-evidence-api':'fenix-evidence-universal-test'");
  expect(text).toContain('`${SUPABASE_URL}/functions/v1/${FUNCTION}${path}`');
  expect(text).toContain('supabase.storage.from(BUCKET)');
});

test('PROD fail-closes origins without an evidence contract',()=>{
  const text=source();
  expect(text).toContain("const PROD_SUPPORTED_ORIGINS=new Set(['expediente','contacto','firma'])");
  expect(text).toContain("const context=IS_PRODUCTION&&rawContext&&!PROD_SUPPORTED_ORIGINS.has(rawContext.type)?null:rawContext");
  expect(text).toContain('if(!context)return null');
});

test('PROD blocks audio and unvalidated MIME before prepare or upload',()=>{
  const text=source();
  const guard=text.indexOf('if(IS_PRODUCTION&&(audio||!PROD_ALLOWED_MIME.has(mime)))');
  const prepare=text.indexOf("evidenceFetch<Prepare>('/prepare'");
  const storage=text.indexOf('supabase.storage.from(BUCKET).uploadToSignedUrl');
  expect(guard).toBeGreaterThan(-1);
  expect(prepare).toBeGreaterThan(guard);
  expect(storage).toBeGreaterThan(prepare);
  expect(text).toContain("accept={IS_PRODUCTION?PROD_ACCEPT:undefined}");
  expect(text).toContain('Audio y contextos sin contrato productivo permanecen bloqueados');
});

test('PRE-PROD retains universal audio evidence path',()=>{
  const text=source();
  expect(text).toContain("audio?'audio_conversacion':'documento'");
  expect(text).toContain("IS_PRODUCTION?'Subir documentos':'Subir documentos / audio'");
  expect(text).toContain("!IS_PRODUCTION&&/audio/i.test(msg)");
});
