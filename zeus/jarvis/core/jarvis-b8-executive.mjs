/** ZEUS/JARVIS B8 CUT01 — executive adapter over existing B7/B6 and Company Registry ports.
 * No new scheduler, workers, database, auth service or external communications.
 * Restricted to LAB read missions. Never use for financial/legal commitments.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const HASH=/^[a-f0-9]{64}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const freeze=x=>Object.freeze(x);
const deny=(reason,extra={})=>freeze({state:'DENY',reason,executed:false,spentEuro:0,prodAuthorized:false,...extra});
const FACTORS=freeze(['urgency','deadlineRisk','financialRisk','customerImpact','valuePotential','resourceAvailability','dependencyReadiness','effort','confidence']);
const WEIGHTS=freeze({urgency:6,deadlineRisk:6,financialRisk:5,customerImpact:5,valuePotential:3,resourceAvailability:2,dependencyReadiness:3,effort:-2});
export const B8_LIMITS=freeze({maxMissions:8,maxConcurrentPortfolio:1,maxEuro:0,minEvidenceConfidence:70});
export const B8_HUMAN_EXCEPTIONS=freeze(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function rankOne(order){
 const p=order?.priority;
 if(!p||typeof p!=='object'||Array.isArray(p)||
  Object.keys(p).some(k=>!FACTORS.includes(k))||
  FACTORS.some(k=>!Number.isInteger(p[k])||p[k]<(k==='confidence'?0:0)||p[k]>(k==='confidence'?100:5)))
  return {error:'PRIORITY_EVIDENCE_INVALID'};
 if(p.confidence<B8_LIMITS.minEvidenceConfidence)return {error:'LOW_CONFIDENCE'};
 if(!Array.isArray(order.evidenceRefs)||order.evidenceRefs.length<1||order.evidenceRefs.length>8||
  order.evidenceRefs.some(x=>typeof x!=='string'||x.length<3||x.length>180||/[\s<>]/.test(x)))
  return {error:'EVIDENCE_REQUIRED'};
 const score=Object.entries(WEIGHTS).reduce((n,[k,w])=>n+p[k]*w,0);
 return {score,evidenceCount:order.evidenceRefs.length,reason:'ORDINAL_PRIORITY_FROM_CITED_INPUT_NOT_FINANCIAL_FORECAST'};
}
export function rankJarvisB8Priorities(orders){
 if(!Array.isArray(orders)||orders.length<1||orders.length>B8_LIMITS.maxMissions)return {state:'DENY',reason:'PORTFOLIO_SIZE_INVALID'};
 const rows=[];
 for(const order of orders){
  const p=rankOne(order);if(p.error)return {state:'DENY',reason:p.error};
  rows.push({companyId:order.mission?.companyId,missionId:order.mission?.missionId,score:p.score,
   evidenceCount:p.evidenceCount,reason:p.reason});
 }
 rows.sort((a,b)=>b.score-a.score||String(a.companyId).localeCompare(String(b.companyId))||
  String(a.missionId).localeCompare(String(b.missionId)));
 return freeze({state:'RANKED_LAB',rows:rows.map(freeze),weights:WEIGHTS,noEconomicFactsInferred:true});
}

export function createJarvisB8Executive({identityProvider,companyRegistry,policy,supervisor,b7Envelope,audit}={}){
 if(typeof identityProvider?.verify!=='function'||typeof companyRegistry?.resolve!=='function'||
  typeof policy?.authorize!=='function'||typeof supervisor?.inspect!=='function'||
  typeof b7Envelope?.execute!=='function'||typeof audit?.append!=='function')
  throw Error('B8_EXISTING_TRUSTED_PORTS_REQUIRED');
 async function verifyOwner(token){
  if(typeof token!=='string'||!token.length)return null;
  try{
   const v=await identityProvider.verify(token);
   if(!valid(v?.ownerId)||!valid(v?.sessionId)||!Array.isArray(v.roles)||
    !v.roles.includes('OWNER_ROOT')||!Array.isArray(v.authorizedCompanies)||
    v.authorizedCompanies.some(x=>!valid(x)))return null;
   return v;
  }catch{return null;}
 }
 async function inspect(companyId,missionId){
  try{const c=await supervisor.inspect({companyId,missionId,environment:'LAB'});
   return c?.enabled===true&&c.killSwitch===false&&c.halted!==true&&c.revoked!==true&&c.costEuro===0;}
  catch{return false;}
 }
 async function auditMeta(eventCode,m,reason=null){
  try{return await audit.append({eventCode,companyId:m.companyId,missionId:m.missionId,
   engineId:'ORCH-001',environment:'LAB',version:m.version,reason})===true;}
  catch{return false;}
 }
 async function verifyOrder(order,owner,token){
  if(!order||typeof order!=='object'||Array.isArray(order)||
   Object.keys(order).some(k=>!['mission','missionKey','priority','evidenceRefs'].includes(k)))
   return 'ORDER_CONTRACT_INVALID';
  const m=order.mission;
  if(!m||m.environment!=='LAB'||m.engineId!=='ORCH-001'||
   ![m.companyId,m.missionId,m.ownerId,m.sessionId,m.version,order.missionKey].every(valid)||
   m.ownerId!==owner.ownerId||m.sessionId!==owner.sessionId||m.maxEuro!==0||
   !Array.isArray(m.tasks)||m.tasks.length<1||m.tasks.length>16||
   m.tasks.some(t=>t?.operation!=='READ'))return 'MISSION_CONTRACT_INVALID';
  if(!owner.authorizedCompanies.includes(m.companyId))return 'OWNER_COMPANY_SCOPE_DENIED';
  let record;
  try{record=await companyRegistry.resolve({companyId:m.companyId,environment:'LAB'});}
  catch{return 'COMPANY_REGISTRY_UNAVAILABLE';}
  if(record?.companyId!==m.companyId||record?.environment!=='LAB'||
   record?.status!=='ACTIVE'||record?.verified!==true)return 'COMPANY_NOT_VERIFIED_ACTIVE';
  let grant;
  try{grant=await policy.authorize({token,companyId:m.companyId,environment:'LAB',
   missionId:m.missionId,actionName:'JARVIS_B8_PORTFOLIO_COORDINATE_READ'});}
  catch{return 'B3_POLICY_UNAVAILABLE';}
  if(grant?.decision!=='ALLOW')return 'B3_COMPANY_COORDINATION_DENIED';
  if(!await inspect(m.companyId,m.missionId))return 'SUPERVISOR_STOP';
  return null;
 }
 return freeze({
  limits:B8_LIMITS,
  async executePortfolio({token,orders}={}){
   // This adapter never has a PROD path, even for an OWNER_ROOT token.
   if(!Array.isArray(orders)||orders.length<1||orders.length>B8_LIMITS.maxMissions)
    return deny('PORTFOLIO_SIZE_INVALID');
   if(orders.some(o=>o?.mission?.environment==='PROD'))return deny('PROD_NOT_CERTIFIED');
   const owner=await verifyOwner(token);if(!owner)return deny('OWNER_ROOT_NOT_VERIFIED');
   const seen=new Set(),keys=new Set();
   for(const o of orders){
    const m=o?.mission;
    const k=String(m?.companyId)+'|'+String(m?.missionId);
    const key=String(m?.companyId)+'|'+String(o?.missionKey);
    if(seen.has(k)||keys.has(key))return deny('PORTFOLIO_DUPLICATE_OR_IDEMPOTENCY_COLLISION');
    seen.add(k);keys.add(key);
    const p=rankOne(o);
    if(p.error)return deny(p.error==='LOW_CONFIDENCE'?'LOW_CONFIDENCE':p.error);
    if(!m||m.environment!=='LAB'||m.engineId!=='ORCH-001'||!valid(m.companyId))
     return deny('MISSION_CONTRACT_INVALID');
    if(!owner.authorizedCompanies.includes(m.companyId))return deny('OWNER_COMPANY_SCOPE_DENIED');
   }
   // Preflight ALL companies before ANY dispatch to avoid partial tenant scope violation.
   for(const o of orders){
    const error=await verifyOrder(o,owner,token);
    if(error)return deny(error);
   }
   const ranked=rankJarvisB8Priorities(orders);
   if(ranked.state!=='RANKED_LAB')return deny(ranked.reason);
   const map=new Map(orders.map(o=>[o.mission.companyId+'|'+o.mission.missionId,o]));
   const receipts=[];
   // Deliberate single global lane, preserving shared runtime and no resource starvation promises.
   for(const row of ranked.rows){
    const order=map.get(row.companyId+'|'+row.missionId),m=order.mission;
    if(!await inspect(m.companyId,m.missionId)){
     receipts.push(freeze({companyId:m.companyId,missionId:m.missionId,state:'BLOCKED',reason:'SUPERVISOR_STOP'}));continue;
    }
    if(!await auditMeta('B8_PORTFOLIO_MISSION_DISPATCH',m))
     return deny('AUDIT_UNAVAILABLE',{completedMetadata:receipts});
    let out;
    try{out=await b7Envelope.execute({mission:m,missionKey:order.missionKey,token});}
    catch{out={state:'DENY',reason:'B7_UNAVAILABLE'};}
    const accepted=['LAB_ACCEPTED_DURABLE','ALREADY_COMPLETED_VERIFIED'].includes(out?.state)&&
      out.companyId===m.companyId&&out.missionId===m.missionId&&
      HASH.test(out.evidenceHash)&&out.spentEuro===0;
    if(!await inspect(m.companyId,m.missionId)){
     receipts.push(freeze({companyId:m.companyId,missionId:m.missionId,state:'BLOCKED',reason:'SUPERVISOR_STOP_AFTER_EXECUTION'}));continue;
    }
    if(!await auditMeta(accepted?'B8_PORTFOLIO_MISSION_VERIFIED':'B8_PORTFOLIO_MISSION_REJECTED',m,
      accepted?null:'B7_RESULT_UNVERIFIED'))
      return deny('AUDIT_UNAVAILABLE',{completedMetadata:receipts});
    receipts.push(freeze({companyId:m.companyId,missionId:m.missionId,
     state:accepted?'ACCEPTED_LAB':'BLOCKED',reason:accepted?null:'B7_RESULT_UNVERIFIED',
     evidenceHash:accepted?out.evidenceHash:null,replayed:out?.state==='ALREADY_COMPLETED_VERIFIED',
     priorityScore:row.score}));
   }
   return freeze({state:receipts.every(r=>r.state==='ACCEPTED_LAB')?'LAB_PORTFOLIO_ACCEPTED':'LAB_PORTFOLIO_PARTIAL',
    engineId:'ORCH-001',environment:'LAB',version:'0.1.0',sourceType:'LOCAL_LAB_TEST',
    executed:receipts.some(r=>r.state==='ACCEPTED_LAB'),receipts,spentEuro:0,
    noExternalCommunications:true,noLegalOrEconomicCommitments:true,prodAuthorized:false});
  },
  async prepareCommunication({token,companyId,recipientRef,channel,subject,body,mode='PREPARE'}={}){
   const owner=await verifyOwner(token);if(!owner)return deny('OWNER_ROOT_NOT_VERIFIED');
   if(!valid(companyId)||!owner.authorizedCompanies.includes(companyId))return deny('OWNER_COMPANY_SCOPE_DENIED');
   if(mode!=='PREPARE')return deny('EXTERNAL_SEND_NOT_AUTHORIZED');
   if(!valid(recipientRef)||!['EMAIL','WHATSAPP','LETTER'].includes(channel)||
    typeof subject!=='string'||subject.length>160||typeof body!=='string'||body.length>4000)
    return deny('COMMUNICATION_DRAFT_INVALID');
   const m={companyId,missionId:'b8-draft',version:'0.1.0'};
   if(!await auditMeta('B8_COMMUNICATION_DRAFT_PREPARED',m))return deny('AUDIT_UNAVAILABLE');
   return freeze({state:'DRAFT_ONLY',companyId,channel,recipientRef,subject,body,
    sent:false,externalCommitment:false,environment:'LAB',spentEuro:0});
  },
  prepareOnboarding({environment,companyId,synthetic=false}={}){
   if(environment!=='LAB'||synthetic!==true||!valid(companyId))return deny('ONBOARDING_REQUIRES_SYNTHETIC_LAB');
   return freeze({state:'SYNTHETIC_PLAN_ONLY',companyId,engineId:'COMP-ONB-001',
    environment:'LAB',version:'0.1.0',registered:false,installed:false,prodAuthorized:false,
    stages:['COMP-REG-001','BMD-001','SCAN-001','COMPET-001','SEOBOOT-001','SOCBOOT-001',
    'MKTBOOT-001','KBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001','SUP-001'],
    spentEuro:0});
  }
 });
}
