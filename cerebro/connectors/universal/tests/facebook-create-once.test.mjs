import test from 'node:test';
import assert from 'node:assert/strict';
import { runFacebookOnce, allowFreeMutation } from '../bootstrap/facebook-create-once.mjs';
import { GitHubRefLedger, fingerprintOf } from '../bootstrap/github-ledger.mjs';

const UUID='79b79462-6268-4513-9476-dff55d11e016';
const scopeEnv={
 GITHUB_REF_NAME:'cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109',
 GITHUB_REPOSITORY:'carlosjmunoz78/fenix-capital-inmo-map',GITHUB_EVENT_NAME:'push',
 GITHUB_SHA:'f'.repeat(40), GITHUB_TOKEN:'GITHUB_TEST_TOKEN_NEVER_REAL',
 CEREBRO_CLOUDFLARE_API_TOKEN:'CF_TEST_TOKEN_NEVER_REAL',
 CEREBRO_FACEBOOK_D1_WRITE_ARMED:'YES_LAB_ONLY_2026_11_09'
};
const attestation={verified_token_active:true,verified_account_d1_scope:true,verified_account_workers_scope:true,d1_count:7,facebook_d1_exists:false,writes_executed:false};
const date=new Date('2026-11-09T16:30:00Z');
function fixtures({preflight=attestation,claim='CLAIMED',durable=true,createdStatus='COMPLETED'}={}){
 let count=0,completion=0,claimCount=0;
 return {
  ledger:{durable,async claim(){claimCount++;return {status:claim};},async complete(){completion++;}},
  api:{async perform(){count++;return {status:createdStatus,uuid:UUID,name:'cerebro-facebook-autoqual-lab',jurisdiction:'eu',verified:true};}},
  preflightFn:async()=>preflight,
  counts:()=>({count,completion,claimCount})
 };
}
async function safeRun(f, env=scopeEnv,now=date){return runFacebookOnce({env,now,ledger:f.ledger,api:f.api,preflightFn:f.preflightFn});}
test('only exact, recent Workers Free account evidence + quota allows a LAB write',()=>{
 assert.equal(allowFreeMutation({now:date,preflight:attestation}),true);
 assert.equal(allowFreeMutation({now:new Date('2026-11-10T01:00:00Z'),preflight:attestation}),false);
 assert.equal(allowFreeMutation({now:date,preflight:{...attestation,d1_count:10}}),false);
 assert.equal(allowFreeMutation({now:date,preflight:{...attestation,facebook_d1_exists:true}}),false);
 assert.equal(allowFreeMutation({now:date,preflight:{...attestation,verified_account_workers_scope:false}}),false);
 assert.equal(allowFreeMutation({now:date,evidence:{account_id:'wrong',plan:'Workers Free',observed_date:'2026-11-09',source:'Cloudflare authenticated Billing/Subscriptions UI'},preflight:attestation}),false);
});
test('creates exactly once and persists successful completion',async()=>{
 const f=fixtures();
 const r=await safeRun(f);
 assert.equal(r.uuid,UUID);assert.equal(r.verified,true);
 assert.deepEqual(f.counts(),{count:1,completion:1,claimCount:1});
});
test('no mutation if unarmed or repo, branch or event differs',async()=>{
 const f=fixtures();
 for(const patch of [
  {CEREBRO_FACEBOOK_D1_WRITE_ARMED:''},{GITHUB_REF_NAME:'main'},
  {GITHUB_REPOSITORY:'other/repo'},{GITHUB_EVENT_NAME:'pull_request'}
 ])await assert.rejects(safeRun(f,{...scopeEnv,...patch}),/UNAUTHORIZED_RUN_CONTEXT|NOT_ARMED/);
 assert.deepEqual(f.counts(),{count:0,completion:0,claimCount:0});
});
test('no external writes or GitHub intent created when Free gate is unknown',async()=>{
 const f=fixtures({preflight:{...attestation,d1_count:10}});
 await assert.rejects(safeRun(f),/FREE_GATE_NOT_ATTESTED/);
 assert.deepEqual(f.counts(),{count:0,completion:0,claimCount:0});
});
test('pending/uncertain prior attempt refuses any retry',async()=>{
 const f=fixtures({claim:'PENDING'});
 await assert.rejects(safeRun(f),/PREVIOUS_UNCERTAIN_INTENT_RECONCILE_MANUALLY/);
 assert.deepEqual(f.counts(),{count:0,completion:0,claimCount:1});
});
test('replayed completed attempt never writes a second D1',async()=>{
 const f=fixtures({claim:'REPLAY'});
 f.ledger.claim=async()=>({status:'REPLAY',result:{uuid:UUID}});
 const result=await safeRun(f);
 assert.equal(result.status,'ALREADY_COMPLETED_PERSISTED');assert.equal(f.counts().count,0);
});
test('fail closed for non-durable store and API unexpected result',async()=>{
 const f=fixtures({durable:false});await assert.rejects(safeRun(f),/DURABLE_LEDGER_REQUIRED/);
 assert.deepEqual(f.counts(),{count:0,completion:0,claimCount:0});
 const g=fixtures({createdStatus:'UNKNOWN'});await assert.rejects(safeRun(g),/D1_NOT_VERIFIED/);
 assert.deepEqual(g.counts(),{count:1,completion:0,claimCount:1});
});
test('GitHub ref ledger implements atomic claim/complete & replay using git commits',async()=>{
 const refs=new Map();const commits=new Map();const base='f'.repeat(40),tree='b'.repeat(40);
 commits.set(base,{sha:base,tree:{sha:tree},message:'baseline'});
 let counter=0;
 const http=async(url,{method,body})=>{
  const path=new URL(url).pathname.split('/repos/carlosjmunoz78/fenix-capital-inmo-map')[1];
  const d=body?JSON.parse(body):null;
  const resp=(status,obj)=>({status,ok:status>=200&&status<300,json:async()=>obj});
  if(method==='GET'&&path.startsWith('/git/ref/')){const ref='refs/'+path.slice('/git/ref/'.length);return refs.has(ref)?resp(200,{object:{sha:refs.get(ref)}}):resp(404,{});}
  if(method==='GET'&&path.startsWith('/git/commits/')){const sha=path.split('/').pop();return commits.has(sha)?resp(200,commits.get(sha)):resp(404,{});}
  if(method==='POST'&&path==='/git/commits'){
   counter++;const sha=counter.toString(16).padStart(40,'0');commits.set(sha,{sha,tree:{sha:d.tree},message:d.message,parents:d.parents});return resp(201,{sha});
  }
  if(method==='POST'&&path==='/git/refs'){
   if(refs.has(d.ref))return resp(422,{});
   refs.set(d.ref,d.sha);return resp(201,{ref:d.ref,object:{sha:d.sha}});
  }
  if(method==='PATCH'&&path.startsWith('/git/refs/')){
   const ref='refs/'+path.slice('/git/refs/'.length),cur=refs.get(ref),commit=commits.get(d.sha);
   if(!cur||!commit?.parents?.includes(cur))return resp(422,{});
   refs.set(ref,d.sha);return resp(200,{object:{sha:d.sha}});
  }
  throw new Error('Unexpected endpoint: '+method+' '+path);
 };
 const ledger=new GitHubRefLedger({token:'FAKE',repo:'carlosjmunoz78/fenix-capital-inmo-map',baseCommit:base,http});
 const key='github-actions:iam:fenix-owner-lab:fenix-capital:LAB:facebook-eu-create-v0',fingerprint=fingerprintOf({foo:'bar'});
 assert.deepEqual(await ledger.claim(key,fingerprint),{status:'CLAIMED'});
 assert.deepEqual(await ledger.claim(key,fingerprint),{status:'PENDING'});
 assert.deepEqual(await ledger.claim(key,'0'.repeat(64)),{status:'CONFLICT'});
 await ledger.complete(key,fingerprint,{status:'COMPLETED',uuid:UUID,name:'cerebro-facebook-autoqual-lab',jurisdiction:'eu'});
 const again=await ledger.claim(key,fingerprint);
 assert.equal(again.status,'REPLAY');assert.equal(again.result.uuid,UUID);
 assert.equal(refs.size,1);
});
test('secure ledger rejects wrong repository and secret omission',()=>{
 assert.throws(()=>new GitHubRefLedger({repo:'any/other',token:'abc',baseCommit:'f'.repeat(40)}),/REPO_MISMATCH/);
 assert.throws(()=>new GitHubRefLedger({repo:'carlosjmunoz78/fenix-capital-inmo-map',baseCommit:'f'.repeat(40)}),/GITHUB_TOKEN_MISSING/);
});