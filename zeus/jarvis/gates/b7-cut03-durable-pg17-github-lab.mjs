/** ZEUS/JARVIS B7 CUT03 — B6 PG17 reused for atomic whole mission + real GitHub READ.
 * Completely isolated CI synthetic LAB; no PROD, no paid services.
 */
import assert from 'node:assert/strict';
import {createJarvisB7DurableMissionEnvelope} from '../core/jarvis-b7-durable-envelope.mjs';
import {createJarvisB7Orchestrator} from '../core/jarvis-b7-orchestrator.mjs';
import {createJarvisB6ControlledRead} from '../core/jarvis-b6-controlled-read.mjs';
import {createJarvisB6CapabilityPreflight} from '../core/jarvis-b6-capability-preflight.mjs';
import {createJarvisB6PgJournal} from '../core/jarvis-b6-pg-journal.mjs';
import {b6CiPsqlQuery} from './b6-ci-psql-query.mjs';
import {createJarvisB6AllowlistedGitHubRead,createJarvisB6GitHubStateVerifier}
 from '../core/jarvis-b6-github-read-adapter.mjs';
const ghToken=process.env.GITHUB_TOKEN,sha=process.env.JARVIS_B7_COMMIT_SHA;
if(!ghToken||!/^([a-f0-9]{40})$/.test(sha||''))throw Error('B7_CUT03_CI_CONFIG_REQUIRED');
const token='synthetic-session-only',companyId='fenix',environment='LAB',
 ownerId='owner-b7-ci',sessionId='session-b7-ci',capability='GITHUB_FILE_READ',
 connectorId='jarvis-b6-allowlisted-github-read';
const owner={ownerId,sessionId,roles:['OWNER_ROOT'],authorizedCompanies:[companyId]};
const identityProvider={verify:async t=>{if(t!==token)throw Error('DENIED');return owner;}};
const auditLog=[],audit={append:async e=>{auditLog.push(e);return true;}};
const policy={authorize:async p=>({decision:p.companyId===companyId&&p.environment==='LAB'&&
 ['JARVIS_CAPABILITY_DISCOVER','JARVIS_CAPABILITY_EXECUTE_READ',
  'JARVIS_CAPABILITY_DELEGATE_READ','JARVIS_CAPABILITY_COORDINATE_READ'].includes(p.actionName)
 ?'ALLOW':'DENY'})};
let halted=false,taskGets=0;
const supervisor={inspect:async()=>({enabled:!halted,killSwitch:halted,halted,revoked:false,costEuro:0})};
const reg={list:async()=>[{id:connectorId,companyId,environment,capability,
 route:'API',isolation:'TENANT',enabled:true,estimatedEuro:0,
 dataBoundary:'LOCAL_PRIVATE',supportsRollback:false}]};
const preflight=createJarvisB6CapabilityPreflight({identityProvider,registry:reg,policy,audit});
const journal=createJarvisB6PgJournal({query:b6CiPsqlQuery});
const upstream=createJarvisB6AllowlistedGitHubRead({token:ghToken,commitSha:sha});
const verifier=createJarvisB6GitHubStateVerifier({commitSha:sha});
const reference=await upstream.read({companyId,environment,capability,connectorId});
const independent=await verifier.verify({result:reference,companyId,environment,capability,connectorId});
assert.equal(independent.verified,true);
const catalog={resolve:async()=>({companyId,environment,capability,engineId:'CAPA-001',
 specialistId:'read-specialist',version:'0.1.0',mode:'B6_CONTROLLED_READ',enabled:true,
 operation:'READ',mutating:false,canDelegate:false,estimatedEuro:0,
 permissions:['JARVIS_CAPABILITY_EXECUTE_READ']})};
