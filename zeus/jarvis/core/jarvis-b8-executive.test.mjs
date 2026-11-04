import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createJarvisB8Executive,rankJarvisB8Priorities,B8_LIMITS} from './jarvis-b8-executive.mjs';
import {createJarvisB7Orchestrator} from './jarvis-b7-orchestrator.mjs';
import {createJarvisB7DurableMissionEnvelope} from './jarvis-b7-durable-envelope.mjs';

const H=createHash('sha256').update('synthetic-b8-proof').digest('hex');
const P=Object.freeze({urgency:3,deadlineRisk:2,financialRisk:2,customerImpact:4,valuePotential:3,
 resourceAvailability:3,dependencyReadiness:4,effort:1,confidence:95});
const task=id=>({taskId:id,capability:'GITHUB_FILE_READ',dependsOn:[],depth:0,
 operation:'READ',idempotencyKey:'idem-'+id});
const order=(companyId,missionId,extra={})=>({mission:{
 companyId,missionId,engineId:'ORCH-001',environment:'LAB',version:'0.1.0',
 ownerId:'owner-1',sessionId:'session-1',tasks:[task('read')],maxEuro:0,maxParallel:1,timeoutMs:20000
 },missionKey:'key-'+missionId,priority:{...P},evidenceRefs:['LAB-EVIDENCE-01'],...extra});

function rig(options={}){
 const calls=[],claims=new Map(),token='opaque-token';
 let active=0,peak=0;
 const identityProvider={verify:async t=>{
  calls.push(['identity']);
  if(options.authError)throw Error('AUTH_FAIL');
  return t===token?{ownerId:'owner-1',sessionId:'session-1',roles:options.roles||['OWNER_ROOT'],
   authorizedCompanies:options.companies||['fenix','aion']}:{};
 }};
 const companyRegistry={resolve:async p=>{
  calls.push(['company',p.companyId]);
  if(options.registryError)throw Error('REGISTRY_DOWN');
  return {companyId:options.fakeRegistry?'wrong-company':p.companyId,environment:'LAB',
   status:options.companyInactive?'INACTIVE':'ACTIVE',verified:!options.companyUnverified};
 }};
 const policy={authorize:async p=>{
  calls.push(['policy',p.companyId,p.actionName]);
  if(options.policyError)throw Error('B3_OFF');
  return {decision:options.denyPolicy?'DENY':'ALLOW'};
 }};
 const supervisor={inspect:async p=>{
  calls.push(['supervisor',p.companyId]);
  return {enabled:!options.killed,killSwitch:!!options.killed,
   halted:!!options.halted,revoked:!!options.revoked,costEuro:0};
 }};
 const audit={append:async e=>{
  calls.push(['audit',e.companyId,e.eventCode]);
  return !options.auditError;
 }};
 const catalog={resolve:async p=>({companyId:options.crossCatalog?'captacasa':p.companyId,
  environment:'LAB',specialistId:'worker-1',engineId:'CAPA-001',version:'0.1.0',
  capability:p.capability,mode:'B6_CONTROLLED_READ',operation:'READ',enabled:true,
  mutating:false,estimatedEuro:0,canDelegate:false,permissions:['JARVIS_CAPABILITY_EXECUTE_READ']})};
 const b6Executor={executeRead:async p=>{
  active++;peak=Math.max(peak,active);
  calls.push(['b6',p.companyId,p.missionId]);
  active--;if(options.stopDuringRead)options.killed=true;
  if(options.failCompany===p.companyId)return {state:'DENY'};
  return {state:'EXECUTED_VERIFIED_READ',evidenceHash:H,spentEuro:0,
   rawSecret:'MUST_NOT_APPEAR_IN_B8_RESPONSE'};
 }};
 const tribunal={verify:async p=>{
  calls.push(['tribunal',p.companyId]);
  return {decision:options.tribunalReject?'REJECT':'ACCEPT',verified:true,
   verifierId:options.selfJudge?'worker-1':'external-judge',evidenceHash:H};
 }};
 const journal={
  claim:async s=>{
   const key=[s.ownerId,s.companyId,s.missionId,s.capability,s.connectorId,s.idempotencyKey].join('|');
   const old=claims.get(key);
   if(old)return old.fingerprint!==s.fingerprint?{state:'CONFLICT'}:
    old.state==='done'?{state:'ALREADY_COMPLETED',...old.scope,evidenceHash:old.hash,fingerprint:s.fingerprint}:{state:'IN_PROGRESS'};
   claims.set(key,{state:'claim',fingerprint:s.fingerprint,scope:{...s}});
   return {state:'CLAIMED'};
  },
  complete:async s=>{
   const key=[s.ownerId,s.companyId,s.missionId,s.capability,s.connectorId,s.idempotencyKey].join('|');
   const v=claims.get(key);if(!v||v.state!=='claim')return false;
   v.state='done';v.hash=s.evidenceHash;return true;
  },
  fail:async s=>{
   const key=[s.ownerId,s.companyId,s.missionId,s.capability,s.connectorId,s.idempotencyKey].join('|');
   const v=claims.get(key);if(v)v.state='failed';
   return true;
  }
 };
 const orchestrator=createJarvisB7Orchestrator({catalog,policy,b6Executor,supervisor,tribunal,audit});
 const b7Envelope=createJarvisB7DurableMissionEnvelope({identityProvider,policy,supervisor,
   journal,orchestrator,audit});
 const executive=createJarvisB8Executive({identityProvider,companyRegistry,policy,
   supervisor,b7Envelope,audit});
 return {executive,calls,claims,token,get peak(){return peak;}};
}

