/** ZEUS/JARVIS B4. Server-only contract. No production endpoint or activation. */
import {createHash,randomUUID} from 'node:crypto';

export const B4_KINDS=Object.freeze(['FACT','DECISION','PREFERENCE','CORRECTION','CHECKPOINT','REVOCATION']);
const SOURCES=new Set(['OWNER_STATEMENT','SYSTEM_VERIFIED','DOCUMENT','INFERENCE']);
const LINK_TYPES=new Set(['COMPANY','PROJECT','MISSION','DOCUMENT','CONVERSATION','ENGINE']);
const SENSITIVE=/(?:password|api[_ -]?key|access[_ -]?token|bearer\s|private[_ -]?key|session[_ -]?cookie|sk-[a-zA-Z0-9]{12,})/i;
const SECURITY_PREF=/(?:auth|mfa|password|secret|token|permission|payment|money|legal|signature|security|consent|privacy|delete|erase|compliance|limit|risk)/i;
const clone=x=>structuredClone(x);
const canonical=x=>Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')}}`:JSON.stringify(x);
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
function key(x,name,max=180){if(typeof x!=='string'||!new RegExp(`^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,${max-1}}$`).test(x))throw Error(`${name}_INVALID`);return x;}
function date(iso,name){if(typeof iso!=='string'||!Number.isFinite(Date.parse(iso)))throw Error(`${name}_INVALID`);return iso;}
function checkContent(text){if(typeof text!=='string'||text.length<1||text.length>4000||SENSITIVE.test(text))throw Error('MEMORY_CONTENT_REJECTED');return text;}
function scope({ownerId,companyId,environment,projectId}){return {ownerId,companyId,environment,projectId};}
function sameScope(a,b){return a.ownerId===b.ownerId&&a.companyId===b.companyId&&a.environment===b.environment&&a.projectId===b.projectId;}
function validateLinks(links,companyId){if(!Array.isArray(links)||links.length>20)throw Error('LINKS_INVALID');return links.map(x=>{if(!LINK_TYPES.has(x?.type)||!x?.id)throw Error('LINK_INVALID');key(x.id,'LINK_ID');if(x.companyId!==companyId)throw Error('CROSS_COMPANY_LINK');return {type:x.type,id:x.id,companyId};});}

/** LAB-only storage. Shared durable storage must implement appendUnique + list atomically. */
export class B4MemoryLabStore {
 constructor(){this.entries=[];this.dedupe=new Map();this.resolvedTargets=new Set();this.checkpointSequences=new Set();}
 async appendUnique(e){
  const base=[e.ownerId,e.companyId,e.environment,e.projectId].join('|');
  const idempotencyKey=base+'|'+e.idempotencyKey;
  const old=this.dedupe.get(idempotencyKey);
  if(old){if(old.fingerprint!==e.fingerprint)throw Error('IDEMPOTENCY_CONFLICT');return {event:clone(old),replayed:true};}
  // This synchronous critical section has no await. Persistent backends MUST provide equivalent
  // SQL UNIQUE constraints: a pre-insert snapshot check alone is unsafe under concurrency.
  const targetKey=['CORRECTION','REVOCATION'].includes(e.kind)?base+'|TARGET|'+e.targetId:null;
  const cpKey=e.kind==='CHECKPOINT'?base+'|CHECKPOINT|'+e.missionId+'|'+e.checkpoint.sequence:null;
  if(targetKey&&this.resolvedTargets.has(targetKey))throw Error('TARGET_ALREADY_RESOLVED');
  if(cpKey&&this.checkpointSequences.has(cpKey))throw Error('CHECKPOINT_SEQUENCE_CONFLICT');
  const item=clone({...e,sequence:this.entries.length+1});
  this.entries.push(item);this.dedupe.set(idempotencyKey,item);
  if(targetKey)this.resolvedTargets.add(targetKey);
  if(cpKey)this.checkpointSequences.add(cpKey);
  return {event:clone(item),replayed:false};
 }
 async list(s){return this.entries.filter(x=>sameScope(x,s)).map(clone);}
}

