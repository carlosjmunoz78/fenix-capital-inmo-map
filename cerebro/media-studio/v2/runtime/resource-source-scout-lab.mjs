/** CEREBRO Producer UMS-001 LAB: metadata lookup bridge for free external sources. */
const SCOPE={company_id:'fenix',engine_id:'UMS-001',environment:'LAB'};
const PROVIDERS={ambientcg:new Set(['textures','hdris','models','decals']),openverse:new Set(['images','audio'])};
export async function searchExternalProducerResources({request,identity,sourceScoutService}){
 if(!request||request.company_id!==SCOPE.company_id||request.engine_id!==SCOPE.engine_id||request.environment!=='LAB')throw Error('UMS_SCOPE_DENIED');
 if(!PROVIDERS[request.provider]?.has(request.kind))throw Error('UMS_PROVIDER_KIND_DENIED');
 if(typeof request.query!=='string'||request.query.trim().length<3||request.query.length>120)throw Error('UMS_QUERY_INVALID');
 if(typeof request.production_id!=='string'||!/^[a-zA-Z0-9_:-]{3,120}$/.test(request.production_id))throw Error('UMS_PRODUCTION_REQUIRED');
 if(!identity||identity.gateway_verified!==true||identity.actor_id!=='ums001-producer-lab'||!Array.isArray(identity.scopes)||!identity.scopes.includes('media.search'))throw Error('UMS_GATEWAY_IDENTITY_DENIED');
 if(!sourceScoutService||typeof sourceScoutService.search!=='function')throw Error('UMS_SCOUT_BINDING_MISSING');
 const result=await sourceScoutService.search({company_id:'fenix',engine_id:'UMS-001',environment:'LAB',actor_id:'ums001-producer-lab',permission:'media.search',provider:request.provider,kind:request.kind,query:request.query});
 if(result?.company_id!=='fenix'||result?.engine_id!=='UMS-001'||result?.environment!=='LAB'||result?.provider!==request.provider||result?.kind!==request.kind||result?.mode!=='METADATA_ONLY'||result?.downloaded!==false||!Array.isArray(result.results)||result.results.length>8)throw Error('UMS_SCOUT_BAD_RESPONSE');
 const candidates=result.results.filter(x=>x&&x.license==='CC0-1.0'&&x.downloaded===false&&x.production_approved===false&&typeof x.source==='string'&&x.source.startsWith('https://')).map(x=>({source_asset_id:x.id,source:x.source,license:x.license,title:x.title,creator:x.creator||'',attribution:x.attribution||'',kind:request.kind,provider:request.provider,qa:'PENDING',production_approved:false}));
 return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',production_id:request.production_id,provider:request.provider,candidates,metadata_only:true,downloaded:false,production_approved:false};
}