function envelope(overrideJournal=journal){
 const b6=createJarvisB6ControlledRead({
  identityProvider,controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  preflight,policy,journal,
  connectorRegistry:{resolve:async()=>({...upstream,read:async arg=>{taskGets++;return upstream.read(arg);}})},
  resultVerifier:verifier,audit
 });
 const orch=createJarvisB7Orchestrator({catalog,policy,b6Executor:b6,
  supervisor,tribunal:{verify:async p=>({
   decision:p.evidenceHash===independent.evidenceHash?'ACCEPT':'REJECT',
   verified:p.evidenceHash===independent.evidenceHash,
   verifierId:'separate-tribunal',evidenceHash:independent.evidenceHash
  })},audit});
 return createJarvisB7DurableMissionEnvelope({
  identityProvider,policy,supervisor,journal:overrideJournal,orchestrator:orch,audit
 });
}
function m(missionId){return {companyId,ownerId,sessionId,missionId,engineId:'ORCH-001',
 environment,version:'0.1.0',maxEuro:0,maxParallel:2,timeoutMs:15000,
 tasks:['t1','t2'].map(taskId=>({taskId,dependsOn:[],depth:0,operation:'READ',
  capability,idempotencyKey:'idem-'+taskId}))};}
const mission=m('ci-b7-cut03-real'),missionKey='mission-key-b7';
const req={mission,missionKey,token};
const [first,concurrent]=await Promise.all([envelope().execute(req),envelope().execute(req)]);
assert.equal([first,concurrent].filter(r=>r.state==='LAB_ACCEPTED_DURABLE').length,1);
assert.equal([first,concurrent].some(r=>r.reason==='MISSION_IN_PROGRESS_STOPPED'||r.state==='ALREADY_COMPLETED_VERIFIED'),true);
assert.equal(taskGets,2);
const afterRestart=await envelope().execute(req);
assert.equal(afterRestart.state,'ALREADY_COMPLETED_VERIFIED');
assert.equal(taskGets,2);
assert.match(afterRestart.evidenceHash,/^[a-f0-9]{64}$/);
const changed=m('ci-b7-cut03-real');changed.tasks[0].idempotencyKey='wrong-key';
assert.equal((await envelope().execute({mission:changed,missionKey,token})).reason,
 'MISSION_FINGERPRINT_CONFLICT');
assert.equal(taskGets,2);
// The journal's failure-to-commit ambiguity stays safely IN_PROGRESS.
// This synthetic injected crash does NOT alter B6 and never auto-reexecutes task GET.
const uncertain=await envelope({...journal,complete:async()=>{throw Error('synthetic network crash');}})
 .execute({mission:m('ci-b7-crash'),missionKey,token});
assert.equal(uncertain.reason,'MISSION_COMPLETION_UNCERTAIN');
const restartedCrash=await envelope().execute({mission:m('ci-b7-crash'),missionKey,token});
assert.equal(restartedCrash.reason,'MISSION_IN_PROGRESS_STOPPED');
assert.equal(taskGets,4); // two tasks during crash simulation; zero on reconnect
halted=true;
assert.equal((await envelope().execute({mission:m('ci-b7-revoked'),missionKey,token}))
 .reason,'SUPERVISOR_STOP');
assert.equal(taskGets,4);
assert.equal((await envelope().execute({mission:{...m('ci-b7-deny-prod'),environment:'PROD'},
 missionKey,token})).reason,'PROD_NOT_CERTIFIED');
const sensitive=JSON.stringify(auditLog);
assert.equal(sensitive.includes(ghToken),false);
assert.equal(sensitive.includes(token),false);
console.log('B7_CUT03_PG17_REAL_GITHUB_DURABLE_MISSION_PASS mission_race_one=true task_reads=2 replay_reads=0 uncertain_commit_no_retry=true revoked_stop=true prod_off=true cost_eur=0');
console.log('B7_CUT03_SYNTHETIC_AUTH_LAB_ONLY; NO_PROD; NO_REAL_B3_GRANTS; NO_LIVE_GATEWAY');
