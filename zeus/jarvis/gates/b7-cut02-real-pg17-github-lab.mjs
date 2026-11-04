/** B7 CUT02 — REAL GitHub API READ + PostgreSQL 17 B6 claims + B7 DAG.
 * Synthetic B2/B3 grants, scoped ephemeral GitHub Actions token. LAB ONLY.
 * Reuses existing B6 journal and adapters. No PROD, secrets or new services.
 */
import assert from 'node:assert/strict';
import {createJarvisB7Orchestrator} from '../core/jarvis-b7-orchestrator.mjs';
import {createJarvisB6ControlledRead} from '../core/jarvis-b6-controlled-read.mjs';
import {createJarvisB6CapabilityPreflight} from '../core/jarvis-b6-capability-preflight.mjs';
import {createJarvisB6PgJournal} from '../core/jarvis-b6-pg-journal.mjs';
import {b6CiPsqlQuery} from './b6-ci-psql-query.mjs';
import {createJarvisB6AllowlistedGitHubRead,createJarvisB6GitHubStateVerifier}
 from '../core/jarvis-b6-github-read-adapter.mjs';
const token=process.env.GITHUB_TOKEN,commitSha=process.env.JARVIS_B7_COMMIT_SHA;
if(typeof token!=='string'||token.length<10||!/^[a-f0-9]{40}$/.test(commitSha||''))
 throw Error('B7_CI_TRUSTED_TOKEN_AND_SHA_REQUIRED');
const secret='synthetic-b2-session-ci',companyId='fenix',environment='LAB';
const principal={ownerId:'owner-synthetic-ci',sessionId:'session-ci',roles:['OWNER_ROOT'],
 authorizedCompanies:['fenix']};
const identityProvider={verify:async t=>{if(t!==secret)throw Error('B2_INVALID');return principal;}};
const events=[];
const audit={append:async p=>{events.push(p);return true;}};
const policy={authorize:async p=>({decision:p.companyId===companyId&&
 p.environment===environment&&
 ['JARVIS_CAPABILITY_DELEGATE_READ','JARVIS_CAPABILITY_DISCOVER',
  'JARVIS_CAPABILITY_EXECUTE_READ'].includes(p.actionName)?'ALLOW':'DENY'})};
const capability='GITHUB_FILE_READ',connectorId='jarvis-b6-allowlisted-github-read';
const catalog={resolve:async p=>({companyId:p.companyId,environment:'LAB',capability,
 specialistId:'safe-github-reader',engineId:'CAPA-001',version:'0.1.0',
 mode:'B6_CONTROLLED_READ',operation:'READ',enabled:true,mutating:false,
 canDelegate:false,estimatedEuro:0,permissions:['JARVIS_CAPABILITY_EXECUTE_READ']})};
const registry={list:async()=>[{id:connectorId,companyId,environment,capability,route:'API',
 isolation:'TENANT',enabled:true,estimatedEuro:0,dataBoundary:'LOCAL_PRIVATE',
 supportsRollback:false}]};
const preflight=createJarvisB6CapabilityPreflight({identityProvider,registry,policy,audit});
const journal=createJarvisB6PgJournal({query:b6CiPsqlQuery});
const upstream=createJarvisB6AllowlistedGitHubRead({token,commitSha});
const verifier=createJarvisB6GitHubStateVerifier({commitSha});
const reference=await upstream.read({companyId,environment,capability,connectorId});
const independent=await verifier.verify({result:reference,companyId,environment,capability,connectorId});
assert.equal(independent.verified,true);
let realTaskGets=0,halted=false;
function b6Engine(){
 return createJarvisB6ControlledRead({
  identityProvider,controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  preflight,policy,journal,
  connectorRegistry:{resolve:async()=>({...upstream,read:async s=>{
   realTaskGets++;return upstream.read(s);
  }})},resultVerifier:verifier,audit
 });
}
function b7Engine(){
 return createJarvisB7Orchestrator({
  catalog,policy,b6Executor:b6Engine(),audit,
  supervisor:{inspect:async()=>({enabled:true,killSwitch:false,revoked:false,halted,costEuro:0})},
  tribunal:{verify:async({evidenceHash,specialistId})=>({
   decision:evidenceHash===independent.evidenceHash&&specialistId!=='independent-b7-tribunal'?'ACCEPT':'REJECT',
   verified:evidenceHash===independent.evidenceHash,verifierId:'independent-b7-tribunal',
   evidenceHash:independent.evidenceHash
  })}
 });
}
const t=id=>({taskId:id,dependsOn:[],depth:0,capability,operation:'READ',idempotencyKey:'idem-b7-'+id});
const mission={missionId:'ci-b7-real-pg17',ownerId:principal.ownerId,sessionId:principal.sessionId,
 companyId,environment,engineId:'ORCH-001',version:'0.1.0',
 maxEuro:0,maxParallel:2,timeoutMs:15000,tasks:[t('read1'),t('read2')]};
const first=await b7Engine().executeMission({mission,token:secret});
assert.equal(first.state,'LAB_ACCEPTED');
assert.equal(first.accepted,2);
assert.equal(first.spentEuro,0);
assert.equal(realTaskGets,2);
assert.equal(first.results.every(x=>x.evidenceHash===independent.evidenceHash),true);
const replay=await b7Engine().executeMission({mission,token:secret});
assert.equal(replay.state,'LAB_ACCEPTED');
assert.equal(replay.results.every(x=>x.replayed===true),true);
assert.equal(realTaskGets,2); // no repeated external task READ on restart
const changed={...mission,tasks:[{...t('read1'),idempotencyKey:'idem-b7-read1'},
 { ...t('read2'),idempotencyKey:'idem-b7-read2',operation:'WRITE'}]};
const rejected=await b7Engine().executeMission({mission:changed,token:secret});
assert.equal(rejected.state,'DENY');
assert.equal(realTaskGets,2);
halted=true;
const stopped=await b7Engine().executeMission({mission:{...mission,missionId:'ci-b7-stop'},token:secret});
assert.equal(stopped.reason,'SUPERVISOR_STOP');
assert.equal(realTaskGets,2);
assert.equal((await b7Engine().executeMission({mission:{...mission,environment:'PROD'},token:secret})).reason,'PROD_NOT_CERTIFIED');
assert.equal((await b7Engine().executeMission({mission:{...mission,companyId:'aion'},token:secret})).reason,'SUPERVISOR_STOP'); // disabled controller; no cross-company execution
const serialized=JSON.stringify(events);
assert.equal(serialized.includes(token),false);
assert.equal(serialized.includes(secret),false);
console.log('B7_REAL_GITHUB_PG17_DAG_PASS accepted=2 remote_read_calls=2 restart_replay_no_new_get=true independent_reference_verified=true prod_off=true cost_eur=0');
console.log('SYNTHETIC_CI_B2_B3_ONLY, B7_MISSION_LEVEL_JOURNAL_NOT_CERTIFIED, NO_PROD');
