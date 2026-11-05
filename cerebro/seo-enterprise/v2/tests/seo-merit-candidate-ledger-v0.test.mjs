import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {scorecardCandidate} from '../runtime/seo-merit-candidate-ledger-v0.mjs';
const dirPath=fileURLToPath(new URL('../runtime/',import.meta.url));
const run=(filename,args)=>spawnSync(process.execPath,[path.join(dirPath,filename),...args],{encoding:'utf8',timeout:9000});
test('independently evaluated worker merit is durable, idempotent, unpaid, and cannot grant permissions',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-merit-lab-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const html=path.join(dir,'html.txt'),headers=path.join(dir,'headers.txt'),journal=path.join(dir,'job.v8');
 const w=path.join(dir,'w.json'),q=path.join(dir,'q.json'),j=path.join(dir,'j.json'),ledger=path.join(dir,'merit.v8');
 fs.writeFileSync(html,'<html><head><title>Fénix Capital</title><meta name="robots" content="noindex"></head><body><h1>Fénix Capital</h1>Una furura hipoteca en Córdoba.</body></html>');
 fs.writeFileSync(headers,'HTTP/2 200\n');
 for(const [script,args] of [
  ['seo-job001-workunit-v0.mjs',[html,headers,'200',journal,w]],
  ['seo-job001-independent-review-v0.mjs',[html,headers,'200',journal,w,q]],
  ['seo-job001-tribunal-v0.mjs',[w,q,j]]
 ]){const p=run(script,args);assert.equal(p.status,0,p.stderr);}
 const proof={worker_receipt:JSON.parse(fs.readFileSync(w)),independent_review:JSON.parse(fs.readFileSync(q)),tribunal_result:JSON.parse(fs.readFileSync(j)),file_path:ledger};
 const first=scorecardCandidate(proof),second=scorecardCandidate(proof);
 assert.equal(first.duplicate,false);assert.equal(second.duplicate,true);
 assert.equal(first.history_entries,1);assert.equal(second.history_entries,1);
 assert.equal(first.record.metrics.learning,0);assert.equal(first.record.score,95);
 assert.equal(first.record.awarded,false);assert.equal(first.record.autonomy_changed,false);
 assert.deepEqual(first.record.permission_changes,[]);assert.equal(first.record.money_changes_eur,0);
 assert.equal(first.record.role_identity_cryptographically_verified,false);
 assert.equal(first.record.unresolved_peer_reviews.length,2);
 assert.equal(first.ledger_sha256,second.ledger_sha256);
 assert.throws(()=>scorecardCandidate({...proof,subject_role_id:'SEO_JUDGE_A',subject_class:'JUDGE'}),/MERIT_INDEPENDENCE_DENIED|NO_INDEPENDENT_META_REVIEW/);
 assert.throws(()=>scorecardCandidate({...proof,independent_review:{...proof.independent_review,role_id:'SEO_D15_WORKER'}}),/MERIT_INDEPENDENCE_DENIED/);
 assert.throws(()=>scorecardCandidate({...proof,tribunal_result:{...proof.tribunal_result,website_publication_allowed:true}}),/UNSAFE_EVIDENCE_DENIED/);
});
