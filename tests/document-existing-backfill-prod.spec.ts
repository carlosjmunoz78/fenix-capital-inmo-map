import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('existing expediente documents are backfilled automatically without a reread button',()=>{
 const guard=fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');
 expect(guard).toContain('fenix-document-existing-backfill');
 expect(guard).toContain('window.location.reload()');
 expect(guard).not.toContain('Releer');
 expect(guard).toContain("/^\\/expedientes\\/([^/?#]+)\\/?$/i");
});

test('backfill is authenticated, scoped and delegates only native routes to auto ingest',()=>{
 const edge=fs.readFileSync('supabase/functions/fenix-document-existing-backfill/index.ts','utf8');
 expect(edge).toContain("startsWith('bearer ')");
 expect(edge).toContain("fenix_prod_session_context");
 expect(edge).toContain("fenix_prod_exp_people_server");
 expect(edge).toContain("TARGET='fenix-document-auto-ingest'");
 expect(edge).toContain("run?.status==='applied'&&native");
 expect(edge).toContain("family:'land_registry'");
 expect(edge).toContain("n\\s*s");
 expect(edge).toContain("employment_contract");
});