test('two synthetic companies complete distinct B8→B7→B6 missions with isolation',async()=>{
 const r=rig();const result=await r.executive.executePortfolio({token:r.token,
  orders:[order('fenix','mf'),order('aion','ma')]});
 assert.equal(result.state,'LAB_PORTFOLIO_ACCEPTED');assert.equal(result.receipts.length,2);
 assert.deepEqual(new Set(result.receipts.map(x=>x.companyId)),new Set(['fenix','aion']));
 assert.deepEqual(new Set(r.calls.filter(x=>x[0]==='b6').map(x=>x[1])),new Set(['fenix','aion']));
 assert.equal(result.spentEuro,0);assert.equal(result.prodAuthorized,false);
 assert.equal(JSON.stringify(result).includes('MUST_NOT_APPEAR'),false);
 assert.ok(r.peak<=B8_LIMITS.maxConcurrentPortfolio);
});
test('B7 durable journal replays both companies with zero duplicate B6 READ',async()=>{
 const r=rig(),orders=[order('fenix','mf'),order('aion','ma')];
 const a=await r.executive.executePortfolio({token:r.token,orders});
 const b=await r.executive.executePortfolio({token:r.token,orders});
 assert.equal(a.state,'LAB_PORTFOLIO_ACCEPTED');
 assert.equal(b.state,'LAB_PORTFOLIO_ACCEPTED');
 assert.equal(r.calls.filter(x=>x[0]==='b6').length,2);
 assert.equal(b.receipts.every(x=>x.replayed),true);
});
test('no OWNER_ROOT denies before calling company registry',async()=>{
 const r=rig({roles:['USER']});const x=await r.executive.executePortfolio({token:r.token,
 orders:[order('fenix','mf')]});
 assert.equal(x.reason,'OWNER_ROOT_NOT_VERIFIED');assert.equal(r.calls.some(x=>x[0]==='company'),false);
});
test('unknown token fails closed',async()=>{
 const r=rig();const x=await r.executive.executePortfolio({token:'not-allowed',
 orders:[order('fenix','mf')]});
 assert.equal(x.reason,'OWNER_ROOT_NOT_VERIFIED');assert.equal(r.calls.some(x=>x[0]==='b6'),false);
});
test('owner cannot direct company not included in verified identity',async()=>{
 const r=rig({companies:['fenix']});const x=await r.executive.executePortfolio({token:r.token,
 orders:[order('fenix','mf'),order('aion','ma')]});
 assert.equal(x.reason,'OWNER_COMPANY_SCOPE_DENIED');assert.equal(r.calls.some(x=>x[0]==='b6'),false);
});
test('company ID spoof by registry is denied',async()=>{
 const r=rig({fakeRegistry:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.reason,'COMPANY_NOT_VERIFIED_ACTIVE');assert.equal(r.calls.some(x=>x[0]==='b6'),false);
});
test('unverified or inactive company is denied',async()=>{
 for(const opts of [{companyInactive:true},{companyUnverified:true}]){
  const r=rig(opts),x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
  assert.equal(x.reason,'COMPANY_NOT_VERIFIED_ACTIVE');
 }
});
test('B3 denied scope blocks before B7 delegation',async()=>{
 const r=rig({denyPolicy:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.reason,'B3_COMPANY_COORDINATION_DENIED');assert.equal(r.calls.some(x=>x[0]==='b6'),false);
});
test('B3 outage fails closed',async()=>{
 const r=rig({policyError:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.reason,'B3_POLICY_UNAVAILABLE');
});
test('registry outage fails closed',async()=>{
 const r=rig({registryError:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.reason,'COMPANY_REGISTRY_UNAVAILABLE');
});
test('kill switch stops portfolio before execution',async()=>{
 const r=rig({killed:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.reason,'SUPERVISOR_STOP');assert.equal(r.calls.some(x=>x[0]==='b6'),false);
});
test('revocation stops portfolio before execution',async()=>{
 const r=rig({revoked:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.reason,'SUPERVISOR_STOP');
});
test('revocation while in flight rejects result; no external promise',async()=>{
 const r=rig({stopDuringRead:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.state,'LAB_PORTFOLIO_PARTIAL');
 assert.equal(x.receipts[0].state,'BLOCKED');assert.equal(x.receipts[0].reason,'SUPERVISOR_STOP_AFTER_EXECUTION');
});
test('independent B7 tribunal rejection propagates fail closed',async()=>{
 const r=rig({tribunalReject:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.receipts[0].reason,'B7_RESULT_UNVERIFIED');
});
test('B7 specialist self-judging is rejected',async()=>{
 const r=rig({selfJudge:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.state,'LAB_PORTFOLIO_PARTIAL');
});
test('cross-company B7 specialist substitution rejected',async()=>{
 const r=rig({crossCatalog:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.state,'LAB_PORTFOLIO_PARTIAL');assert.equal(r.calls.some(x=>x[0]==='b6'),false);
});
test('one company failing does not leak its results to next company',async()=>{
 const r=rig({failCompany:'aion'});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf'),order('aion','ma')]});
 assert.equal(x.state,'LAB_PORTFOLIO_PARTIAL');assert.equal(x.receipts.length,2);
 assert.equal(x.receipts.find(y=>y.companyId==='fenix').state,'ACCEPTED_LAB');
 assert.equal(x.receipts.find(y=>y.companyId==='aion').state,'BLOCKED');
});
test('duplicate mission or company-scoped idempotency collision denied before execution',async()=>{
 for(const orders of [[order('fenix','mf'),order('fenix','mf')],
  [order('fenix','mf'),order('fenix','mb',{missionKey:'key-mf'})]]){
  const r=rig();const x=await r.executive.executePortfolio({token:r.token,orders});
  assert.equal(x.reason,'PORTFOLIO_DUPLICATE_OR_IDEMPOTENCY_COLLISION');
  assert.equal(r.calls.some(y=>y[0]==='b6'),false);
 }
});
test('invalid extra order authority and executable mutations denied',async()=>{
 for(const bad of [
  order('fenix','mf',{allowSign:true}),
  order('fenix','mf',{mission:{...order('fenix','mf').mission,tasks:[{...task('read'),operation:'PAY'}]}}),
  order('fenix','mf',{mission:{...order('fenix','mf').mission,maxEuro:1}})
 ]){
  const r=rig();const x=await r.executive.executePortfolio({token:r.token,orders:[bad]});
  assert.notEqual(x.state,'LAB_PORTFOLIO_ACCEPTED');assert.equal(r.calls.some(y=>y[0]==='b6'),false);
 }
});
test('any PROD mission fails before identity or registry ports',async()=>{
 const r=rig(),m=order('fenix','mf');m.mission.environment='PROD';
 const x=await r.executive.executePortfolio({token:r.token,orders:[m]});
 assert.equal(x.reason,'PROD_NOT_CERTIFIED');assert.equal(r.calls.length,0);
});
test('lack of cited ordinal signals is not converted into priority or financial fact',async()=>{
 const r=rig(),o=order('fenix','mf',{evidenceRefs:[]});
 const x=await r.executive.executePortfolio({token:r.token,orders:[o]});
 assert.equal(x.reason,'EVIDENCE_REQUIRED');assert.equal(r.calls.some(y=>y[0]==='b6'),false);
});
test('low confidence requires human escalation, no tool execution',async()=>{
 const r=rig(),o=order('fenix','mf',{priority:{...P,confidence:30}});
 const x=await r.executive.executePortfolio({token:r.token,orders:[o]});
 assert.equal(x.reason,'LOW_CONFIDENCE');assert.equal(r.calls.some(y=>y[0]==='b6'),false);
});
test('priority ranking deterministic, explainable and independent of request order',()=>{
 const a=order('fenix','mf'),b=order('aion','ma',{priority:{...P,urgency:5}});
 const x=rankJarvisB8Priorities([a,b]),y=rankJarvisB8Priorities([b,a]);
 assert.equal(x.state,'RANKED_LAB');assert.deepEqual(x.rows,y.rows);
 assert.equal(x.rows[0].companyId,'aion');assert.equal(x.noEconomicFactsInferred,true);
});
test('portfolio limit is a hard guard',async()=>{
 const r=rig(),orders=Array.from({length:9},(_,i)=>order('fenix','m'+i));
 const x=await r.executive.executePortfolio({token:r.token,orders});
 assert.equal(x.reason,'PORTFOLIO_SIZE_INVALID');assert.equal(r.calls.length,0);
});
test('audit failure blocks dispatch safely',async()=>{
 const r=rig({auditError:true});const x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.reason,'AUDIT_UNAVAILABLE');assert.equal(r.calls.some(y=>y[0]==='b6'),false);
});
test('communications can only be prepared; SEND and SIGN cannot execute',async()=>{
 const r=rig(),draft={token:r.token,companyId:'fenix',recipientRef:'authorized-lead-01',
 channel:'EMAIL',subject:'Hello',body:'Synthetic text'};
 const ok=await r.executive.prepareCommunication(draft);
 assert.equal(ok.state,'DRAFT_ONLY');assert.equal(ok.sent,false);
 assert.equal((await r.executive.prepareCommunication({...draft,mode:'SEND'})).reason,'EXTERNAL_SEND_NOT_AUTHORIZED');
 assert.equal((await r.executive.prepareCommunication({...draft,mode:'SIGN'})).reason,'EXTERNAL_SEND_NOT_AUTHORIZED');
 assert.equal(r.calls.some(y=>y[0]==='b6'),false);
});
test('draft communication cannot use another company or invalid recipient',async()=>{
 const r=rig({companies:['fenix']});
 assert.equal((await r.executive.prepareCommunication({token:r.token,companyId:'aion',
 recipientRef:'lead-1',channel:'EMAIL',subject:'S',body:'B'})).reason,'OWNER_COMPANY_SCOPE_DENIED');
 assert.equal((await r.executive.prepareCommunication({token:r.token,companyId:'fenix',
 recipientRef:'',channel:'EMAIL',subject:'S',body:'B'})).reason,'COMMUNICATION_DRAFT_INVALID');
});
test('onboarding plan never provisions real company or secrets',()=>{
 const r=rig(),x=r.executive.prepareOnboarding({companyId:'synthetic-tenant',environment:'LAB',synthetic:true});
 assert.equal(x.state,'SYNTHETIC_PLAN_ONLY');assert.equal(x.registered,false);
 assert.equal(x.installed,false);assert.equal(x.prodAuthorized,false);
 assert.equal(r.executive.prepareOnboarding({companyId:'fenix',environment:'PROD',synthetic:true}).state,'DENY');
});
test('B8 holds no new worker or server and never calls paid AI',async()=>{
 const r=rig(),x=await r.executive.executePortfolio({token:r.token,orders:[order('fenix','mf')]});
 assert.equal(x.spentEuro,0);assert.equal(x.noExternalCommunications,true);
 assert.equal(JSON.stringify(x).includes('rawSecret'),false);
 assert.equal(B8_LIMITS.maxEuro,0);
});
