/** B8 CUT02 · LAB commitment tracking over existing durable JOB/store adapter.
 * Contract only: store is an injected existing tenant-scoped persistence port.
 * No new table, no customer promise, no notification, no external mutation.
 */
import {createHash} from 'node:crypto';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const TYPES=new Set(['INTERNAL_FOLLOW_UP','INTERNAL_DEADLINE','EXTERNAL_DEPENDENCY_REVIEW',
 'DOCUMENTATION_REVIEW','INCIDENT_REVIEW','PERIODIC_INTERNAL_REVIEW']);
const deny=(reason)=>Object.freeze({state:'DENY',reason,executed:false,prodAuthorized:false,spentEuro:0});
function canonical(input,owner){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>
  !['companyId','commitmentId','projectId','responsibleActorId','sourceEvidenceRefs','nextActionRef',
    'dueAt','type','counterpartyAccepted','economicCommitmentEuro','externalAction'].includes(k)))
   return null;
 if(![input.companyId,input.commitmentId,input.responsibleActorId,input.nextActionRef].every(valid)||
  (input.projectId!==undefined&&!valid(input.projectId))||!TYPES.has(input.type)||
  !Array.isArray(input.sourceEvidenceRefs)||input.sourceEvidenceRefs.length<1||
  input.sourceEvidenceRefs.length>8||input.sourceEvidenceRefs.some(x=>!valid(x))||
  input.counterpartyAccepted!==false||input.economicCommitmentEuro!==0||
  input.externalAction!==false||!owner.authorizedCompanies.includes(input.companyId))return null;
 let dueAt=null;
 if(input.dueAt!==undefined&&input.dueAt!==null){
  if(typeof input.dueAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input.dueAt))return null;
  const ms=Date.parse(input.dueAt);if(!Number.isFinite(ms))return null;dueAt=new Date(ms).toISOString();
 }
 return Object.freeze({companyId:input.companyId,commitmentId:input.commitmentId,
  projectId:input.projectId??null,responsibleActorId:input.responsibleActorId,
  sourceEvidenceRefs:[...new Set(input.sourceEvidenceRefs)],nextActionRef:input.nextActionRef,
  dueAt,type:input.type,ownerId:owner.ownerId,environment:'LAB',engineId:'ORCH-001',
  version:'0.1.0',status:'INTERNAL_TRACKING',counterpartyAccepted:false,
  economicCommitmentEuro:0,externalAction:false});
}
export function createJarvisB8CommitmentTracker({identityProvider,companyRegistry,policy,supervisor,store,audit}={}){
 if(typeof identityProvider?.verify!=='function'||typeof companyRegistry?.resolve!=='function'||
  typeof policy?.authorize!=='function'||typeof supervisor?.inspect!=='function'||
  typeof store?.putIfAbsent!=='function'||typeof store?.list!=='function'||
  typeof audit?.append!=='function')throw Error('B8_EXISTING_DURABLE_PORTS_REQUIRED');
 async function auth(token,companyId,actionName){
  if(typeof token!=='string'||!valid(companyId))return null;
  let owner,company,grant,check;
  try{owner=await identityProvider.verify(token);
   if(!valid(owner?.ownerId)||!Array.isArray(owner?.roles)||!owner.roles.includes('OWNER_ROOT')||
    !Array.isArray(owner.authorizedCompanies)||!owner.authorizedCompanies.includes(companyId))return null;
   company=await companyRegistry.resolve({companyId,environment:'LAB'});
   if(company?.companyId!==companyId||company.environment!=='LAB'||company.status!=='ACTIVE'||company.verified!==true)return null;
   grant=await policy.authorize({token,companyId,environment:'LAB',actionName});
   if(grant?.decision!=='ALLOW')return null;
   check=await supervisor.inspect({companyId,environment:'LAB'});
   if(check?.enabled!==true||check.killSwitch!==false||check.halted===true||check.revoked===true||check.costEuro!==0)return null;
   return owner;
  }catch{return null;}
 }
 async function event(eventCode,r){
  try{return await audit.append({eventCode,companyId:r.companyId,commitmentId:r.commitmentId,
   ownerId:r.ownerId,engineId:'ORCH-001',environment:'LAB',version:'0.1.0'})===true;}
  catch{return false;}
 }
 return Object.freeze({
  async track({token,commitment,environment='LAB'}={}){
   if(environment!=='LAB')return deny('PROD_NOT_CERTIFIED');
   const owner=await auth(token,commitment?.companyId,'JARVIS_B8_INTERNAL_COMMITMENT_TRACK');
   if(!owner)return deny('TENANT_POLICY_OR_SUPERVISOR_DENIED');
   const record=canonical(commitment,owner);if(!record)return deny('EXTERNAL_COMMITMENT_OR_CONTRACT_INVALID');
   if(!await event('B8_COMMITMENT_PREPARED',record))return deny('AUDIT_UNAVAILABLE');
   const fingerprint=createHash('sha256').update(JSON.stringify(record)).digest('hex');
   let saved;
   try{saved=await store.putIfAbsent({companyId:record.companyId,commitmentId:record.commitmentId,
    ownerId:owner.ownerId,environment:'LAB',fingerprint,record});}
   catch{return deny('DURABLE_STORE_UNAVAILABLE');}
   if(!['CREATED','ALREADY_EXISTS'].includes(saved?.state)||saved.companyId!==record.companyId||
    saved.commitmentId!==record.commitmentId||saved.fingerprint!==fingerprint)
    return deny('DURABLE_RECEIPT_UNVERIFIED_OR_CONFLICT');
   if(!await event('B8_COMMITMENT_TRACKED',record))return deny('AUDIT_UNAVAILABLE');
   return Object.freeze({state:'LAB_INTERNAL_TRACKED',companyId:record.companyId,
    commitmentId:record.commitmentId,fingerprint,replayed:saved.state==='ALREADY_EXISTS',
    thirdPartyCommitment:false,externalAction:false,spentEuro:0,prodAuthorized:false});
  },
  async list({token,companyId,environment='LAB'}={}){
   if(environment!=='LAB')return deny('PROD_NOT_CERTIFIED');
   const owner=await auth(token,companyId,'JARVIS_B8_INTERNAL_COMMITMENT_READ');
   if(!owner)return deny('TENANT_POLICY_OR_SUPERVISOR_DENIED');
   let rows;
   try{rows=await store.list({companyId,ownerId:owner.ownerId,environment:'LAB',limit:50});}
   catch{return deny('DURABLE_STORE_UNAVAILABLE');}
   if(!Array.isArray(rows)||rows.length>50||rows.some(r=>r.companyId!==companyId||
    r.ownerId!==owner.ownerId||r.environment!=='LAB'||!valid(r.commitmentId)||
    !TYPES.has(r.type)||r.status!=='INTERNAL_TRACKING'||r.counterpartyAccepted!==false))
    return deny('CROSS_TENANT_OR_INVALID_RECORD');
   return Object.freeze({state:'LAB_INTERNAL_LIST',companyId,engineId:'ORCH-001',
    environment:'LAB',version:'0.1.0',sourceType:'LOCAL_LAB_TEST',
    commitments:rows.map(r=>Object.freeze({commitmentId:r.commitmentId,type:r.type,
      dueAt:r.dueAt??null,responsibleActorId:r.responsibleActorId,
      nextActionRef:r.nextActionRef,status:r.status,evidenceCount:r.sourceEvidenceRefs?.length??0})),
    count:rows.length,spentEuro:0,prodAuthorized:false});
  }
 });
}
