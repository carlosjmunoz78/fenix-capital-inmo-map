import crypto from 'node:crypto';
import {createAssetRecord} from './asset-registry.mjs';
const SCOPE={company_id:'fenix',engine_id:'UMS-001',environment:'LAB'};
const KINDS=new Set(['textures','hdris']);
function checkRequest(v){
 if(!v||typeof v!=='object'||v.company_id!==SCOPE.company_id||v.engine_id!==SCOPE.engine_id||v.environment!=='LAB')throw Error('UMS_ASSET_SCOPE_DENIED');
 if(!KINDS.has(v.kind))throw Error('UMS_ASSET_KIND_DENIED');
 if(typeof v.request_id!=='string'||!/^[A-Za-z0-9_-]{8,96}$/.test(v.request_id))throw Error('UMS_REQUEST_ID_INVALID');
 if(typeof v.production_id!=='string'||!/^[A-Za-z0-9_:-]{3,120}$/.test(v.production_id))throw Error('UMS_PRODUCTION_REQUIRED');
 return v;
}
function checkIdentity(identity,permission){
 if(!identity||identity.gateway_verified!==true||typeof identity.actor_id!=='string'||identity.actor_id.length<3||
 !Array.isArray(identity.scopes)||!identity.scopes.includes(permission))throw Error('UMS_GATEWAY_AUTH_REQUIRED');
 if(typeof identity.private_service_token!=='string'||identity.private_service_token.length<32)throw Error('UMS_SERVICE_TOKEN_REQUIRED');
 return identity;
}
function intent(req,identity,permission){return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',actor_id:identity.actor_id,permissions:[permission],
 auth_token:identity.private_service_token,kind:req.kind,query:req.query,provider:'polyhaven',
 request_id:req.request_id,asset_id:req.selected_asset_id,max_results:12};}
function requireTransport(t,method){if(!t||typeof t[method]!=='function')throw Error('UMS_PRIVATE_BINDING_REQUIRED');}
export async function searchStudioResources({request,identity,mediaService}){
 const q=checkRequest(request);checkIdentity(identity,'media.search');requireTransport(mediaService,'search');
 if(typeof q.query!=='string'||q.query.trim().length<3||q.query.length>160)throw Error('UMS_QUERY_INVALID');
 const result=await mediaService.search(intent(q,identity,'media.search'));
 if(result?.engine_id!=='UMS-001'||result?.environment!=='LAB'||result?.company_id!=='fenix'||
 !Array.isArray(result.results))throw Error('UMS_PROVIDER_BAD_RESPONSE');
 return {producer_engine_id:'UMS-001',mode:'SEARCH_ONLY',production_id:q.production_id,request_id:q.request_id,
 provider:'polyhaven',candidates:result.results.slice(0,12),downloaded:false,additional_cost_eur:0};
}
export async function acquireStudioResource({request,identity,mediaService}){
 const q=checkRequest(request);checkIdentity(identity,'media.acquire');requireTransport(mediaService,'acquire');
 if(typeof q.selected_asset_id!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(q.selected_asset_id))throw Error('UMS_EXPLICIT_SELECTION_REQUIRED');
 const result=await mediaService.acquire(intent(q,identity,'media.acquire'));
 if(result?.status!=='STORED'||result?.company_id!=='fenix'||result?.engine_id!=='UMS-001'||result?.environment!=='LAB'||
 result.asset_id!==q.selected_asset_id||!/^media\//.test(result.file_key||'')||
 !/^[a-f0-9]{64}$/i.test(result.sha256||'')||result.license!=='CC0-1.0'||result.cost_eur!==0||
 result.production_approved!==false)throw Error('UMS_PROVIDER_RECEIPT_INVALID');
 const record=createAssetRecord({company_id:'fenix',production_id:q.production_id,
  asset_type:q.kind==='hdris'?'IMAGE_HDRI':'IMAGE_TEXTURE',name:result.asset_id,
  master_refs:[result.file_key],rights_status:'UNKNOWN',license_ref:'https://polyhaven.com/license',
  provenance_ref:result.source,metadata:{external_provider:'polyhaven',download_sha256:result.sha256,
   media_key:result.file_key,rights_review:'PENDING',qa:'PENDING',production_approved:false,cost_eur:0}});
 return {producer_engine_id:'UMS-001',status:'CANDIDATE_REGISTERED_QA_PENDING',production_id:q.production_id,
  request_id:q.request_id,asset_record:record,downloaded:true,production_ready:false,additional_cost_eur:0};
}

export async function loadStudioResourceBytes({asset_record,identity,mediaService}){
 checkIdentity(identity,'media.read');requireTransport(mediaService,'read');
 if(!asset_record||asset_record.company_id!=='fenix'||asset_record.status!=='REGISTERED'||
 asset_record.metadata?.external_provider!=='polyhaven'||!/^media\//.test(asset_record.metadata?.media_key||'')||
 !/^[a-f0-9]{64}$/i.test(asset_record.metadata?.download_sha256||''))throw Error('UMS_ASSET_RECORD_INVALID');
 const response=await mediaService.read({company_id:'fenix',engine_id:'UMS-001',environment:'LAB',actor_id:identity.actor_id,
  permissions:['media.read'],auth_token:identity.private_service_token,kind:asset_record.asset_type==='IMAGE_HDRI'?'hdris':'textures',
  asset_id:asset_record.name});
 if(response?.company_id!=='fenix'||response?.engine_id!=='UMS-001'||response?.environment!=='LAB'||
 response?.asset_id!==asset_record.name||response?.license!=='CC0-1.0'||response?.production_approved!==false||
 !response.bytes||response.bytes.byteLength<1000||response.bytes.byteLength>2200000)throw Error('UMS_MEDIA_READ_BAD_RESPONSE');
 const actual=crypto.createHash('sha256').update(Buffer.from(response.bytes)).digest('hex');
 if(actual!==response.sha256||actual!==asset_record.metadata.download_sha256)throw Error('UMS_MEDIA_READ_HASH_MISMATCH');
 return {asset_id:asset_record.asset_id,bytes:Buffer.from(response.bytes),sha256:actual,
  rights_review:'PENDING',production_ready:false,additional_cost_eur:0};
}
