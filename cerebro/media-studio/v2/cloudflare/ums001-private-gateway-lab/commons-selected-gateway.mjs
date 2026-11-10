/** UMS-001 LAB · private Producer → Source Scout selected Commons CC0 image. */
const SCOPE={company_id:'fenix',engine_id:'UMS-001',environment:'LAB'};
const SHA=/^[a-f0-9]{64}$/;
function scoped(env,task,permission){
 if(!task||task.company_id!==SCOPE.company_id||task.engine_id!==SCOPE.engine_id||task.environment!==SCOPE.environment||task.provider!=='wikimedia_commons'||task.kind!=='images'||task.explicit_selection!==true||!/^(?:commons:)[1-9][0-9]{2,10}$/.test(task.asset_id||'')||!['media.acquire','media.read'].includes(permission)||env.GATEWAY_ENABLED!=='true'||env.SOURCE_SCOUT_ENABLED!=='true'||env.COMMONS_ENABLED!=='true'||env.COMMONS_SELECT_ENABLED!=='true')throw Error('PRODUCER_COMMONS_SCOPE_DENIED');
 if(!env.SOURCE_SCOUT||typeof env.SOURCE_SCOUT_TOKEN!=='string'||env.SOURCE_SCOUT_TOKEN.length<32)throw Error('PRODUCER_COMMONS_PRIVATE_BINDING_REQUIRED');
 if(typeof task.production_id!=='string'||!/^[A-Za-z0-9_:-]{3,120}$/.test(task.production_id)||typeof task.request_id!=='string'||!/^[A-Za-z0-9_-]{8,96}$/.test(task.request_id))throw Error('PRODUCER_COMMONS_REQUEST_DENIED');
 return {...task,...SCOPE,actor_id:'ums001-producer-lab',permission,auth_token:env.SOURCE_SCOUT_TOKEN};
}
export async function selectCommonsOnProducer(env,task){
 const req=scoped(env,task,'media.acquire');
 if(typeof env.SOURCE_SCOUT.selectCommons!=='function')throw Error('PRODUCER_COMMONS_METHOD_MISSING');
 const receipt=await env.SOURCE_SCOUT.selectCommons(req);
 if(!['STORED','ALREADY_STORED'].includes(receipt?.status)||receipt.asset_id!==task.asset_id||receipt.license!=='CC0-1.0'||receipt.provider!=='wikimedia_commons'||receipt.production_approved!==false||receipt.publish_authorized!==false||!SHA.test(receipt.sha256||'')||!Number.isInteger(receipt.bytes)||receipt.bytes>600000||receipt.bytes<128||!receipt.file_key?.startsWith('media/ums001-commons-selected/v1/'))throw Error('PRODUCER_COMMONS_RECEIPT_UNSAFE');
 return {asset_id:receipt.asset_id,status:receipt.status,provider:'wikimedia_commons',bytes:receipt.bytes,sha256:receipt.sha256,license:'CC0-1.0',file_key:receipt.file_key,rights_review:'PENDING',production_approved:false,publish_authorized:false,cost_eur:0};
}
export async function readCommonsOnProducer(env,task){
 const req=scoped(env,task,'media.read');if(typeof env.SOURCE_SCOUT.readCommons!=='function')throw Error('PRODUCER_COMMONS_METHOD_MISSING');
 const response=await env.SOURCE_SCOUT.readCommons(req);
 if(response?.asset_id!==task.asset_id||response.provider!=='wikimedia_commons'||response.license!=='CC0-1.0'||response.production_approved!==false||response.publish_authorized!==false||!SHA.test(response.sha256||'')||!Number.isInteger(response.bytes)||response.bytes>600000)throw Error('PRODUCER_COMMONS_READ_UNSAFE');
 return response;
}