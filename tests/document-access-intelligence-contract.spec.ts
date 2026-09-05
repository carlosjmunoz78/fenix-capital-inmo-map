import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260905213000_prod_document_access_with_intelligence.sql','utf8');
const viewer=fs.readFileSync('src/DocumentViewerShell.tsx','utf8');

test('document access keeps existing RBAC and exposes the upload needed to trigger extraction',()=>{
  expect(migration).toContain("v_role='Direccion'");
  expect(migration).toContain("v_role='Financiero'");
  expect(migration).toContain("v_role='Visitador'");
  expect(migration).toContain("d.sensibilidad='B2B'");
  expect(migration).toContain('document_intelligence_runs');
  expect(migration).toContain('document_upload_sessions');
  expect(migration).toContain("'upload_id'");
  expect(migration).toContain("'intelligence'");
  expect(migration).toContain('grant execute on function public.fenix_prod_document_access_server(text,text) to service_role');
  expect(migration).toContain('revoke all on function public.fenix_prod_document_access_server(text,text) from public,anon,authenticated');
});

test('viewer automatically invokes the extractor when an authorized document has no persisted extraction',()=>{
  expect(viewer).toContain("r.data?.upload_id");
  expect(viewer).toContain("IS_PRODUCTION&&auto&&!intelligence?.extraction&&up");
  expect(viewer).toContain('void analyze(up)');
  expect(viewer).toContain("fetchEnvironmentApi<any>('fenix-document-extract'");
  expect(viewer).toContain('body:JSON.stringify({upload_id:up})');
});
