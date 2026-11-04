/** B6 CUT02 end-to-end: real PostgreSQL claim journal + real GitHub read,
 * one shared logical executor, under synthetic CI-only B2/B3 and LAB environment.
 * No business mutation; no deploy and no user credential exposure.
 */
import assert from 'node:assert/strict';
import {createJarvisB6ControlledRead} from '../core/jarvis-b6-controlled-read.mjs';
import {createJarvisB6CapabilityPreflight} from '../core/jarvis-b6-capability-preflight.mjs';
import {createJarvisB6PgJournal} from '../core/jarvis-b6-pg-journal.mjs';
import {b6CiPsqlQuery} from './b6-ci-psql-query.mjs';
import {createJarvisB6AllowlistedGitHubRead,createJarvisB6GitHubStateVerifier}
 from '../core/jarvis-b6-github-read-adapter.mjs';

const token=process.env.GITHUB_TOKEN,sha=process.env.JARVIS_B6_COMMIT_SHA;
if(!token||!/^[0-9a-f]{40}$/.test(sha||''))throw Error('B6_CUT02_TRUSTED_CI_INPUT_REQUIRED');

const task={token:'b2-synthetic-ci',companyId:'fenix',environment:'LAB',sessionId:'ci-session',
 missionId:'ci-b6-cut02',capability:'GITHUB_FILE_READ',idempotencyKey:'same-key'};
const id='jarvis-b6-allowlisted-github-read',auditEvents=[];
const owner={ownerId:'synthetic-ci-owner',sessionId:task.sessionId,roles:['OWNER_ROOT'],authorizedCompanies:['fenix']};
const identityProvider={verify:async key=>{
 if(key!==task.token)throw Error('B2_SESSION_DENIED');
 return owner;
}};
const policy={authorize:async req=>({
 decision:req.companyId==='fenix'&&req.environment==='LAB'&&
  ['JARVIS_CAPABILITY_DISCOVER','JARVIS_CAPABILITY_EXECUTE_READ'].includes(req.actionName)?'ALLOW':'DENY'
})};
const audit={append:async e=>{auditEvents.push(e);return true;}};
const registry={list:async()=>[{
 id,companyId:'fenix',environment:'LAB',capability:task.capability,route:'API',
 isolation:'TENANT',enabled:true,estimatedEuro:0,dataBoundary:'LOCAL_PRIVATE',supportsRollback:false
}]};
const preflight=createJarvisB6CapabilityPreflight({identityProvider,registry,policy,audit});
const journal=createJarvisB6PgJournal({query:b6CiPsqlQuery});
const localAdapter=createJarvisB6AllowlistedGitHubRead({token,commitSha:sha});
let reads=0;
function engine(readMethod=async s=>{reads++;return localAdapter.read(s);}){
 const adapter={...localAdapter,read:readMethod};
 return createJarvisB6ControlledRead({
  identityProvider,
  controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  preflight,policy,journal,
  connectorRegistry:{resolve:async()=>adapter},
  resultVerifier:createJarvisB6GitHubStateVerifier({commitSha:sha}),
  audit
 });
}
// Independent executors, independent psql subprocesses, same durable PostgreSQL rows.
const [a,b]=await Promise.all([engine().executeRead(task),engine().executeRead(task)]);
const outcomes=[a.state,b.state];
assert.equal(outcomes.filter(s=>s==='EXECUTED_VERIFIED_READ').length,1);
assert.equal(reads,1);
assert.equal(outcomes.every(s=>['EXECUTED_VERIFIED_READ','ALREADY_COMPLETED_VERIFIED','DENY'].includes(s)),true);
assert.equal([a,b].filter(x=>x.state==='DENY').every(x=>x.reason==='DUPLICATE_IN_PROGRESS'),true);
// Simulate worker restart with another engine instance and a new Postgres session.
const resumed=await engine().executeRead(task);
assert.equal(resumed.state,'ALREADY_COMPLETED_VERIFIED');
assert.equal(resumed.executed,false);
assert.equal(reads,1);
assert.match(resumed.evidenceHash,/^[0-9a-f]{64}$/);
// Same key with altered privacy must NOT read again.
const changed=await engine().executeRead({...task,privacy:'CONFIDENTIAL'});
assert.equal(changed.reason,'IDEMPOTENCY_CONFLICT');
assert.equal(reads,1);
// Scope isolation, hard PROD denial, bogus source token.
assert.equal((await engine().executeRead({...task,environment:'PROD'})).reason,'PROD_NOT_CERTIFIED');
assert.equal((await engine().executeRead({...task,companyId:'aion',idempotencyKey:'different'})).reason,'OWNER_SCOPE_DENIED');
assert.equal((await engine().executeRead({...task,token:'bad-token',idempotencyKey:'different'})).reason,'AUTH_UNAVAILABLE');
// A failed connector is a terminal recorded claim; no automatic re-read after restart.
const failedTask={...task,idempotencyKey:'failed-read'};
const failingEngine=engine(async()=>{throw Error('synthetic connection reset');});
const fail=await failingEngine.executeRead(failedTask);
assert.equal(fail.reason,'CONNECTOR_READ_FAILED');
const afterFail=await engine().executeRead(failedTask);
assert.equal(afterFail.reason,'JOURNAL_CLAIM_REJECTED');
assert.equal(reads,1);
// Verify emitted audit is metadata-only; no raw provider token or sensitive content.
assert.equal(auditEvents.some(e=>e.eventCode==='B6_READ_VERIFIED'),true);
const serialized=JSON.stringify(auditEvents);
assert.equal(serialized.includes(token),false);
assert.equal(serialized.includes(task.token),false);
console.log('B6_CUT02_REAL_PG17_PLUS_GITHUB_E2E_PASS concurrency=2 remote_read_calls=1 restart_dedup=true failure_terminal=true privacy_conflict_denied=true prod_off=true extra_cost_eur=0');
console.log('B6_CUT02_ONLY_LAB_AUTH_SYNTHETIC; PROD B2/B3, external writes, and B4 recovery remain UNVERIFIED.');
