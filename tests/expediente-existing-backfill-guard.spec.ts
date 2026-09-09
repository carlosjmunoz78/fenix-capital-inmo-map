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

test('backfill guard uses authenticated environment fetch and bounded progress loop',()=>{
 const code=guard();
 expect(code).toContain("fetchEnvironmentApi<BackfillResult>('fenix-document-existing-backfill',''");
 expect(code).toContain("body:JSON.stringify({expediente_code:expedienteCode})");
 expect(code).toContain('batch<16');
 expect(code).toContain('remaining>=previousRemaining');
});
