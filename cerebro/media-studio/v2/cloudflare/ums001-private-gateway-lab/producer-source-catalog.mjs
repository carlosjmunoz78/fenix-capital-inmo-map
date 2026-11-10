/** CEREBRO UMS-001 · private cached CC0-only source lookup. No downloads. */
const COMPANY='fenix',ENGINE='UMS-001',ENV='LAB';
export async function latestFreeMedia(env,task){
 if(env?.GATEWAY_ENABLED!=='true'||env?.SOURCE_SCOUT_ENABLED!=='true'||
  !task||task.company_id!==COMPANY||task.engine_id!==ENGINE||task.environment!==ENV)throw Error('CATALOG_SCOPE_DENIED');
 const allowed={ambientcg:['textures','hdris'],met:['images'],wikimedia_commons:['images','audio','video'],openverse:['images','audio']};
 if(!allowed[task.provider]?.includes(task.kind))throw Error('CATALOG_SOURCE_DENIED');
 if(task.provider==='met'&&env.MET_ENABLED!=='true')throw Error('CATALOG_MET_OFF');
 if(task.provider==='wikimedia_commons'&&env.COMMONS_ENABLED!=='true')throw Error('CATALOG_COMMONS_OFF');
 if(task.provider==='openverse'&&task.kind==='audio'&&env.OPENVERSE_AUDIO_ENABLED!=='true')throw Error('CATALOG_OPENVERSE_AUDIO_OFF');
 if(task.provider==='openverse'&&task.kind==='images'&&env.OPENVERSE_IMAGES_ENABLED!=='true')throw Error('CATALOG_OPENVERSE_IMAGES_OFF');
 if(!env.SOURCE_SCOUT||typeof env.SOURCE_SCOUT.catalog!=='function'||typeof env.SOURCE_SCOUT_TOKEN!=='string'||env.SOURCE_SCOUT_TOKEN.length<32)throw Error('CATALOG_PRIVATE_BINDING_REQUIRED');
 const reply=await env.SOURCE_SCOUT.catalog({...task,actor_id:'ums001-producer-lab',permission:'media.search',auth_token:env.SOURCE_SCOUT_TOKEN});
 const cap=task.provider==='wikimedia_commons'?5:task.provider==='met'?3:8;
 if(reply?.company_id!==COMPANY||reply.engine_id!==ENGINE||reply.environment!==ENV||reply.provider!==task.provider||reply.kind!==task.kind||
  reply.mode!=='METADATA_ONLY'||reply.downloaded!==false||reply.production_approved!==false||!Array.isArray(reply.results)||reply.results.length>cap||
  reply.results.some(x=>x.provider!==task.provider||x.kind!==task.kind||x.license!=='CC0-1.0'||x.downloaded!==false||x.production_approved!==false||
    typeof x.source!=='string'||!x.source.startsWith('https://')||x.qa!=='PENDING'))throw Error('CATALOG_UNTRUSTED_REPLY');
 const ready=reply.refresh_status==='GREEN_METADATA'&&reply.results.length>0;
 return {company_id:COMPANY,engine_id:ENGINE,environment:ENV,provider:task.provider,kind:task.kind,mode:'METADATA_ONLY',
  refresh_status:reply.refresh_status,refreshed_at:reply.refreshed_at,status:ready?'CACHED_CANDIDATES_FOR_QA':'SOURCE_NOT_READY',
  results:ready?reply.results:[],downloaded:false,production_approved:false,publish_authorized:false,cost_eur:0};
}