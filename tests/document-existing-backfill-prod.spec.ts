import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('existing expediente documents are backfilled automatically without a reread button',()=>{
 const guard=fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');
 expect(guard).toContain('fenix-document-existing-backfill');
 expect(guard).toContain('window.location.reload()');
 expect(guard).not.toContain('Releer');
 expect(guard).toContain("/^\\/expedientes\\/([^/?#]+)\\/?$/i");
});

test('backfill waits for authenticated session hydration before marking expediente as running',()=>{
 const guard=fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');
 expect(guard).toContain('async function authenticatedHeaders()');
 expect(guard).toContain('for(let attempt=0;attempt<10;attempt++)');
 expect(guard).toContain("if(cancelled||!headers)return;");
 const marker=guard.indexOf('running.current=raw;');
 const auth=guard.indexOf('const headers=await authenticatedHeaders();');
 expect(marker).toBeGreaterThan(auth);
});

test('backfill retries when authentication completes after initial hydration polling',()=>{
 const guard=fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');
 expect(guard).toContain('supabase.auth.onAuthStateChange');
 expect(guard).toContain("if(cancelled||!session?.access_token||running.current===raw)return;");
 expect(guard).toContain('void run();');
 expect(guard).toContain('subscription.unsubscribe();');
 expect(guard).toContain('if(cancelled||starting||running.current===raw)return;');
 expect(guard).toContain('finally{starting=false;}');
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
