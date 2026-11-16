import test from 'node:test';
import assert from 'node:assert/strict';
import {patchOriginalFact001RunnerLabV0,unpatchFact001RunnerLabV0} from './patch-existing-fact001-runner-lab.mjs';
const original=()=>[
 "import {pagesTick} from './pages-adapter.mjs';",
 "// Local fixture, NOT the live Worker script or any secret.",
 "export const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});",
 "async function remove(db,token,name,time){return 'OWNED_WORKER_REMOVED';}",
 "export async function tick(env,time=Date.now()){",
 " const job={id:'fixture'}; const out={attempts:1}; const state='COMPLETED';",
 " // Event already written by the existing runtime; hook goes before return.",
 " return {status:state,request_id:job.request_id,attempts:out.attempts};",
 "}",
 "// Do not alter preexisting job/worker routines or schedules.",
 "// FILLER ".repeat(1200)
].join('\n');
test('strict original-runner patch changes only import + guarded hook, fully reversible byte for byte',()=>{
 const before=original();
 const patch=patchOriginalFact001RunnerLabV0(before);
 assert.equal(patch.default_state,'OFF');
 assert.equal(patch.old_behavior_preserved_when_flag_absent,true);
 assert.match(patch.source,/FACT001_RECEIPTS_ENABLED==='true'/);
 assert.match(patch.source,/emitFact001ReceiptIfEnabledLabV0/);
 assert.equal(unpatchFact001RunnerLabV0(patch.source),before);
 assert.equal((patch.source.match(/return \{status:state,request_id:job.request_id,attempts:out.attempts\};/g)||[]).length,1);
});
test('never patch changed baseline, duplicate markers, wrong environment or already patched script',()=>{
 const before=original();
 assert.throws(()=>patchOriginalFact001RunnerLabV0(before.replace("environment:'LAB'","environment:'PROD'")),/UNRECOGNIZED/);
 assert.throws(()=>patchOriginalFact001RunnerLabV0(before+'\\n'+
  " return {status:state,request_id:job.request_id,attempts:out.attempts};"),/UNRECOGNIZED/);
 const patched=patchOriginalFact001RunnerLabV0(before).source;
 assert.throws(()=>patchOriginalFact001RunnerLabV0(patched),/UNRECOGNIZED/);
 assert.throws(()=>unpatchFact001RunnerLabV0(before),/UNKNOWN/);
});
test('not a generic executor: unauthorized / wrong runtime signature rejected',()=>{
 assert.throws(()=>patchOriginalFact001RunnerLabV0(''),/UNRECOGNIZED/);
 assert.throws(()=>patchOriginalFact001RunnerLabV0(original().replace('async function remove(db,token,name,time)','function other()')),/UNRECOGNIZED/);
});
