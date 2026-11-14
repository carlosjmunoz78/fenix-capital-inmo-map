import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {UniversalGatewayLabV0} from './control-plane.mjs';
import {createUniversalSdkV0} from './interface-sdk.mjs';
import {createFenixOwnerContextResolverV0} from './owner-auth-adapter.mjs';
import {createIsolatedJob001LabReaderV0} from './job001-isolated-reader.mjs';
import {startLoopbackUniversalLabV0,EphemeralLabEvidenceV0} from './loopback-transport.mjs';
import {DurableJobRuntimeV1} from '../../runtime/durable-job-runtime-v1.mjs';

const registry=JSON.parse(fs.readFileSync(new URL('../../registry/engine-registry.v1.json',import.meta.url),'utf8'));
const TOKEN='lab-owner-token-not-secret-1234567890';
const KEY='lab-test-publishable-key-no-secret';
const ctx={company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'0.1.0-lab'};
const lab={...ctx,environment:'LAB'};
function fixture(t,prefix){const dir=fs.mkdtempSync(path.join(os.tmpdir(),prefix));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function verifiedFetch(url,opts){
 assert.equal(url,'https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context');
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
 if(opts.headers.authorization!=='Bearer '+TOKEN)return Promise.resolve(new Response('{}',{status:403}));
 return Promise.resolve(new Response(JSON.stringify({ok:true,context:{actor_code:'CARLOS-ADMIN'}}),{status:200,headers:{'content-type':'application/json'}}));
}
function durable(t){
 const dir=fixture(t,'cerebro-universal-v0-fixture-');
 const runtime=new DurableJobRuntimeV1({file_path:path.join(dir,'jobs.v8journal')});
 const submitted=runtime.enqueue({name:'fact.registry.probe',context:ctx,payload:{sensitive:'NEVER_EXPOSE_PAYLOAD'},priority:9,idempotency_key:'fixture-a'});
 runtime.enqueue({name:'another.tenant',context:{...ctx,company_id:'aion'},payload:{private:'secret'},priority:8,idempotency_key:'fixture-b'});
 return{runtime,dir,id:submitted.job.job_id};
}
test('server-auth: actual Fenix GET identity contract, no client-granted multi-company scopes',async()=>{
 const resolver=createFenixOwnerContextResolverV0({apiKey:KEY,fetchImpl:verifiedFetch});
 const actor=await resolver(TOKEN);
 assert.equal(actor.actor_id,'CARLOS-ADMIN');
 assert.deepEqual([...actor.company_ids],['fenix']);
 assert.equal(actor.scopes.includes('cerebro:command:dryrun'),true);
 await assert.rejects(resolver('invalid-but-longer-than-20-chars'),/AUTH_DENIED/);
 assert.equal(actor.scopes.includes('cerebro:prod:write'),false);
});
test('JOB-001: real durable class, isolation filter and explicit original PREPROD provenance',t=>{
 const {runtime,dir,id}=durable(t);
 const read=createIsolatedJob001LabReaderV0({runtime,fixture_directory:dir});
 const jobs=read.listForContext(lab);
 assert.equal(jobs.length,1);assert.equal(jobs[0].job_id,id);
 assert.equal(jobs[0].context.environment,'LAB');
 assert.equal(jobs[0].origin_environment,'PREPROD');
 assert.equal(jobs[0].payload_redacted,true);
 assert.equal(JSON.stringify(jobs).includes('NEVER_EXPOSE'),false);
 assert.equal(read.source,'ISOLATED_JOB001_V1_FIXTURE_NOT_LIVE');
 assert.throws(()=>read.listForContext({...lab,environment:'PROD'}),/LAB_CONTEXT_REQUIRED/);
 assert.throws(()=>read.listForContext({...lab,engine_id:'LAB-TRD'}),/TRADING_ISOLATED/);
});
test('JOB-001 refuses non-ephemeral journal paths',t=>{
 const dir=fixture(t,'unsafe-job001-dir-');
 const runtime=new DurableJobRuntimeV1({file_path:path.join(dir,'jobs.v8journal')});
 assert.throws(()=>createIsolatedJob001LabReaderV0({runtime,fixture_directory:dir}),/UNSAFE_JOURNAL_DIRECTORY/);
});
test('JARVIS and Operativa SDK over actual loopback HTTP with owner resolver; rollback and audit chain',async t=>{
 const {runtime,dir,id}=durable(t);
 const reader=createIsolatedJob001LabReaderV0({runtime,fixture_directory:dir});
 const auth=createFenixOwnerContextResolverV0({apiKey:KEY,fetchImpl:verifiedFetch});
 const gateway=new UniversalGatewayLabV0({registry,authenticate:auth,jobs:reader});
 const evidenceDir=fixture(t,'cerebro-universal-v0-evidence-');
 const evidence=new EphemeralLabEvidenceV0({directory:evidenceDir});
 const srv=await startLoopbackUniversalLabV0({gateway,evidence});
 t.after(async()=>{await srv.close().catch(()=>{});});
 assert.equal(srv.address,'127.0.0.1');
 const transport=async args=>{
  const response=await fetch(srv.url,{method:'POST',headers:{authorization:'Bearer '+args.session_token,'content-type':'application/json'},body:JSON.stringify({action:args.action,params:args.params,session_token:'forged-payload-session'})});
  const body=await response.json();if(!response.ok)throw Error(body.reason);return body;
 };
 const operativa=createUniversalSdkV0({request:transport,session_token:TOKEN,company_id:'fenix'});
 const jarvis=createUniversalSdkV0({request:transport,session_token:TOKEN,company_id:'fenix'});
 const a=await operativa.listCapabilities(),b=await jarvis.listCapabilities();
 assert.deepEqual(a.capabilities,b.capabilities);
 assert.equal(a.capabilities.length,1);
 const read=await jarvis.invokeRead('fact.registry.summary');
 assert.equal(read.result.engine_registry_count,179);
 const queue=await operativa.listJobs('FACT-001','0.1.0-lab');
 assert.equal(queue.jobs.length,1);assert.equal(queue.jobs[0].job_id,id);
 assert.equal(queue.jobs[0].provenance,'JOB001_V1_EPHEMERAL_TEST_JOURNAL');
 const d=await jarvis.dryRun('FACT-001','fact.registry.summary','0.1.0-lab',{},'phase2');
 assert.equal(d.executed,false);
 await assert.rejects(createUniversalSdkV0({request:transport,session_token:TOKEN,company_id:'aion'}).listCapabilities(),/COMPANY_SCOPE_DENIED/);
 await assert.rejects(createUniversalSdkV0({request:transport,session_token:'some-other-token-not-allowed-0123',company_id:'fenix'}).listCapabilities(),/AUTH_DENIED/);
 const untrusted=await fetch(srv.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session_token:TOKEN,action:'list_capabilities',params:{company_id:'fenix',environment:'LAB'}})});
 assert.equal(untrusted.status,401);
 const entries=evidence.read();
 assert.ok(entries.length>=7);
 assert.equal(JSON.stringify(entries).includes(TOKEN),false);
 assert.equal(JSON.stringify(entries).includes('NEVER_EXPOSE'),false);
 assert.doesNotThrow(()=>new EphemeralLabEvidenceV0({directory:evidenceDir}));
 await srv.close();
 await assert.rejects(fetch(srv.url,{method:'POST'}),/fetch failed/);
});
test('durable LAB evidence detects tampering and contains metadata only',t=>{
 const dir=fixture(t,'cerebro-universal-v0-evidence-');
 const j=new EphemeralLabEvidenceV0({directory:dir});
 j.append({action:'invoke_read',outcome:'READ_EXECUTED',request_id:'r1',company_id:'fenix',session_token:TOKEN,payload:{secret:'no'}});
 assert.equal(j.read().length,1);
 assert.equal(JSON.stringify(j.read()).includes(TOKEN),false);
 const f=path.join(dir,'evidence.jsonl');
 fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('READ_EXECUTED','ACTION_EXECUTED'));
 assert.throws(()=>new EphemeralLabEvidenceV0({directory:dir}),/EVIDENCE_CHAIN_INVALID/);
});
