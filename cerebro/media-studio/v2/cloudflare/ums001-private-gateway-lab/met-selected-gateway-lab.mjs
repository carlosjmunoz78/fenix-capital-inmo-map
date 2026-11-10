/** UMS-001 · one selected Met image in existing private Producer Gateway, LAB only. */
const SCOPE={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',kind:'images'};
const MAX_BYTES=600_000, MIN_BYTES=1024;
const PREFIX='meta/ums001/met-selected/v1/';
function requestCheck(task,env){
 if(!task||typeof task!=='object'||Object.entries(SCOPE).some(([k,v])=>task[k]!==v))throw Error('MET_GW_SCOPE_DENIED');
 if(env.GATEWAY_ENABLED!=='true'||env.SOURCE_SCOUT_ENABLED!=='true'||env.MET_ENABLED!=='true'||env.MET_SELECT_ENABLED!=='true')throw Error('MET_GW_DISABLED');
 if(task.selected_asset_id!==env.MET_ALLOW_ASSET_ID||task.selected_asset_id!=='met:436524')throw Error('MET_GW_ASSET_NOT_ALLOWLISTED');
 if(task.explicit_selection!==true||task.publish_requested===true||task.production_approved===true)throw Error('MET_GW_SELECTION_REQUIRED');
 if(typeof task.production_id!=='string'||!/^[A-Za-z0-9_:-]{3,120}$/.test(task.production_id))throw Error('MET_GW_PRODUCTION_REQUIRED');
 if(typeof task.request_id!=='string'||!/^[A-Za-z0-9_-]{8,96}$/.test(task.request_id))throw Error('MET_GW_REQUEST_ID_INVALID');
 if(!env.LAB_KV||!env.SOURCE_SCOUT||typeof env.SOURCE_SCOUT.acquire!=='function'||
    typeof env.SOURCE_SCOUT_TOKEN!=='string'||env.SOURCE_SCOUT_TOKEN.length<32)throw Error('MET_GW_PRIVATE_BINDING_REQUIRED');
 return task;
}
async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
function validJpeg(bytes){return bytes instanceof Uint8Array&&bytes.length>=MIN_BYTES&&bytes.length<=MAX_BYTES&&bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217}
function keys(asset){const id=asset.slice(4);return {receipt:PREFIX+'receipt/'+id,media:'media/ums001-met-selected/'+id+'/original.jpg'};}
async function validateStored(env,receipt){
 if(!receipt||receipt.status!=='STORED'||receipt.provider!=='met'||receipt.asset_id!=='met:436524'||
    receipt.company_id!=='fenix'||receipt.environment!=='LAB'||receipt.license!=='CC0-1.0'||
    receipt.production_approved!==false||!/^([a-f0-9]{64})$/.test(receipt.sha256||'')||
    !Number.isInteger(receipt.bytes)||receipt.bytes<MIN_BYTES||receipt.bytes>MAX_BYTES)throw Error('MET_GW_RECEIPT_INVALID');
 if(receipt.file_key!==keys(receipt.asset_id).media)throw Error('MET_GW_KEY_INVALID');
 const blob=await env.LAB_KV.get(receipt.file_key,{type:'arrayBuffer'});
 if(!blob||blob.byteLength!==receipt.bytes||!validJpeg(new Uint8Array(blob))||(await digest(blob))!==receipt.sha256)throw Error('MET_GW_STORAGE_HASH_MISMATCH');
 return new Uint8Array(blob);
}
export async function acquireMetSelected(env,task){
 requestCheck(task,env);
 const k=keys(task.selected_asset_id);
 const prior=await env.LAB_KV.get(k.receipt,{type:'json'});
 if(prior){
  if(prior.production_id!==task.production_id)throw Error('MET_GW_ALREADY_RESERVED_FOR_ANOTHER_PRODUCTION');
  await validateStored(env,prior);
  return {...prior,idempotent_replay:true};
 }
 const value=await env.SOURCE_SCOUT.acquire({company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',kind:'images',
  actor_id:'ums001-producer-lab',permission:'media.acquire',auth_token:env.SOURCE_SCOUT_TOKEN,
  asset_id:task.selected_asset_id,request_id:task.request_id,production_id:task.production_id});
 if(value?.asset_id!==task.selected_asset_id||value.company_id!=='fenix'||value.engine_id!=='UMS-001'||value.environment!=='LAB'||
   value.provider!=='met'||value.kind!=='images'||value.license!=='CC0-1.0'||value.requires_license_review!==true||
   value.production_approved!==false||value.mime!=='image/jpeg'||value.downloaded!==true||
   !validJpeg(value.bytes)||value.byte_length!==value.bytes.length||!/^[a-f0-9]{64}$/.test(value.sha256||''))throw Error('MET_GW_UNTRUSTED_DOWNLOAD');
 const actual=await digest(value.bytes);
 if(actual!==value.sha256)throw Error('MET_GW_DOWNLOAD_HASH_MISMATCH');
 const receipt={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',kind:'images',
  production_id:task.production_id,request_id:task.request_id,asset_id:task.selected_asset_id,status:'STORED',file_key:k.media,
  bytes:value.byte_length,sha256:actual,mime:'image/jpeg',license:'CC0-1.0',source:value.source,source_image:value.source_image,
  requires_license_review:true,rights_review:'PENDING',qa:'PENDING',downloaded:true,production_approved:false,publish_authorized:false,
  additional_cost_eur:0};
 await env.LAB_KV.put(k.media,value.bytes,{metadata:{company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',
  asset_id:task.selected_asset_id,sha256:actual,license:'CC0-1.0'}});
 await env.LAB_KV.put(k.receipt,JSON.stringify(receipt));
 return receipt;
}
export async function readMetSelected(env,task){
 requestCheck(task,env);
 const receipt=await env.LAB_KV.get(keys(task.selected_asset_id).receipt,{type:'json'});
 if(!receipt||receipt.production_id!==task.production_id)throw Error('MET_GW_ASSET_UNAVAILABLE');
 const bytes=await validateStored(env,receipt);
 return {asset_id:receipt.asset_id,company_id:'fenix',engine_id:'UMS-001',environment:'LAB',bytes,sha256:receipt.sha256,
  license:'CC0-1.0',requires_license_review:true,production_approved:false,publish_authorized:false};
}
