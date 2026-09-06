import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('supabase/functions/fenix-document-extract-prod/index.ts','utf8');

test('PROD extractor uses server-only RPC bridge and keeps JWT protection contract in source',()=>{
  expect(source).toContain('fenix_prod_document_extract_resolve_server');
  expect(source).toContain('fenix_prod_document_extract_run_upsert_server');
  expect(source).toContain('fenix_prod_document_extract_run_update_server');
  expect(source).toContain('fenix_prod_document_extract_legacy_status_server');
  expect(source).toContain('fenix_prod_document_extract_legacy_candidates_server');
  expect(source).not.toContain('.schema("fenix_prod")');
  expect(source).not.toContain(".schema('fenix_prod')");
  expect(source).toContain('https://app.fenixcapital.es');
});
