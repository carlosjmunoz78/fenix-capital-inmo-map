import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
export const NAME='cronos.lab-evidence.intake.v1';
export const CTX=Object.freeze({company_id:'fenix',engine_id:'JOB-001',environment:'PREPROD',version:'cronos-intake-lab-v1'});
export const SOURCE=Object.freeze({workflow:'cerebro-cronos-live005-lab-eu',instance_id:'cronos-live005-20261126',workflow_version:'0a0e4a6b-881f-4fd5-a230-7a67ca072050'});
const roles=['ATLAS','HERMES','CENTINELA'];
const hashes=['d4d2b5eb15328d0717ecd2c1911afa6cd079e53556ec04816524842a5bbc03bc','41d075b1fd554f2d7fa53d8ddfd1e636c0a0ae2032f37460c14a2bd2f240cd91','a3d7f5616a1be8f9053db674782892134f7a3291395974731dbaad3c39d0609c'];
const expected=[{layers:[['K','M'],['N'],['O']]},{A:'ALLOW',B:'DENY',C:'DENY'},{graph_correct:true,authorization_correct:true,verdict:'PASS'}];
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const require=(x,c)=>{if(!x)throw new Error(c)};
const validNum=n=>Number.isFinite(n)&&n>=0;
const payload=Object.freeze({source:SOURCE,classification:'HISTORICAL_LAB_EVIDENCE_ONLY'});
export function verifyReadback(e){
 require(equal(e?.source,SOURCE),'SOURCE_SCOPE');
 const p=e.provider,o=p?.output;
 require(p?.status==='complete'&&p.success===true&&p.error===null,'PROVIDER_NOT_COMPLETE');
 require([p.start,p.end,e.observed_at].every(t=>typeof t==='string'&&Number.isFinite(Date.parse(t)))&&Date.parse(p.start)<=Date.parse(p.end)&&Date.parse(p.end)<=Date.parse(e.observed_at),'TIMESTAMP');
 require(o?.company_id==='fenix'&&o.engine_id==='CRONOS-001'&&o.environment==='LAB'&&o.version==='0.1.2-workflow-pilot'&&o.mission_id===SOURCE.instance_id,'EVIDENCE_SCOPE');
 require(o.status==='WAITING_USER'&&o.reason==='MISSION_COMPLETE'&&o.production_authorized===false&&o.paid_fallback===false&&o.next_mission_started===false,'RESULT_SCOPE');
 require(o.calls===3&&Array.isArray(o.receipts)&&o.receipts.length===3&&Array.isArray(p.steps)&&p.steps.length===3,'CALL_COUNT');
 const ids=new Set();let neurons=0;
 for(let i=0;i<3;i++){
  const r=o.receipts[i],s=p.steps[i],{sha256,...body}=r??{};
  require(r?.role===roles[i]&&r.valid===true&&r.finish_reason==='stop'&&r.model_requested==='@cf/meta/llama-3.3-70b-instruct-fp8-fast'&&r.model_returned==='@cf/meta/llama-3.3-70b-instruct-sd','RECEIPT_POLICY');
  require(typeof r.provider_id==='string'&&/^chatcmpl-[a-f0-9-]{36}$/.test(r.provider_id)&&!ids.has(r.provider_id),'PROVIDER_ID');ids.add(r.provider_id);
  require(validNum(r.neurons)&&Number.isSafeInteger(r.prompt_tokens)&&r.prompt_tokens>=0&&Number.isSafeInteger(r.completion_tokens)&&r.completion_tokens>=0&&r.completion_tokens<=128,'USAGE');neurons+=r.neurons;
  require(sha256===hashes[i]&&sha(body)===sha256,'RECEIPT_DIGEST');
  require(s?.name==='ai-'+roles[i]+'-1'&&s.success===true&&s.retries===0&&s.attempt_count===1&&equal(s.output,r),'STEP_MISMATCH');
  require(equal(r.parsed,expected[i]),'ORACLE_MISMATCH');
 }
 require(validNum(o.neurons_total)&&Math.abs(neurons-o.neurons_total)<1e-8&&neurons<=100,'USAGE_TOTAL');
 return Object.freeze({status:'LAB_EVIDENCE_RECORDED',source:SOURCE,source_environment:'LAB',ledger_environment:'PREPROD',verification:'PINNED_HASH_AND_HISTORICAL_API_READBACK',receipt_hashes:hashes.slice(),provider_ids:[...ids],neurons_total:neurons,proof_sha256:sha(e),provider_signature_verified:false,formal_tribunal_verified:false,production_authorized:false,promotion_authorized:false,provider_calls:0,paid_fallback:false});
}
export function enqueueIntake({runtime,actor}){
 require(actor?.principal_id==='host:cronos-intake-lab'&&actor?.scopes?.includes('cronos:evidence:read')&&actor.company_id===CTX.company_id,'ACTOR_SCOPE');
 const r=runtime.enqueue({name:NAME,context:CTX,payload,priority:100,max_attempts:1,timeout_ms:10000,idempotency_key:'cronos-intake:'+SOURCE.instance_id,correlation_id:SOURCE.instance_id});
 require(equal(r.job.context,CTX)&&r.job.name===NAME&&equal(r.job.payload,payload)&&r.job.max_attempts===1,'JOB_CONFLICT');return r;
}
export function registerIntake({runner,readback}){
 require(typeof readback==='function','TRUSTED_READ_PORT_REQUIRED');
 runner.register({name:NAME,handler:async ({job,context,payload:input,signal,heartbeat,checkpoint})=>{
  require(equal(context,CTX)&&equal(input,payload)&&job.max_attempts===1&&job.attempts===1&&!job.checkpoint,'JOB_SCOPE');
  require(!signal.aborted,'ABORTED');heartbeat();checkpoint({stage:'READ_ONLY_INTENT',source:SOURCE});
  const e=await readback(SOURCE,{signal});require(!signal.aborted,'ABORTED');const result=verifyReadback(e);
  checkpoint({stage:'EVIDENCE_VERIFIED',proof_sha256:result.proof_sha256});return result;
 }});return runner;
}