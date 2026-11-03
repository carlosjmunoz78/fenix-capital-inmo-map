#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Runtime001DurableJob001LedgerAdapterV1 as Adapter} from '../runtime/runtime001-durable-job001-adapter-v1.mjs';
import {Runtime001SharedWorkerV1 as Worker} from '../runtime/runtime001-shared-worker-v1.mjs';

const mode=process.argv[2];
assert.ok(['prepare','verify'].includes(mode),'prepare or verify mode required');
const root=path.resolve(process.env.CEREBRO_CROSS_HOST_DIR||'/tmp/cerebro-runtime001-cross-host');
const journal=path.join(root,'job001-durable.v8journal');
const manifest=path.join(root,'PROVENANCE.json');
const context=Object.freeze({company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'cross-host-v1'});
const jobName='RUNTIME001_CROSS_HOST_SYNTHETIC_READONLY';
const idempotency='cross-host-v1-job';
const shaFile=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const open=()=>new Adapter({file_path:journal,environment:'PREPROD',now:()=>1700000000000});
async function prepare(){
 fs.mkdirSync(root,{recursive:true});
 const ledger=open();
 const accepted=ledger.enqueue({name:jobName,context,payload:{value:11},idempotency_key:idempotency});
 assert.equal(accepted.accepted,true);
 const audit=[];
 const worker=new Worker({ledger,engine_resolver:{async resolve(){return {async execute({payload}){return {number:payload.value*3,source:'synthetic'};}}}},
 policy:{async authorize(){return {allowed:true}}},
 audit:{append(e){audit.push(e)}},clock:()=>new Date(1700000000000).toISOString()});
 const outcome=await worker.runOnce({context,actor:{id:'cross-host-a'}});
 assert.equal(outcome.status,'SUCCEEDED');
 assert.equal(outcome.result.number,33);
 assert.ok(audit.some(x=>x.type==='RUNTIME001_JOB_SUCCEEDED'));
 const result={schema_version:'1.0.0',engine_id:'RUNTIME-001',environment:'PREPROD',context,
   job_id:accepted.job.job_id,idempotency_key:idempotency,expected_result:{number:33,source:'synthetic'},
   journal_sha256:shaFile(journal),source_revision:process.env.GITHUB_SHA||null,
   prod_write_authorized:false,trading_access:false,additional_subscription_eur:0};
 fs.writeFileSync(manifest,JSON.stringify(result,null,2)+'\n');
 console.log('RUNTIME_CROSS_HOST_PREPARED='+JSON.stringify({status:'GREEN',journal_sha256:result.journal_sha256}));
}
function verify(){
 const state=JSON.parse(fs.readFileSync(manifest,'utf8'));
 assert.deepEqual(state.context,context);
 assert.equal(state.journal_sha256,shaFile(journal),'artifact tampering detected');
 const ledger=open(),job=ledger.get(state.job_id);
 assert.equal(job.status,'SUCCEEDED');
 assert.deepEqual(job.result,state.expected_result);
 assert.equal(ledger.enqueue({name:jobName,context,payload:{value:11},idempotency_key:idempotency}).duplicate,true);
 assert.equal(ledger.listForContext({...context,company_id:'another-company'}).length,0);
 assert.throws(()=>ledger.enqueue({name:'PROD',context:{...context,environment:'PROD'},idempotency_key:'x'}),/CONTEXT_DENIED/);
 const corrupted=path.join(root,'corrupt.v8journal'),copy=fs.readFileSync(journal);
 copy[Math.floor(copy.length/2)]^=0xff;fs.writeFileSync(corrupted,copy);
 assert.throws(()=>new Adapter({file_path:corrupted,environment:'PREPROD'}),'corrupted durable journal must fail closed');
 const evidence={status:'GREEN_CROSS_RUNNER_DURABLE_ARTIFACT_RECOVERY',
  evidence_type:'TWO_SEPARATE_GITHUB_RUNNERS_SAME_ARTIFACT',context,
  checks:{journal_sha256_verified:true,reopen_on_new_runner:true,idempotency_after_restart:true,
   nonmatching_tenant_empty:true,prod_denied:true,corruption_detected:true},
  limitations:{permanent_host_deployed:false,independent_persistent_storage_provisioned:false,service_heartbeat_live:false},
  prod_writes:false,trading_access:false,additional_cost_eur:0};
 fs.writeFileSync(path.join(root,'CROSS_RUNNER_VERIFICATION.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('RUNTIME_CROSS_HOST_VERIFIED='+JSON.stringify(evidence));
}
if(mode==='prepare')await prepare();else verify();
