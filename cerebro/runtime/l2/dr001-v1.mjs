import { assertNonEmptyString, assertNonNegativeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const DR_001=deepFreeze({engine_id:'DR-001',version:'0.1.0',layer:'L2',capability:'BACKUP_MANIFEST_RESTORE_PROOF_FOUNDATION',backup_execution:false,restore_execution:false,prod_writes:false,additional_cost_eur:0});
const SHA256=/^[a-f0-9]{64}$/i;

export function buildBackupManifest(input){
  const backup_id=assertNonEmptyString(input?.backup_id,'backup_id'),created_at=assertNonEmptyString(input?.created_at,'created_at');
  if(!Number.isFinite(Date.parse(created_at)))throw new TypeError('created_at must be ISO-compatible');
  if(!Array.isArray(input?.items)||!input.items.length)throw new TypeError('items must be a non-empty array');
  const items=input.items.map((x,i)=>{
    const item_id=assertNonEmptyString(x?.item_id,`items[${i}].item_id`),sha256=assertNonEmptyString(x?.sha256,`items[${i}].sha256`);
    if(!SHA256.test(sha256))throw new TypeError(`items[${i}].sha256 must be a sha256 hex digest`);
    const size_bytes=assertNonNegativeNumber(x?.size_bytes,`items[${i}].size_bytes`);
    if(!Array.isArray(x?.copies)||!x.copies.length)throw new TypeError(`items[${i}].copies must be a non-empty array`);
    const copies=x.copies.map((c,j)=>({location_id:assertNonEmptyString(c?.location_id,`items[${i}].copies[${j}].location_id`),media_type:assertNonEmptyString(c?.media_type,`items[${i}].copies[${j}].media_type`),offsite:c?.offsite===true}));
    return {item_id,sha256:sha256.toLowerCase(),size_bytes,copies};
  });
  return result('DR-001',{status:'MANIFEST_READY',backup_id,created_at,items,backup_execution:false,contains_secret_values:false});
}

export function assess321Coverage(manifest){
  if(manifest?.engine_id!=='DR-001'||!Array.isArray(manifest?.items))throw new TypeError('manifest must come from DR-001');
  const gaps=[];
  for(const item of manifest.items){
    const distinctLocations=new Set(item.copies.map(c=>c.location_id)),media=new Set(item.copies.map(c=>c.media_type)),offsite=item.copies.some(c=>c.offsite);
    if(distinctLocations.size<3)gaps.push({item_id:item.item_id,rule:'3_COPIES'});
    if(media.size<2)gaps.push({item_id:item.item_id,rule:'2_MEDIA'});
    if(!offsite)gaps.push({item_id:item.item_id,rule:'1_OFFSITE'});
  }
  return result('DR-001',{status:gaps.length?'GAP':'GREEN',gaps,backup_execution:false});
}

export function recordRestoreProof(input){
  const manifest_id=assertNonEmptyString(input?.manifest_id,'manifest_id'),tested_at=assertNonEmptyString(input?.tested_at,'tested_at');
  if(!Number.isFinite(Date.parse(tested_at)))throw new TypeError('tested_at must be ISO-compatible');
  const success=input?.success===true,checksum_verified=input?.checksum_verified===true;
  return result('DR-001',{status:success&&checksum_verified?'GREEN':'FAIL',manifest_id,tested_at,success,checksum_verified,restore_execution:false});
}
