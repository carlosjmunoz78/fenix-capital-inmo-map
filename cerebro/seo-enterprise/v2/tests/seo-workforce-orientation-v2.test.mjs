import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runSeoKnowledgeOrientation,verifySeoKnowledgeOrientation} from '../runtime/seo-workforce-orientation-v2.mjs';
const temp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-141-'));t.after(()=>fs.rmSync(dir,{force:true,recursive:true}));return path.join(dir,'orientation.v8');};
test('141 role templates route through durable JOB-001, re-open and replay idempotently; still not trained agents',t=>{
 const file_path=temp(t);
 const a=runSeoKnowledgeOrientation({file_path});
 assert.equal(a.newly_enqueued,141);assert.equal(a.job_states.SUCCEEDED,141);
 assert.equal(a.passed_contract_orientation,true);
 assert.equal(a.actual_iam_agents,0);assert.equal(a.training_certifications,0);
 assert.equal(a.external_actions,0);assert.equal(a.prod_activated,false);
 const verification=verifySeoKnowledgeOrientation({file_path});
 assert.equal(verification.status,'LAB_CONTRACT_ORIENTATION_VERIFIED');
 const b=runSeoKnowledgeOrientation({file_path});
 assert.equal(b.newly_enqueued,0);assert.equal(b.deduplicated,141);
 assert.equal(b.job_states.SUCCEEDED,141);assert.equal(b.training_certifications,0);
});
test('invalid workspace or missing journal does not silently create a safe execution',()=>{
 assert.throws(()=>runSeoKnowledgeOrientation({file_path:''}),/JOURNAL_FILE/);
 assert.throws(()=>runSeoKnowledgeOrientation({file_path:'x',now_ms:-3}),/JOURNAL_FILE/);
});