export function createJarvisB4Memory({identityProvider,store,controlStore,provenanceVerifier=null,b3PolicyService=null,environment='LAB',clock=()=>new Date().toISOString(),ids=randomUUID}={}){
 if(!identityProvider?.verify||!store?.appendUnique||!store?.list||!controlStore?.get)throw Error('B4_TRUSTED_ADAPTERS_REQUIRED');
 if(!['LAB','PREPROD','PROD'].includes(environment))throw Error('ENVIRONMENT_INVALID');
 async function principal(token,companyId){if(!token)throw Error('AUTH_REQUIRED');const p=await identityProvider.verify(token);if(!p?.ownerId||!p.sessionId||!p.roles?.includes('OWNER_ROOT')||!Array.isArray(p.authorizedCompanies))throw Error('OWNER_ROOT_REQUIRED');if(!p.authorizedCompanies.includes(companyId))throw Error('COMPANY_SCOPE_DENIED');return p;}
 async function checkB3Policy(token,companyId,actionName){
  if(environment!=='PROD')return;
  if(typeof b3PolicyService?.authorize!=='function')throw Error('B3_POLICY_REQUIRED');
  const decision=await b3PolicyService.authorize({token,companyId,environment,actionName});
  if(decision?.decision!=='ALLOW')throw Error('B3_POLICY_DENIED');
 }
 async function authorizeWrite(token,companyId){const c=await controlStore.get({companyId,environment});if(c?.enabled!==true||c?.killSwitch!==false)throw Error('B4_LOCKED');await checkB3Policy(token,companyId,'JARVIS_MEMORY_APPEND');}
 async function readScoped(token,companyId,projectId){key(companyId,'COMPANY_ID');key(projectId,'PROJECT_ID');const p=await principal(token,companyId);const s=scope({ownerId:p.ownerId,companyId,environment,projectId});return {s,events:await store.list(s)};}
 async function append({token,companyId,projectId,missionId=null,idempotencyKey,kind,subjectKey,value='',source,confidence,ttlSeconds=2592000,consent=null,targetId=null,links=[],checkpoint=null,neverAskAgain=false}){
  const {s,events}=await readScoped(token,companyId,projectId);
  await authorizeWrite(token,companyId);
  key(idempotencyKey,'IDEMPOTENCY_KEY');key(subjectKey,'SUBJECT_KEY');
  if(!B4_KINDS.includes(kind))throw Error('MEMORY_KIND_INVALID');
  if(missionId!==null)key(missionId,'MISSION_ID');
  if(!source||!SOURCES.has(source.kind)||!Array.isArray(source.evidenceRefs)||source.evidenceRefs.length===0||source.evidenceRefs.length>12)throw Error('PROVENANCE_REQUIRED');
  key(source.id,'SOURCE_ID');for(const ref of source.evidenceRefs)key(ref,'EVIDENCE_REF',350);
  if(source.kind!=='OWNER_STATEMENT' && (typeof provenanceVerifier!=='function'||await provenanceVerifier({source,scope:s})!==true))throw Error('PROVENANCE_NOT_VERIFIED');
  if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1)throw Error('CONFIDENCE_INVALID');
  if(!Number.isSafeInteger(ttlSeconds)||ttlSeconds<60||ttlSeconds>31536000)throw Error('TTL_INVALID');
  if(kind!=='REVOCATION')checkContent(value);
  else if(value!=='')throw Error('REVOCATION_MUST_NOT_STORE_CONTENT');
  const safeLinks=validateLinks(links,companyId);
  if(kind==='PREFERENCE'){
   if(source.kind!=='OWNER_STATEMENT'||consent?.granted!==true||consent?.purpose!=='MEMORY_PREFERENCE')throw Error('PREFERENCE_CONSENT_REQUIRED');
   if(neverAskAgain&&(SECURITY_PREF.test(subjectKey)||consent.allowNeverAskAgain!==true))throw Error('NEVER_ASK_SECURITY_DENIED');
  }else if(neverAskAgain)throw Error('NEVER_ASK_REQUIRES_PREFERENCE');
  if(kind==='CHECKPOINT'){
   if(!missionId||!checkpoint||!Number.isSafeInteger(checkpoint.sequence)||checkpoint.sequence<1||!['PREPARED','RUNNING','RECONCILE_REQUIRED','COMPLETE'].includes(checkpoint.stage)||typeof checkpoint.executionReceiptRef!=='string')throw Error('CHECKPOINT_INVALID');
   key(checkpoint.executionReceiptRef,'RECEIPT_REF');
  }else if(checkpoint!==null)throw Error('CHECKPOINT_ONLY');
  if(['CORRECTION','REVOCATION'].includes(kind)){
   if(!targetId)throw Error('TARGET_REQUIRED');
   const target=events.find(x=>x.id===targetId);if(!target||target.subjectKey!==subjectKey||target.kind==='REVOCATION'||events.some(x=>['REVOCATION','CORRECTION'].includes(x.kind)&&x.targetId===targetId&&x.idempotencyKey!==idempotencyKey))throw Error('TARGET_SCOPE_OR_SUBJECT_DENIED');
   if(source.kind==='INFERENCE')throw Error('INFERRED_CORRECTION_DENIED');
  }else if(targetId!==null)throw Error('TARGET_ONLY_FOR_CORRECTIONS');
  if(kind==='CHECKPOINT'){
   const prev=events.filter(x=>x.kind==='CHECKPOINT'&&x.missionId===missionId);
   if(prev.some(x=>x.checkpoint.sequence>checkpoint.sequence))throw Error('CHECKPOINT_OUT_OF_ORDER');
   if(prev.some(x=>x.checkpoint.sequence===checkpoint.sequence&&x.idempotencyKey!==idempotencyKey))throw Error('CHECKPOINT_SEQUENCE_CONFLICT');
  }
  const createdAt=date(clock(),'CLOCK');const expiresAt=new Date(Date.parse(createdAt)+ttlSeconds*1000).toISOString();
  if(['REVOCATION','CORRECTION'].includes(kind)&&targetId){const prior=events.find(x=>x.id===targetId);if(Date.parse(expiresAt)<Date.parse(prior.expiresAt))throw Error('CORRECTION_RETENTION_TOO_SHORT');}
  const payload={...s,engineId:'JARVIS-CORE-001',version:'B4-0.1.0',missionId,idempotencyKey,kind,subjectKey,value,source:{kind:source.kind,id:source.id,evidenceRefs:[...source.evidenceRefs]},confidence,expiresAt,consent:kind==='PREFERENCE'?{granted:true,purpose:'MEMORY_PREFERENCE',allowNeverAskAgain:neverAskAgain}:null,targetId,links:safeLinks,checkpoint:checkpoint?clone(checkpoint):null,neverAskAgain};
  const {expiresAt:_expiresAt,...stablePayload}=payload;const fingerprint=hash({...stablePayload,ttlSeconds});
  const event={...payload,id:ids(),fingerprint,createdAt,canonicalState:source.kind==='INFERENCE'?'REVIEW_REQUIRED':'CANDIDATE'};
  return store.appendUnique(event);
 }
 async function readContext({token,companyId,projectId,missionId=null}){
  const {events}=await readScoped(token,companyId,projectId);await checkB3Policy(token,companyId,'JARVIS_MEMORY_READ');const now=Date.parse(date(clock(),'CLOCK'));
  const live=events.filter(e=>Date.parse(e.expiresAt)>now);
  const removed=new Set(live.filter(e=>e.kind==='REVOCATION'||e.kind==='CORRECTION').map(e=>e.targetId));
  const grouped=new Map();const checkpoints=[];
  for(const e of live){
   if(e.kind==='CHECKPOINT'){if(missionId&&e.missionId===missionId)checkpoints.push(e);continue;}
   if(e.kind==='REVOCATION'||removed.has(e.id))continue;
   if(e.source.kind==='INFERENCE'||e.confidence<0.75)continue;
   const items=grouped.get(e.subjectKey)||[];items.push(e);grouped.set(e.subjectKey,items);
  }
  const memory=[];
  for(const [subjectKey,items] of grouped){const different=new Set(items.map(e=>e.value));const conflict=different.size>1;
   memory.push({subjectKey,status:conflict?'CONFLICT':'GROUNDED',value:conflict?null:items[items.length-1].value,evidence:items.map(e=>({id:e.id,source:e.source,confidence:e.confidence,expiresAt:e.expiresAt})),neverAskAgain:!conflict&&items.some(e=>e.neverAskAgain)});
  }
  checkpoints.sort((a,b)=>a.checkpoint.sequence-b.checkpoint.sequence);
  const last=checkpoints.at(-1);
  return {scope:{companyId,projectId,environment},memory,checkpoint:last?{missionId:last.missionId,sequence:last.checkpoint.sequence,stage:last.checkpoint.stage,executionReceiptRef:last.checkpoint.executionReceiptRef,resumeState:last.checkpoint.stage==='COMPLETE'?'COMPLETE':'RECONCILIATION_REQUIRED'}:null};
 }
 return Object.freeze({append,readContext});
}