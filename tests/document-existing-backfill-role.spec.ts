import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('existing backfill normalizes Direccion role accents without weakening RBAC',()=>{
  const source=fs.readFileSync('supabase/functions/fenix-document-existing-backfill/index.ts','utf8');
  expect(source).toContain("function normalize(v:unknown)");
  expect(source).toContain("normalize('NFD')");
  expect(source).toContain("['direccion','financiero'].includes(role)");
  expect(source).toContain("fenix_prod_session_context");
  expect(source).toContain("Authorization:auth");
  expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
  expect(source).not.toContain("['Direccion','Financiero'].includes(role)");
});
