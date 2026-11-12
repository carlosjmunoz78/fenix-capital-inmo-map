/** CEREBRO OS · UMS001 shared runtime media broker · LAB
 * One broker for all FACT-registered engines. Only Cloudflare Service Binding RPC.
 * A trusted gateway authenticates its caller and supplies an attested workload principal.
 * Caller identity is not derived from an untrusted media request payload.
 */
import {WorkerEntrypoint} from 'cloudflare:workers';
const ACCOUNT='fenix', ENVIRONMENT='LAB', ITEM='FACTIMAGE001';
const ROOT='meta/ums001-ai-image-factory/v1/';
const ID=/^[A-Z][A-Z0-9-]{2,63}$/;
const RID=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const text=s=>new TextEncoder().encode(s);
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');
function deny(s){throw Error('UNIVERSAL_MEDIA_'+s)}
async function same(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<48||b.length<48||a.length>256||b.length>256)return false;
 const x=await sha(text(a)),y=await sha(text(b));let delta=0;
 for(let i=0;i<64;i++)delta|=x.charCodeAt(i)^y.charCodeAt(i);
 return delta===0;
}
async function scope(env,principal,token){
 if(env.BROKER_ENABLED!=='true'||!env.UMS001_PROVISIONER||!env.IMAGE_KV||
  !await same(token,env.GATEWAY_CALLER_TOKEN))deny('GATEWAY_IAM_REQUIRED');
 if(!principal||typeof principal!=='object'||Array.isArray(principal)||
  Object.keys(principal).sort().join('|')!=='company_id|engine_id|environment|scopes|verified_by'||
  principal.verified_by!=='CEREBRO_GATEWAY_RUNTIME_LAB'||principal.company_id!==ACCOUNT||
  principal.environment!==ENVIRONMENT||!ID.test(principal.engine_id||'')||
  !Array.isArray(principal.scopes)||principal.scopes.length!==1||principal.scopes[0]!=='IMAGE.SYNTHETIC')deny('SCOPE_DENIED');
 return principal.engine_id;
}
function validRequest(command){
 if(!command||typeof command!=='object'||Array.isArray(command)||
  Object.keys(command).sort().join('|')!=='prompt|request_id'||!RID.test(command.request_id||'')||
  typeof command.prompt!=='string'||command.prompt.length<40||command.prompt.length>630||
  command.prompt!==command.prompt.trim()||/api[._ -]?key|access[._ -]?token|password\s*:/i.test(command.prompt))
   deny('INVALID_REQUEST');
 return command;
}
function validReceiptRequest(q){
 if(!q||typeof q!=='object'||Array.isArray(q)||
  Object.keys(q).join('|')!=='request_id'||!RID.test(q.request_id||''))deny('INVALID_RESULT_ID');
 return q.request_id;
}
async function verifiedReceipt(env,principal,token,command){
 const eng=await scope(env,principal,token),rid=validReceiptRequest(command);
 const r=await env.UMS001_PROVISIONER.statusImageFromTrustedUniversalGateway({
  company_id:ACCOUNT,environment:ENVIRONMENT,engine_id:eng,request_id:rid
 },env.UMS001_RUNTIME_BROKER_TOKEN);
 if(!r)return {state:'QUEUED_OR_PROCESSING',engine_id:eng,request_id:rid,environment:ENVIRONMENT};
 if(r.state!=='PRIVATE_ASSET_RECEIVED'||r.company_id!==ACCOUNT||r.engine_id!==eng||
  r.environment!==ENVIRONMENT||r.request_id!==rid||r.item_id!==ITEM||
  r.publish_authorized!==false||r.technical_qa!=='PASS'||
  !/^[0-9a-f]{64}$/.test(r.asset_sha256||'')||
  !Number.isSafeInteger(r.bytes)||r.bytes<4000||r.bytes>4500000)deny('INVALID_RECEIPT');
 return {state:'PRIVATE_ASSET_RECEIVED',engine_id:eng,request_id:rid,environment:ENVIRONMENT,
  private_asset_ref:r.private_artifact_ref,sha256:r.asset_sha256,bytes:r.bytes,
  technical_qa:'PASS',visual_qa:'PENDING',brand_qa:'PENDING',publish_authorized:false};
}
export class UniversalMediaRuntimeBroker extends WorkerEntrypoint{
 async capability(principal,gatewayToken){const engine=await scope(this.env,principal,gatewayToken);const r=await this.env.UMS001_PROVISIONER.engineStatus(engine);return {engine_id:engine,capability:"IMAGE.SYNTHETIC",provider:"UMS-001",environment:"LAB",status:r?.state==="ACTIVE"?"READY_AUTHENTICATED":"PENDING_FACTORY_IAM",automatic_for_registered_engines:true,publish_authorized:false};}
 async submit(principal,command,gatewayToken){
  const engine=await scope(this.env,principal,gatewayToken);
  const job=validRequest(command);
  const status=await this.env.UMS001_PROVISIONER.requestImageFromTrustedUniversalGateway({
   company_id:ACCOUNT,environment:ENVIRONMENT,engine_id:engine,request_id:job.request_id,prompt:job.prompt
  },this.env.UMS001_RUNTIME_BROKER_TOKEN);
  if(status?.state!=='ACCEPTED'||status.engine_id!==engine||status.publication!==false)deny('NOT_ACCEPTED');
  return {state:'ACCEPTED',engine_id:engine,request_id:job.request_id,environment:ENVIRONMENT,
    provider:'UMS-001',publish_authorized:false};
 }
 async receipt(principal,command,gatewayToken){
  const r=await verifiedReceipt(this.env,principal,gatewayToken,command);
  const {private_asset_ref,...safe}=r;
  return safe;
 }
 async privateJPEG(principal,command,gatewayToken){
  const r=await verifiedReceipt(this.env,principal,gatewayToken,command);
  if(r.state!=='PRIVATE_ASSET_RECEIVED')return {state:r.state};
  if(typeof r.private_asset_ref!=='string'||r.private_asset_ref!==
    'private/ums001-registered-image/v1/'+r.engine_id+'/'+r.request_id+'/'+ITEM+'.jpg')deny('ASSET_SCOPE');
  const bytes=await this.env.IMAGE_KV.get(r.private_asset_ref,{type:'arrayBuffer'});
  if(!bytes||bytes.byteLength!==r.bytes||await sha(bytes)!==r.sha256)deny('IMAGE_INTEGRITY');
  const image=new Uint8Array(bytes);
  if(image[0]!==255||image[1]!==216||image[image.length-2]!==255||image[image.length-1]!==217)deny('NOT_JPEG');
  return {state:'PRIVATE_ASSET_RECEIVED',mime:'image/jpeg',sha256:r.sha256,bytes:image,
    engine_id:r.engine_id,request_id:r.request_id,publish_authorized:false};
 }
}
export default {async fetch(){return new Response('Not Found',{status:404,headers:{'cache-control':'no-store'}})}};
