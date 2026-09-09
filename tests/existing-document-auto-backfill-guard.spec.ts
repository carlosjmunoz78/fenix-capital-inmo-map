import fs from 'node:fs';
import {test,expect} from '@playwright/test';

const source=()=>fs.readFileSync('src/ExistingDocumentAutoBackfillGuard.tsx','utf8');

test('global backfill guard accepts any expediente subroute and skips gateway for canonical codes',()=>{
 const code=source();
 expect(code).toContain("pathname.match(/^\\/expedientes\\/([^/?#]+)(?:\\/|$)/i)");
 expect(code).toContain("const canonicalExpediente=(value:string)=>/^exp(?:-|_)/i.test(value)");
 expect(code).toContain('if(canonicalExpediente(raw))return raw');
 expect(code).toContain("fenix-app-gateway/expedientes/${encodeURIComponent(raw)}");
});

test('global backfill guard waits for auth and retries boundedly instead of latching a zero-result attempt',()=>{
 const code=source();
 expect(code).toContain('attempt<12');
 expect(code).toContain('const maxAttempts=8');
 expect(code).toContain('scheduleRetry');
 expect(code).toContain("supabase.auth.onAuthStateChange");
 expect(code).toContain("window.addEventListener('focus',trigger)");
 expect(code).toContain("document.addEventListener('visibilitychange',trigger)");
 expect(code).not.toContain("running.current=raw");
});

test('global backfill guard calls only authenticated PROD existing-backfill endpoint',()=>{
 const code=source();
 expect(code).toContain('if(!IS_PRODUCTION)return');
 expect(code).toContain('Authorization:`Bearer ${session.access_token}`');
 expect(code).toContain("/functions/v1/fenix-document-existing-backfill");
 expect(code).toContain('body:JSON.stringify({expediente_code:expCode})');
});
