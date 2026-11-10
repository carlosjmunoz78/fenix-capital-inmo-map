import {WorkerEntrypoint} from 'cloudflare:workers';
import {acquireMetSelected,readMetSelected} from './met-selected-gateway-lab.mjs';
import {latestFreeMedia} from './producer-source-catalog.mjs';
const ENGINE='UMS-001',COMPANY='fenix',ENV='LAB';
function assertRequest(input,permission){
  if(input?.company_id!==COMPANY||input.engine_id!==ENGINE||input.environment!==ENV)throw Error('SCOPE_DENIED');
  if(!['textures','hdris'].includes(input.kind))throw Error('TYPE_DENIED');
  if(permission==='media.acquire' && !/^[A-Za-z0-9_-]{1,120}$/.test(String(input.asset_id||'')))throw Error('SELECTION_REQUIRED');
  if(permission==='media.search' && (typeof input.query!=='string'||input.query.trim().length<3||input.query.length>160))throw Error('QUERY_INVALID');
  return true;
}
function intent(env,task,permission){
  if(env.GATEWAY_ENABLED!=='true')throw Error('GATEWAY_DISABLED');
  assertRequest(task,permission);
  if(!env.MEDIA||typeof env.PRIVATE_MEDIA_TOKEN!=='string'||env.PRIVATE_MEDIA_TOKEN.length<32)throw Error('MEDIA_PRIVATE_BINDING_MISSING');
  return {...task,provider:'polyhaven',actor_id:'ums001-producer-lab',permissions:[permission],auth_token:env.PRIVATE_MEDIA_TOKEN};
}
async function search(env,task){const result=await env.MEDIA.search(intent(env,task,'media.search'));
  if(result?.company_id!==COMPANY||result?.engine_id!==ENGINE||result?.environment!==ENV||!Array.isArray(result.results))throw Error('INVALID_SEARCH_REPLY');
  return result;
}
async function acquire(env,task){const result=await env.MEDIA.acquire(intent(env,task,'media.acquire'));
  if(!['STORED','ALREADY_STORED'].includes(result?.status)||result.company_id!==COMPANY||result.engine_id!==ENGINE||
     result.environment!==ENV||result.asset_id!==task.asset_id||result.license!=='CC0-1.0'||result.production_approved!==false||
     !/^[a-f0-9]{64}$/i.test(String(result.sha256||''))||result.cost_eur!==0)throw Error('INVALID_ACQUISITION_RECEIPT');
  return result;
}
async function read(env,task){const result=await env.MEDIA.read(intent(env,task,'media.read'));
  if(result?.company_id!==COMPANY||result.engine_id!==ENGINE||result.environment!==ENV||result.asset_id!==task.asset_id||
     result.license!=='CC0-1.0'||result.production_approved!==false||!(result.bytes instanceof Uint8Array))throw Error('INVALID_MEDIA_READ');
  const bytes=result.bytes;
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(sha!==result.sha256)throw Error('MEDIA_HASH_MISMATCH');
  return {asset_id:result.asset_id,bytes:bytes.length,sha256:sha,rights_review:'PENDING',production_approved:false};
}
async function searchFreeMedia(env,task){
 if(env.GATEWAY_ENABLED!=='true'||env.SOURCE_SCOUT_ENABLED!=='true')throw Error('SCOUT_GATEWAY_DISABLED');
 if(!task||task.company_id!==COMPANY||task.engine_id!==ENGINE||task.environment!==ENV||
 !((task.provider==='ambientcg'&&['textures','hdris','models','decals'].includes(task.kind))||
    (task.provider==='wikimedia_commons'&&env.COMMONS_ENABLED==='true'&&['images','audio','video'].includes(task.kind))||
    (task.provider==='met'&&env.MET_ENABLED==='true'&&task.kind==='images')||
    (task.provider==='openverse'&&((task.kind==='audio'&&env.OPENVERSE_AUDIO_ENABLED==='true')||(task.kind==='images'&&env.OPENVERSE_IMAGES_ENABLED==='true'))))||
 typeof task.query!=='string'||task.query.trim().length<3||task.query.length>(task.provider==='wikimedia_commons'||task.provider==='met'||task.provider==='openverse'?80:120))throw Error('SCOUT_REQUEST_INVALID');
 if(!env.SOURCE_SCOUT||typeof env.SOURCE_SCOUT.search!=='function'||
 typeof env.SOURCE_SCOUT_TOKEN!=='string'||env.SOURCE_SCOUT_TOKEN.length<32)throw Error('SCOUT_PRIVATE_BINDING_REQUIRED');
 const result=await env.SOURCE_SCOUT.search({...task,actor_id:'ums001-producer-lab',permission:'media.search',
 auth_token:env.SOURCE_SCOUT_TOKEN});
 if(result?.company_id!==COMPANY||result?.engine_id!==ENGINE||result?.environment!==ENV||
 result?.provider!==task.provider||result.kind!==task.kind||result.mode!=='METADATA_ONLY'||result.downloaded!==false||
 !Array.isArray(result.results)||result.results.length>(task.provider==='wikimedia_commons'?5:task.provider==='met'?3:8)||
 result.results.some(x=>x.license!=='CC0-1.0'||x.downloaded!==false||x.production_approved!==false||
   (task.provider!=='ambientcg'&&(x.requires_license_review!==true||x.provider!==task.provider))))
 throw Error('SCOUT_INVALID_RESPONSE');
 return {company_id:COMPANY,engine_id:ENGINE,environment:ENV,mode:'METADATA_ONLY',provider:task.provider,kind:task.kind,
 results:result.results,downloaded:false,production_approved:false,additional_cost_eur:0};
}
export class ProducerLibraryLab extends WorkerEntrypoint {
  async search(task){return search(this.env,task)}
  async acquire(task){return acquire(this.env,task)}
  async read(task){return read(this.env,task)}
  async scout(task){return searchFreeMedia(this.env,task)}
  async latest(task){return latestFreeMedia(this.env,task)}
  async select(task){return acquireMetSelected(this.env,task)}
  async readSelected(task){return readMetSelected(this.env,task)}
}
// Private RPC-only producer. No periodic job or public endpoint.
export default {
 async fetch() { return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}}); }
};