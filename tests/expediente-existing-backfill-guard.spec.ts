import fs from 'node:fs';
import {test,expect} from '@playwright/test';

const guard=()=>fs.readFileSync('src/ExpedienteExistingBackfillGuard.tsx','utf8');
const gate=()=>fs.readFileSync('src/DetailShellGate.tsx','utf8');

test('expediente detail mounts the existing-document backfill guard on base and contextual routes',()=>{
 const code=gate();
 expect(code).toContain("import ExpedienteExistingBackfillGuard from './ExpedienteExistingBackfillGuard'");
 expect(code.match(/<ExpedienteExistingBackfillGuard expedienteCode=\{code\}/g)?.length).toBe(2);
});

test('backfill guard is production-only, role-gated and refuses terminal expediente stages',()=>{
 const code=guard();
 expect(code).toContain('if(!IS_PRODUCTION||!expedienteCode)return');
 expect(code).toContain("['direccion','financiero'].includes(normalize(role))");
 for(const stage of ['firmado','cerrado','cierre','finalizado','baja','perdido','pausado'])expect(code).toContain(`'${stage}'`);
 expect(code).toContain('if(!allowedStage(stage))return');
});

test('backfill guard uses canonical route directly and only resolves aliases through gateway',()=>{
 const code=guard();
 expect(code).toContain("const looksCanonicalExpediente=(value:string)=>/^exp-/i.test(value.trim())");
 expect(code).toContain('let canonicalCode=expedienteCode.trim()');
 expect(code).toContain('if(!looksCanonicalExpediente(canonicalCode))');
 expect(code).toContain("fetchAppApi<Detail>(`/expedientes/${encodeURIComponent(expedienteCode)}`)");
 expect(code).toContain("canonicalCode=String(row?.expediente_code??row?.expediente??'').trim()");
 expect(code).toContain("fetchEnvironmentApi<BackfillResult>('fenix-document-existing-backfill',''");
 expect(code).toContain("body:JSON.stringify({expediente_code:canonicalCode})");
 expect(code).toContain('batch<16');
 expect(code).toContain('remaining>=previousRemaining');
});

test('backfill guard waits for late auth and can role-gate from authenticated metadata when context is unavailable',()=>{
 const code=guard();
 expect(code).toContain('waitForAuthenticatedSession');
 expect(code).toContain('attempt<12');
 expect(code).toContain('session?.access_token');
 expect(code).toContain('function sessionRole');
 expect(code).toContain("const effectiveRole=ctx.status===200?ctx.data?.role:sessionRole(session)");
 expect(code).toContain('if(!allowedRole(effectiveRole))return');
 expect(code).toContain('supabase.auth.onAuthStateChange');
 expect(code).toContain("event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED'");
 expect(code).toContain('subscription.unsubscribe()');
 expect(code).toContain('if(cancelled||inFlight)return');
});
