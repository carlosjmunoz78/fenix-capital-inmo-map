import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('PROD upload frontend uses 50 MB contract and guard loads before app',()=>{
  const guard=fs.readFileSync('src/prod-upload-limit-guard.ts','utf8');
  const html=fs.readFileSync('index.html','utf8');
  expect(guard).toContain('const PROD_MAX_BYTES=50*1024*1024');
  expect(guard).toContain("/functions/v1/fenix-evidence-api/prepare");
  expect(guard).toContain("replaceAll('12 MB','50 MB')");
  expect(html.indexOf('/src/prod-upload-limit-guard.ts')).toBeGreaterThan(-1);
  expect(html.indexOf('/src/prod-upload-limit-guard.ts')).toBeLessThan(html.indexOf('/src/main.tsx'));
});

test('PROD normalizes PDF MIME by filename before app validation',()=>{
  const guard=fs.readFileSync('src/prod-upload-limit-guard.ts','utf8');
  expect(guard).toContain("const isPdf=/\\.pdf$/i.test(file.name)");
  expect(guard).toContain("new File([file],file.name,{type:'application/pdf'");
  expect(guard).toContain("document.addEventListener('change'");
  expect(guard).toContain('input.files=transfer.files');
});

test('PROD resolves expediente identifiers to canonical expediente_code before evidence prepare',()=>{
  const guard=fs.readFileSync('src/prod-upload-limit-guard.ts','utf8');
  const runtime=fs.readFileSync('src/notionRuntime.ts','utf8');
  expect(guard).toContain('canonicalizeEvidencePrepare');
  expect(guard).toContain('canonicalFromGateway');
  expect(guard).toContain('/functions/v1/fenix-app-gateway/expedientes/');
  expect(guard).toContain("/functions/v1/fenix-app-gateway/expedientes'");
  expect(guard).toContain('row.internal_id');
  expect(guard).toContain('payload.origin_code=canonical');
  expect(runtime).toContain('id:row.expediente_code??row.id');
  expect(runtime).toContain('id:raw.expediente_code??raw.id');
});

test('PROD reread original calls governed document AI and refreshes the persisted ficha',()=>{
  const guard=fs.readFileSync('src/prod-upload-limit-guard.ts','utf8');
  expect(guard).toContain("from './supabase'");
  expect(guard).toContain('function rereadCurrentDocument');
  expect(guard).toContain('/functions/v1/fenix-document-reread');
  expect(guard).toContain('documentRow?.upload_id??detailData?.upload_id');
  expect(guard).toContain("/releer\\s+original/i");
  expect(guard).toContain("button.textContent='Releer original existente'");
  expect(guard).toContain('window.location.reload()');
});
