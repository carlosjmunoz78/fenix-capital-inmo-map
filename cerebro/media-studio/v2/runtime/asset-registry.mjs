import crypto from 'node:crypto';

export function createAssetRecord({company_id,production_id=null,asset_type,name,master_refs=[],rights_status='UNKNOWN',license_ref='',provenance_ref,metadata={},version='1.0.0'}){
  if(!company_id||!asset_type||!name||!provenance_ref) throw new Error('company_id, asset_type, name and provenance_ref are required');
  return {
    asset_id:`AST-${crypto.randomUUID()}`,company_id,production_id,asset_type,name,master_refs:[...master_refs],
    rights:{status:rights_status,license_ref},provenance_ref,metadata,version,
    checksum_state:'PENDING',created_at:new Date().toISOString(),status:'REGISTERED'
  };
}

export function assertAssetUsable(asset,{company_id}){
  if(asset.company_id!==company_id) throw new Error('CROSS_COMPANY_DENY');
  if(!['VALID','INTERNAL_ORIGINAL','PUBLIC_DOMAIN_VERIFIED'].includes(asset.rights?.status)) throw new Error('RIGHTS_NOT_VALID');
  if(!asset.provenance_ref) throw new Error('PROVENANCE_REQUIRED');
  return true;
}

export function dedupeAssets(assets=[]){
  const seen=new Set();
  return assets.filter(a=>{const key=`${a.company_id}|${a.asset_type}|${a.provenance_ref}|${a.version}`;if(seen.has(key))return false;seen.add(key);return true;});
}
