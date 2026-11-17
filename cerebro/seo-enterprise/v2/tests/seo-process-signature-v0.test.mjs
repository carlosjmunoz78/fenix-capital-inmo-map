import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {sealProcessReceipt,verifyProcessReceipt} from '../runtime/seo-process-signature-v0.mjs';
const runtime=fileURLToPath(new URL('../runtime/',import.meta.url));
const invoke=(name,args)=>spawnSync(process.execPath,[path.join(runtime,name),...args],{encoding:'utf8',timeout:9000});
test('three OS processes produce distinct verifiable ED25519 receipts, not provider IAM',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v2-ed25519-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const p=x=>path.join(root,x);
 fs.writeFileSync(p('index.html'),'<html><head><title>Fénix Córdoba</title><meta name="robots" content="noindex"></head><body><h1>Fénix Capital</h1>Hipotecas en Córdoba</body></html>');
 fs.writeFileSync(p('headers.txt'),'HTTP/2 200\n');
 for(const [script,args] of [
  ['seo-job001-workunit-v0.mjs',[p('index.html'),p('headers.txt'),'200',p('job.v8'),p('worker.json')]],
  ['seo-job001-independent-review-v0.mjs',[p('index.html'),p('headers.txt'),'200',p('job.v8'),p('worker.json'),p('review.json')]],
  ['seo-job001-tribunal-v0.mjs',[p('worker.json'),p('review.json'),p('verdict.json')]]
 ]){const r=invoke(script,args);assert.equal(r.status,0,r.stderr);}
 const w=JSON.parse(fs.readFileSync(p('worker.json'))),q=JSON.parse(fs.readFileSync(p('review.json'))),j=JSON.parse(fs.readFileSync(p('verdict.json')));
 for(const [receipt,role] of [[w,'SEO_D15_WORKER'],[q,'SEO_D31_QA'],[j,'SEO_JUDGE_A']]){
  const verdict=verifyProcessReceipt({receipt,expected_role:role});
  assert.equal(verdict.valid,true);assert.equal(verdict.external_iam_attested,false);
  assert.equal(verdict.same_host_trust_boundary,true);
  assert.equal(receipt.process_proof.payload.root_of_trust,'SELF_GENERATED_EPHEMERAL_PROCESS_KEY');
  assert.equal(JSON.stringify(receipt).includes('PRIVATE KEY'),false);
 }
 assert.equal(new Set([w.process_proof.payload.public_spki_pem,q.process_proof.payload.public_spki_pem,j.process_proof.payload.public_spki_pem]).size,3);
 assert.equal(j.all_roles_iam_authenticated,false);
 const altered={...q,review_status:'FABRICATED',process_proof:q.process_proof};
 assert.throws(()=>verifyProcessReceipt({receipt:altered,expected_role:'SEO_D31_QA'}),/PROCESS_RECEIPT_TAMPERED/);
 const forged={...w,process_proof:{...w.process_proof,signature_base64:'invalid'}};
 assert.throws(()=>verifyProcessReceipt({receipt:forged,expected_role:'SEO_D15_WORKER'}),/PROCESS_SIGNATURE_INVALID/);
 const wrong={...w,process_proof:w.process_proof,worker_process_pid:888888};
 assert.throws(()=>verifyProcessReceipt({receipt:wrong,expected_role:'SEO_D15_WORKER'}),/PROCESS_PID_MISMATCH/);
});
test('role signing cannot be reassigned or used to certify a meta supervisor',()=>{
 assert.throws(()=>sealProcessReceipt({role_id:'SEO_D31_QA',receipt:{worker_role_id:'SEO_D15_WORKER',worker_process_pid:process.pid}}),/PROCESS_ROLE_MISMATCH/);
 assert.throws(()=>sealProcessReceipt({role_id:'SEO_META_SUPERVISOR',receipt:{role_id:'SEO_META_SUPERVISOR'}}),/UNREGISTERED_PROCESS_ROLE/);
});
