import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('process inspector exposes real timing and failure diagnostics without inventing causes',async()=>{
 const api=read('src/cerebroActivityApi.ts');
 const edge=read('supabase/functions/cerebro-console-activity-v0/index.ts');
 const operative=read('src/CerebroOperativeConsole.tsx');

 expect(api).toContain('export async function fetchCerebroActivityRunDetail(runId:number)');
 expect(api).toContain("endpoint.searchParams.set('run_id',String(runId))");
 expect(api).toContain('duration_ms:number|null');
 expect(api).toContain('failure_summary:string|null');
 expect(api).toContain('failed_steps:CerebroActivityFailedStep[]');

 expect(edge).toContain('const runIdRaw=url.searchParams.get("run_id")');
 expect(edge).toContain('async function loadRunDetail(runId:number)');
 expect(edge).toContain('failed_job:firstStep?.job_name');
 expect(edge).toContain('failed_step:firstStep?.step_name');
 expect(edge).toContain('failure_summary:failureSummary');
 expect(edge).toContain('duration_ms:durationMs(startedAt,completedAt)');

 expect(operative).toContain('fetchCerebroActivityRunDetail(selectedRun.run_id)');
 expect(operative).toContain('<small>Inicio</small>');
 expect(operative).toContain('<small>Finalización</small>');
 expect(operative).toContain('<small>Duración</small>');
 expect(operative).toContain('<span>Qué ha pasado</span>');
 expect(operative).toContain("No voy a atribuir una causa que GitHub no haya publicado.");
 expect(operative).toContain('runDetail?.failure_summary');
});
