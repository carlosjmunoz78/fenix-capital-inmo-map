import test from 'node:test';
import assert from 'node:assert/strict';
import {patchFact001DeleteReadbackLabV0 as patch,unpatchFact001DeleteReadbackLabV0 as undo} from './patch-existing-fact001-delete-readback-lab.mjs';
const fixture=()=>[
"import {pagesTick} from './pages-adapter.mjs';",
"const PREFIX='cerebro-fact001-managed-lab-';",
"async function remove(db,token,name,time){",
" await api(token,'DELETE','/'+name);",
" if((await list(token)).some(x=>x.id===name))throw Error('EXTERNAL_CHANGE_DETECTED');",
" return true;",
"}"
].join('\n');
test('replaces only post-DELETE single-list proof, fully reversible',()=>{
 const before=fixture(),r=patch(before);
 assert.equal(r.max_attempts,5);
 assert.equal(r.new_delete_readback,'TWO_CONSECUTIVE_LIST_AND_GET_404');
 assert(r.source.includes('verifyFact001DeleteConvergenceLabV0'));
 assert(r.source.includes("redirect:'manual'"));
 assert(r.source.includes("AbortSignal.timeout(9000)"));
 assert.equal(undo(r.source),before);
 assert.equal(r.source.split('async function remove').length,2);
});
test('wrong engine and duplicate anchor reject before any mutation',()=>{
 assert.throws(()=>patch(fixture().replace('fact001-managed-lab','jarvis-prod')),/BASELINE_DRIFT/);
 assert.throws(()=>patch(fixture()+fixture()),/BASELINE_DRIFT/);
 assert.throws(()=>patch(patch(fixture()).source),/BASELINE_DRIFT/);
 assert.throws(()=>undo(fixture()),/CANDIDATE_DRIFT/);
});
