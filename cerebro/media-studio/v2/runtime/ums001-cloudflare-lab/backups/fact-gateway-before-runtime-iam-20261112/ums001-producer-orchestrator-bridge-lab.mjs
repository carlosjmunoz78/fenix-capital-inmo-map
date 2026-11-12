/** Additive CEREBRO orchestration seam, never mutates original creative pipeline. */
const SCOPE={company_id:'fenix',engine_id:'UMS-001',environment:'LAB'};
const KINDS={ambientcg:new Set(['textures','hdris']),met:new Set(['images']),wikimedia_commons:new Set(['images','audio','video']),openverse:new Set(['audio']),polyhaven:new Set(['textures','hdris'])};
function guard({request,identity,producerService},permission){
 if(!request||Object.entries(SCOPE).some(([k,v])=>request[k]!==v))throw Error('ORCH_UMS_SCOPE_DENIED');
 if(!identity||identity.gateway_verified!==true||identity.company_id!=='fenix'||identity.environment!=='LAB'||
 identity.actor_id!=='cerebro-orchestrator-lab'||!Array.isArray(identity.scopes)||!identity.scopes.includes(permission))throw Error('ORCH_UMS_IDENTITY_DENIED');
 if(!KINDS[request.provider]?.has(request.kind))throw Error('ORCH_UMS_PROVIDER_KIND_DENIED');
 if(typeof request.production_id!=='string'||!/^[A-Za-z0-9_:-]{3,120}$/.test(request.production_id))throw Error('ORCH_UMS_PRODUCTION_DENIED');
 if(typeof request.request_id!=='string'||!/^[A-Za-z0-9_-]{8,96}$/.test(request.request_id))throw Error('ORCH_UMS_REQUEST_ID_DENIED');
 if(!producerService||typeof producerService!=='object')throw Error('ORCH_UMS_PRIVATE_BINDING_REQUIRED');
 if(request.publish_requested===true||request.auto_publish===true||request.expected_cost_eur>0)throw Error('ORCH_UMS_SIDE_EFFECT_DENIED');
}
export async function routeMediaProductionResource({request,identity,producerService}){
 const action=request?.action;
 if(!['SEARCH','LATEST','SELECT','READ'].includes(action))throw Error('ORCH_UMS_ACTION_DENIED');
 const permission=['SEARCH','LATEST'].includes(action)?'media.search':action==='SELECT'?'media.acquire':'media.read';
 guard({request,identity,producerService},permission);
 if(action==='LATEST'){
  if(typeof producerService.latest!=='function')throw Error('ORCH_UMS_LATEST_BINDING_MISSING');
  const reply=await producerService.latest({...request,action:undefined});
  const cap=request.provider==='wikimedia_commons'?5:request.provider==='met'?3:8;
  if(reply?.company_id!=='fenix'||reply.engine_id!=='UMS-001'||reply.environment!=='LAB'||
   reply.provider!==request.provider||reply.kind!==request.kind||reply.mode!=='METADATA_ONLY'||
   reply.downloaded!==false||reply.production_approved!==false||reply.publish_authorized!==false||
   !Array.isArray(reply.results)||reply.results.length>cap||
   reply.results.some(x=>x.license!=='CC0-1.0'||x.production_approved!==false||x.downloaded!==false||x.provider!==request.provider))
   throw Error('ORCH_UMS_INVALID_LATEST_REPLY');
  const ready=reply.refresh_status==='GREEN_METADATA'&&reply.results.length>0&&reply.status==='CACHED_CANDIDATES_FOR_QA';
  return {status:ready?'CACHED_CANDIDATES_FOR_QA':'SOURCE_NOT_READY',company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
   provider:request.provider,kind:request.kind,production_id:request.production_id,refresh_status:reply.refresh_status,
   refreshed_at:reply.refreshed_at,candidates:ready?reply.results:[],downloaded:false,publish_authorized:false,cost_eur:0};
 }
 if(action==='SEARCH'){
  if(typeof (request.provider==='polyhaven'?producerService.search:producerService.scout)!=='function')throw Error('ORCH_UMS_PRIVATE_BINDING_REQUIRED');
  if(typeof request.query!=='string'||request.query.trim().length<3||request.query.length>120)throw Error('ORCH_UMS_QUERY_DENIED');
  const reply=await (request.provider==='polyhaven'?producerService.search({...request,action:undefined}):producerService.scout({...request,action:undefined}));
  if(reply?.company_id!=='fenix'||reply.engine_id!=='UMS-001'||reply.environment!=='LAB'||reply.provider!==request.provider||reply.kind!==request.kind||
     !Array.isArray(reply.results)||reply.results.length>(request.provider==='wikimedia_commons'?5:request.provider==='met'?3:8)||
     (request.provider!=='polyhaven'&&(reply.downloaded!==false||reply.production_approved!==false))||
     reply.results.some(x=>x.license!=='CC0-1.0'||(request.provider!=='polyhaven'&&(x.downloaded!==false||x.production_approved!==false))))throw Error('ORCH_UMS_INVALID_SEARCH_REPLY');
  return {status:'CANDIDATES_FOR_QA',company_id:'fenix',engine_id:'UMS-001',environment:'LAB',production_id:request.production_id,
   provider:request.provider,kind:request.kind,candidates:reply.results,downloaded:false,publish_authorized:false,cost_eur:0};
 }
 if(request.provider!=='met'||request.kind!=='images'||request.selected_asset_id!=='met:436524'||request.explicit_selection!==true)
   throw Error('ORCH_UMS_EXPLICIT_SELECTION_REQUIRED');
 if(action==='SELECT'){
  if(typeof producerService.select!=='function')throw Error('ORCH_UMS_PRIVATE_BINDING_REQUIRED');
  const receipt=await producerService.select(request);
  if(receipt?.status!=='STORED'||receipt.asset_id!==request.selected_asset_id||receipt.production_id!==request.production_id||
     receipt.sha256?.length!==64||receipt.license!=='CC0-1.0'||receipt.production_approved!==false||receipt.publish_authorized!==false||receipt.additional_cost_eur!==0)
     throw Error('ORCH_UMS_INVALID_SELECTION_RECEIPT');
  return {status:'CANDIDATE_STORED_QA_PENDING',asset_id:receipt.asset_id,production_id:request.production_id,
   sha256:receipt.sha256,bytes:receipt.bytes,rights_review:'PENDING',production_approved:false,publish_authorized:false,cost_eur:0};
 }
 if(typeof producerService.readSelected!=='function')throw Error('ORCH_UMS_PRIVATE_BINDING_REQUIRED');
 const result=await producerService.readSelected(request);
 if(!(result?.bytes instanceof Uint8Array)||result.sha256?.length!==64||result.asset_id!==request.selected_asset_id||
    result.license!=='CC0-1.0'||result.production_approved!==false||result.publish_authorized!==false)
   throw Error('ORCH_UMS_INVALID_READ_REPLY');
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',result.bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(sha!==result.sha256)throw Error('ORCH_UMS_HASH_MISMATCH');
 return {status:'CANDIDATE_BYTES_VERIFIED_NOT_PUBLISHED',asset_id:result.asset_id,production_id:request.production_id,
   bytes:result.bytes,sha256:sha,rights_review:'PENDING',production_approved:false,publish_authorized:false};
}