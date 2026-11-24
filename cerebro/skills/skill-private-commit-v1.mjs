// FACT-001 / LRN-001: atomic persistence boundary for existing CP04 inventory.
// Ports MUST be bound by trusted runtime, not supplied by a request. No new IAM or store.
import {createHash} from 'node:crypto';
import {appendPrivateCandidates,snapshotSha256,validatePrivateInventory} from './skill-private-intake-v2.mjs';
const fail=code=>{throw Error(code)};
const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])):x;
export const digest=x=>createHash('sha256').update(JSON.stringify(sorted(x))).digest('hex');
const exact=(a,b)=>digest(a)===digest(b);
const ident=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===expected.slice().sort().join('|');
const requestKeys=['company_id','engine_id','environment','version','request_id','expected_snapshot_sha256','candidates'];
export function createPrivateCommit({companyId,authenticateMachine,verifyOwnerGrant,store,freeze=true,clock=Date.now}={}){
 if(!ident(companyId)||typeof authenticateMachine!=='function'||typeof verifyOwnerGrant!=='function'||typeof store?.read!=='function'||typeof store?.commitOnce!=='function'||typeof freeze!=='boolean')fail('TRUSTED_PORTS_REQUIRED');
 const scope=Object.freeze({company_id:companyId,engine_id:'FACT-001',environment:'LAB',version:'1.0.0',capability:'FACT.SKILL.INTAKE'});
 return async function commit(request,machineProof,ownerProof){
  if(!keys(request,requestKeys)||!ident(request.request_id)||!hex(request.expected_snapshot_sha256)||!Array.isArray(request.candidates)||request.candidates.length<1||request.candidates.length>10||!exact(Object.fromEntries(['company_id','engine_id','environment','version'].map(k=>[k,request[k]])),Object.fromEntries(['company_id','engine_id','environment','version'].map(k=>[k,scope[k]]))))fail('REQUEST_SCOPE');
  // Clone before awaiting any external port to prevent request mutation during authorization.
  const q=structuredClone(request),requestDigest=digest(q),now=clock();
  if(!Number.isSafeInteger(now))fail('CLOCK');
  const principal=await authenticateMachine(machineProof,structuredClone(scope));
  if(!ident(principal?.principal_id)||!exact(principal?.scope??null,scope)||!Number.isSafeInteger(principal.expires_at_ms)||principal.expires_at_ms<=now)fail('MACHINE_DENIED');
  const grant=await verifyOwnerGrant(ownerProof,structuredClone(scope));
  const selected=[...new Set(q.candidates.map(c=>c?.skill_id))].sort();
  if(!ident(grant?.grant_id)||!exact(grant?.scope??null,scope)||grant.principal_id!==principal.principal_id||grant.request_id!==q.request_id||grant.request_digest!==requestDigest||!exact(grant.selected_ids,selected)||!Number.isSafeInteger(grant.expires_at_ms)||!Number.isSafeInteger(grant.issued_at_ms)||grant.issued_at_ms>now||grant.expires_at_ms<=now||grant.expires_at_ms-grant.issued_at_ms>300000)fail('OWNER_GRANT_DENIED');
  const authorization={principal_id:principal.principal_id,grant_id:grant.grant_id,request_digest:requestDigest};
  const storageScope={company_id:companyId,engine_id:'FACT-001',environment:'LAB'};
  const current=await store.read(storageScope,q.request_id);
  if(!exact(current?.scope??null,storageScope)||!current.snapshot)fail('STORE_SCOPE');
  validatePrivateInventory(current.snapshot);
  if(current.receipt){if(!exact(current.receipt.authorization,authorization)||current.receipt.request_id!==q.request_id||!Number.isSafeInteger(current.receipt.added)||!Number.isSafeInteger(current.receipt.duplicates)||current.receipt.added<0||current.receipt.duplicates<0||current.receipt.added+current.receipt.duplicates!==q.candidates.length||current.receipt.promotion_authorized!==false||current.receipt.provider_calls!==0)fail('REPLAY_CONFLICT');return {status:'ALREADY_COMMITTED',request_id:q.request_id,added:current.receipt.added,duplicates:current.receipt.duplicates,promotion_authorized:false,provider_calls:0};}
  if(snapshotSha256(current.snapshot)!==q.expected_snapshot_sha256)fail('STALE_SNAPSHOT');
  const result=appendPrivateCandidates(current.snapshot,q.candidates,{ownerSelectedIds:selected,expectedSnapshotSha256:q.expected_snapshot_sha256,environment:'LAB'});
  if(freeze&&result.added!==0)fail('INTAKE_FROZEN');
  const receipt={request_id:q.request_id,authorization,added:result.added,duplicates:result.duplicates,promotion_authorized:false,provider_calls:0};
  // commitOnce must atomically enforce request ID uniqueness and compare the current
  // snapshot digest. Snapshot and receipt must commit together or neither commit.
  // An uncertain outcome must be reconciled via read, not blindly retried.
  const commitTime=clock();
  if(!Number.isSafeInteger(commitTime)||commitTime<now||commitTime>=principal.expires_at_ms||commitTime>=grant.expires_at_ms)fail('AUTHORIZATION_EXPIRED_BEFORE_WRITE');
  const outcome=await store.commitOnce(storageScope,{expectedSnapshotSha256:q.expected_snapshot_sha256,snapshot:result.snapshot,receipt});
  if(outcome?.status!=='COMMITTED')fail('COMMIT_NOT_CONFIRMED');
  const persisted=await store.read(storageScope,q.request_id);
  if(!exact(persisted?.scope??null,storageScope)||!exact(persisted.receipt,receipt)||snapshotSha256(persisted.snapshot)!==snapshotSha256(result.snapshot))fail('READBACK_NOT_CONFIRMED');
  return {status:'COMMITTED',request_id:q.request_id,added:result.added,duplicates:result.duplicates,promotion_authorized:false,provider_calls:0};
 };
}
