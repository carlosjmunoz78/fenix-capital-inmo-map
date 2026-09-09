import fs from 'node:fs';
import {test,expect} from '@playwright/test';

test('restored existing-document backfill is mounted exactly once',()=>{
 const main=fs.readFileSync('src/main.tsx','utf8');
 const imports=(main.match(/import ExistingDocumentAutoBackfillGuard/g)||[]).length;
 const mounts=(main.match(/<ExistingDocumentAutoBackfillGuard \/>/g)||[]).length;
 expect(imports).toBe(1);
 expect(mounts).toBe(1);
});

test('backfill remains PROD-only, authenticated and retries late auth safely',()=>{
 const guard=fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');
 expect(guard).toContain('if(!IS_PRODUCTION)return;');
 expect(guard).toContain('supabase.auth.getSession()');
 expect(guard).toContain('session?.access_token');
 expect(guard).toContain('supabase.auth.onAuthStateChange');
 expect(guard).toContain('if(cancelled||starting||completed.current===raw||attempts>=maxAttempts)return;');
 expect(guard).toContain('const maxAttempts=8');
 expect(guard).toContain('scheduleRetry');
 expect(guard).toContain("window.addEventListener('focus',trigger)");
 expect(guard).toContain("document.addEventListener('visibilitychange',trigger)");
 expect(guard).toContain('subscription.unsubscribe();');
 expect(guard).toContain('/functions/v1/fenix-document-existing-backfill');
});

test('backfill recognizes both expediente root and nested expediente tabs',()=>{
 const guard=fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');
 expect(guard).toContain("pathname.match(/^\\/expedientes\\/([^/?#]+)(?:\\/|$)/i)");
 expect(guard).not.toContain("([^/?#]+)\\/?$/i");
});

test('backfill never supplies privileged browser credentials or weakens auth',()=>{
 const guard=fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');
 expect(guard).not.toMatch(/service[_-]?role/i);
 expect(guard).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
 expect(guard).toContain('Authorization:`Bearer ${session.access_token}`');
});
