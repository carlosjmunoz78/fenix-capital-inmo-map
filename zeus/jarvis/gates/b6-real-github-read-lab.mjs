/** Real GitHub API READ via ephemeral GitHub Actions token, synthetic LAB-only owner/B3.
 * This is a connector smoke, NOT proof of B2/B3 real PROD authorization.
 * No writes to GitHub or other services.
 */
import assert from 'node:assert/strict';
import {createJarvisB6ControlledRead} from '../core/jarvis-b6-controlled-read.mjs';
import {createJarvisB6CapabilityPreflight} from '../core/jarvis-b6-capability-preflight.mjs';
import {createJarvisB6AllowlistedGitHubRead,createJarvisB6GitHubStateVerifier}
 from '../core/jarvis-b6-github-read-adapter.mjs';

const token=process.env.GITHUB_TOKEN;
const commitSha=process.env.JARVIS_B6_COMMIT_SHA;
if(!token||!/^[0-9a-f]{40}$/.test(commitSha||''))throw Error('B6_LAB_CI_AUTH_CONFIG_MISSING');
const scope={companyId:'fenix',environment:'LAB',sessionId:'ci-s1',missionId:'ci-b6-read1',
 capability:'GITHUB_FILE_READ',idempotencyKey:'ci-read-once',token:'synthetic-b2-ci-owner'};
const selected='jarvis-b6-allowlisted-github-read';
const principal={ownerId:'synthetic-owner-ci',sessionId:'ci-s1',roles:['OWNER_ROOT'],
 authorizedCompanies:['fenix']};
const identityProvider={verify:async t=>{
 if(t!==scope.token)throw Error('B2_TOKEN_DENIED');
 return principal;
}};
const policy={authorize:async a=>({
 decision:['JARVIS_CAPABILITY_DISCOVER','JARVIS_CAPABILITY_EXECUTE_READ'].includes(a.actionName)&&
 a.companyId==='fenix'&&a.environment==='LAB'?'ALLOW':'DENY'
})};
const auditEvents=[];
const audit={append:async event=>{auditEvents.push(event);return true;}};
const registry={list:async()=>[{
 id:selected,route:'API',companyId:'fenix',environment:'LAB',capability:'GITHUB_FILE_READ',
 isolation:'TENANT',enabled:true,estimatedEuro:0,dataBoundary:'LOCAL_PRIVATE',supportsRollback:false
}]};
const preflight=createJarvisB6CapabilityPreflight({identityProvider,policy,registry,audit});
const adapter=createJarvisB6AllowlistedGitHubRead({token,commitSha});
let reads=0;
const safeConnector={...adapter,read:async s=>{reads++;return adapter.read(s);}};
const journalRecords=new Map();
const journal={
 claim:async r=>{
  const key=[r.ownerId,r.companyId,r.environment,r.missionId,r.capability,r.connectorId,r.idempotencyKey].join('/');
  const existing=journalRecords.get(key);
  if(existing){
   if(existing.fingerprint!==r.fingerprint)return{state:'CONFLICT'};
   if(existing.status==='COMPLETED')return{state:'ALREADY_COMPLETED',fingerprint:r.fingerprint,
    evidenceHash:existing.evidenceHash,ownerId:r.ownerId,companyId:r.companyId,environment:r.environment,
    missionId:r.missionId,capability:r.capability,connectorId:r.connectorId,idempotencyKey:r.idempotencyKey};
   return{state:'IN_PROGRESS'};
  }
  journalRecords.set(key,{status:'CLAIMED',fingerprint:r.fingerprint});
  return{state:'CLAIMED'};
 },
 complete:async r=>{
  const key=[r.ownerId,r.companyId,r.environment,r.missionId,r.capability,r.connectorId,r.idempotencyKey].join('/');
  const record=journalRecords.get(key);
  if(!record||record.status!=='CLAIMED'||record.fingerprint!==r.fingerprint)return false;
  journalRecords.set(key,{status:'COMPLETED',fingerprint:r.fingerprint,evidenceHash:r.evidenceHash});
  return true;
 },
 fail:async()=>true
};
const engine=createJarvisB6ControlledRead({
 identityProvider,controlStore:{get:async()=>({enabled:true,killSwitch:false})},
 preflight,policy,journal,
 connectorRegistry:{resolve:async()=>safeConnector},
 resultVerifier:createJarvisB6GitHubStateVerifier({commitSha}),
 audit
});
const a=await engine.executeRead(scope);
assert.equal(a.state,'EXECUTED_VERIFIED_READ');
assert.equal(a.route,'API');
assert.equal(a.executed,true);
assert.equal(a.spentEuro,0);
assert.equal(reads,1);
assert.match(a.evidenceHash,/^[0-9a-f]{64}$/);
const again=await engine.executeRead(scope);
assert.equal(again.state,'ALREADY_COMPLETED_VERIFIED');
assert.equal(again.executed,false);
assert.equal(reads,1);
const forbidden=await engine.executeRead({...scope,environment:'PROD'});
assert.equal(forbidden.reason,'PROD_NOT_CERTIFIED');
const foreign=await engine.executeRead({...scope,companyId:'aion',idempotencyKey:'ci-aion-deny'});
assert.equal(foreign.reason,'OWNER_SCOPE_DENIED');
assert.equal(reads,1);
assert.ok(auditEvents.some(x=>x.eventCode==='B6_READ_STARTED'));
assert.ok(auditEvents.some(x=>x.eventCode==='B6_READ_VERIFIED'));
const audits=JSON.stringify(auditEvents);
assert.equal(audits.includes(token),false);
assert.equal(audits.includes(scope.token),false);
console.log('B6_REAL_GITHUB_API_READ_LAB_PASS read_calls=1 repeat_idempotent=true prod_denied=true cross_tenant_denied=true marginal_cost_eur=0 evidence_sha256='+a.evidenceHash);
console.log('B6_SYNTHETIC_AUTH_ONLY: real B2/B3 and PROD connectors NOT connected. No remote writes.');
