/** FACT-001 to UMS-001 universal issuer enrollment. One shared LAB runtime, no public route. */
import {WorkerEntrypoint} from 'cloudflare:workers';
const INBOX='cerebro-fact001-ums001-enrollment-lab-eu';
const PREFIX='meta/fact001-ums001-issuer/v1/';
const utf=s=>new TextEncoder().encode(s);
const hex=a=>Array.from(new Uint8Array(a)).map(x=>x.toString(16).padStart(2,'0')).join('');
const base64=a=>btoa(String.fromCharCode(...new Uint8Array(a)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const id=/^[A-Z][A-Z0-9-]{2,63}$/;
function canon(x){if(Array.isArray(x))return '['+x.map(canon).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')+'}';return JSON.stringify(x)}
const FIELDS=['schema_version','event_type','event_id','company_id','engine_id','environment','version','allowed_channels','media_capabilities','issued_at_utc','signature'];
function valid(e){
 if(!e||typeof e!=='object'||Object.keys(e).sort().join('|')!==FIELDS.slice().sort().join('|')||e.schema_version!==1||e.event_type!=='FACT001_ENGINE_CREATED'||e.company_id!=='fenix'||e.environment!=='LAB'||!id.test(e.engine_id||'')||!/^\d+\.\d+\.\d+$/.test(e.version||''))throw Error('FACT_ENROLL_SCOPE');
 if(!/^FACT-ENROLL-[A-Z0-9-]{12,100}$/.test(e.event_id||''))throw Error('FACT_ENROLL_EVENT_ID');
 if(!Array.isArray(e.allowed_channels)||e.allowed_channels.length<1||e.allowed_channels.length>8||!e.allowed_channels.every(x=>['SEO','GENERIC','FACEBOOK','INSTAGRAM','LINKEDIN','YOUTUBE','TIKTOK'].includes(x)))throw Error('FACT_ENROLL_CHANNELS');
 if(!Array.isArray(e.media_capabilities)||e.media_capabilities.length!==1||e.media_capabilities[0]!=='IMAGE.SYNTHETIC')throw Error('FACT_ENROLL_CAPABILITY');
 if(!Number.isFinite(Date.parse(e.issued_at_utc))||Math.abs(Date.now()-Date.parse(e.issued_at_utc))>300000)throw Error('FACT_ENROLL_EXPIRED');
 return e;
}
async function verifyEvent(e,env){
 valid(e);
 if(typeof env.FACT_EVENT_SIGNING_KEY!=='string'||env.FACT_EVENT_SIGNING_KEY.length<48)throw Error('FACT_EVENT_SIGNING_KEY_MISSING');
 if(typeof e.signature!=='string'||!(/^[A-Za-z0-9+/]+={0,2}$/.test(e.signature))||e.signature.length>160)throw Error('FACT_EVENT_SIG_INVALID');
 const {signature,...signed}=e;
 const k=await crypto.subtle.importKey('raw',utf(env.FACT_EVENT_SIGNING_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',k,unb64(signature),utf(canon(signed))))throw Error('FACT_EVENT_SIGNATURE_DENIED');
 return true;
}
async function aesKey(env){
 if(!/^[0-9a-f]{64}$/.test(env.FACT_PRIVATE_MASTER_KEY||''))throw Error('PRIVATE_VAULT_MASTER_MISSING');
 const raw=Uint8Array.from(env.FACT_PRIVATE_MASTER_KEY.match(/../g),x=>parseInt(x,16));
 return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function unseal(entry,env){
 const key=await aesKey(env);
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(entry.iv)},key,unb64(entry.ciphertext));
 return crypto.subtle.importKey('pkcs8',bytes,{name:'Ed25519'},false,['sign']);
}
function makeProbe(e,record){
 const rid='UMS001-LAB-FACT-PROBE-'+Date.now()+'-'+e.engine_id;
 return {schema_version:'1.0.0',event_type:'MEDIA_JOB_REQUESTED',request_id:rid,
 company_id:'fenix',engine_id:'UMS-001',origin_engine_id:e.engine_id,environment:'LAB',
 version:'1.0.0',trigger:'ENGINE_EVENT',asset_kind:'IMAGE',capability_id:'IMAGE.SYNTHETIC',
 item_id:'FACTIMAGE001',consumer_engine_id:'UMS-001',channel_id:e.allowed_channels[0],
 placement:'GENERIC',brief_ref:'cerebro://briefs/ums001/'+rid,
 format:{profile_id:'FACT_LAB_SQUARE',width_px:1024,height_px:1024,duration_seconds:null,output_mime:'image/jpeg'},
 rights_profile:'SYNTHETIC_ORIGINAL',priority:'NORMAL',requested_at_utc:new Date().toISOString(),
 deadline_utc:null,policy_version:'ums001-policy-v1',
 budget:{max_additional_cost_eur:0,max_attempts:1,prepaid_only:true,paid_execution_enabled:false,auto_recharge:false,publish_requested:false},
 reply_to:'cerebro://events/ums001/lab'};
}
async function enroll(e,env){
 if(env.FACT_PROVISION_ENABLED!=='true'||!env.SIGNED_GATEWAY||!env.ISSUER_VAULT||!env.FACT_ENROLL_TOKEN)throw Error('FACT_PROVISION_OFF');
 await verifyEvent(e,env);
 const kv=PREFIX+'engines/'+e.company_id+'/'+e.environment+'/'+e.engine_id;
 let record=await env.ISSUER_VAULT.get(kv,{type:'json'});
 if(record){
  if(record.event_id!==e.event_id||record.version!==e.version||canon(record.allowed_channels)!==canon(e.allowed_channels))throw Error('FACT_EXISTING_ENGINE_POLICY_CONFLICT');
  if(record.state==='ACTIVE')return {state:'ACTIVE',engine_id:e.engine_id,already_enrolled:true,key_id:record.key_id,signing_test:record.signing_test};
 }
 let privateKey;
 if(!record){
  const pair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const spki=await crypto.subtle.exportKey('spki',pair.publicKey),pkcs8=await crypto.subtle.exportKey('pkcs8',pair.privateKey);
  const master=await aesKey(env),iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},master,pkcs8);
  const keyId='UMS001-LAB-'+e.engine_id+'-'+e.event_id.slice(-14);
  record={state:'PENDING_GATEWAY',event_id:e.event_id,engine_id:e.engine_id,company_id:e.company_id,
   environment:'LAB',version:e.version,key_id:keyId,
   public_spki_base64:base64(spki),public_spki_sha256:hex(await crypto.subtle.digest('SHA-256',spki)),
   allowed_channels:e.allowed_channels,iv:base64(iv),ciphertext:base64(cipher),
   encrypted_private_key:true,created_at:new Date().toISOString()};
  await env.ISSUER_VAULT.put(kv,JSON.stringify(record));
  privateKey=pair.privateKey;
 }else privateKey=await unseal(record,env);
 const reg={schema_version:'1.0.0',event_id:e.event_id,key_id:record.key_id,
 company_id:e.company_id,environment:'LAB',origin_engine_id:e.engine_id,
 version:e.version,public_spki_base64:record.public_spki_base64,
 public_spki_sha256:record.public_spki_sha256,allowed_channels:e.allowed_channels,
 allowed_kinds:['IMAGE'],capabilities:['IMAGE.SYNTHETIC'],issued_at_utc:new Date().toISOString()};
 const result=await env.SIGNED_GATEWAY.enrollFactoryIssuer(reg,env.FACT_ENROLL_TOKEN);
 if(result?.state!=='REGISTERED')throw Error('FACT_GATEWAY_REGISTRATION_FAILED');
 const payload=makeProbe(e,record);
 const unsigned={schema_version:1,key_id:record.key_id,issuer:e.engine_id,sent_at_utc:new Date().toISOString(),
 nonce:crypto.randomUUID(),payload};
 const signed={...unsigned,signature:base64(await crypto.subtle.sign('Ed25519',privateKey,utf(canon(unsigned))))};
 const verified=await env.SIGNED_GATEWAY.submitSignedJob(signed);
 if(verified?.status!=='REGISTERED_QA_PENDING'&&verified?.status!=='DUPLICATE_ACCEPTED')throw Error('FACT_SIGNED_MEDIA_PROBE_REJECTED');
 record={...record,state:'ACTIVE',signing_test:verified.status,activated_at:new Date().toISOString()};
 await env.ISSUER_VAULT.put(kv,JSON.stringify(record));
 await env.ISSUER_VAULT.put(PREFIX+'audit/'+e.event_id,JSON.stringify({
  state:'ACTIVE',event_type:e.event_type,engine_id:e.engine_id,company_id:e.company_id,
  environment:'LAB',version:e.version,key_id:record.key_id,registered:true,
  signed_probe_status:verified.status,no_publication:true,provider_calls:0,at:new Date().toISOString()}));
 return {state:'ACTIVE',engine_id:e.engine_id,company_id:e.company_id,key_id:record.key_id,signing_test:verified.status,media_generated:false};
}

const RESULTS='cerebro-ums001-registered-image-results-lab-eu';
async function receiveImageResult(msg,env){
 if(!msg||msg.event_type!=='UMS001_IMAGE_PRIVATE_READY'||msg.company_id!=='fenix'||msg.environment!=='LAB'||!id.test(msg.engine_id||'')||
 !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(msg.request_id||'')||
 !/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(msg.item_id||'')||!(/^[a-f0-9]{64}$/.test(msg.asset_sha256||''))||
 msg.publish_authorized!==false)throw Error('RESULT_INVALID');
 const registered=await env.ISSUER_VAULT.get(PREFIX+'engines/fenix/LAB/'+msg.engine_id,{type:'json'});
 if(registered?.state!=='ACTIVE')throw Error('RESULT_ENGINE_UNREGISTERED');
 const r=await env.IMAGE_KV.get('meta/ums001-ai-image-factory/v1/receipts/'+msg.engine_id+'/'+msg.request_id+'/'+msg.item_id,{type:'json'});
 if(!r||r.state!=='PRIVATE_READY'||r.company_id!=='fenix'||r.origin_engine_id!==msg.engine_id||r.asset_sha256!==msg.asset_sha256||r.private_artifact_ref!==msg.private_artifact_ref||r.publish_authorized!==false)throw Error('RESULT_RECEIPT_MISMATCH');
 const bytes=await env.IMAGE_KV.get(r.private_artifact_ref,{type:'arrayBuffer'});
 if(!bytes||bytes.byteLength<4000||bytes.byteLength>4500000)throw Error('RESULT_FILE_MISSING');
 const observed=hex(await crypto.subtle.digest('SHA-256',bytes));
 if(observed!==msg.asset_sha256)throw Error('RESULT_HASH_MISMATCH');
 const ack={state:'PRIVATE_ASSET_RECEIVED',company_id:'fenix',engine_id:msg.engine_id,environment:'LAB',request_id:msg.request_id,item_id:msg.item_id,
 asset_sha256:observed,private_artifact_ref:r.private_artifact_ref,bytes:bytes.byteLength,technical_qa:'PASS',
 visual_qa:'PENDING',brand_qa:'PENDING',publish_authorized:false,at:new Date().toISOString()};
 await env.ISSUER_VAULT.put(PREFIX+'deliveries/'+msg.engine_id+'/'+msg.request_id+'/'+msg.item_id,JSON.stringify(ack));
 return {state:ack.state};
}

export class FactoryIssuerProvisioner extends WorkerEntrypoint{
 async enrollFromGitHubOIDC(payload,token){
  if(this.env.FACT_PROVISION_ENABLED!=='true'||typeof this.env.FACT_GITHUB_BRIDGE_TOKEN!=='string'||this.env.FACT_GITHUB_BRIDGE_TOKEN.length<48||
    typeof token!=='string'||token.length!==this.env.FACT_GITHUB_BRIDGE_TOKEN.length)throw Error('FACT_GITHUB_BRIDGE_UNAUTHORIZED');
  const a=utf(token),b=utf(this.env.FACT_GITHUB_BRIDGE_TOKEN);if(a.length!==b.length)throw Error('FACT_GITHUB_BRIDGE_UNAUTHORIZED');
  let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
  if(mismatch!==0)throw Error('FACT_GITHUB_BRIDGE_UNAUTHORIZED');
  if(!payload||payload.schema_version!==1||payload.event_type!=='FACT001_ENGINE_CREATED'||payload.company_id!=='fenix'||
   payload.environment!=='LAB'||!id.test(payload.engine_id||'')||payload.allowed_channels?.length!==1||
   !['GENERIC','SEO'].includes(payload.allowed_channels[0])||JSON.stringify(payload.media_capabilities)!=='["IMAGE.SYNTHETIC"]')
   throw Error('FACT_GITHUB_BRIDGE_SCOPE_DENIED');
  const hash=hex(await crypto.subtle.digest('SHA-256',utf('fenix/LAB/'+payload.engine_id+'/'+payload.version))).slice(0,32).toUpperCase();
  if(payload.event_id!=='FACT-ENROLL-'+hash)throw Error('FACT_GITHUB_BRIDGE_EVENT_ID_DENIED');
  const now={...payload,issued_at_utc:new Date().toISOString()};
  const k=await crypto.subtle.importKey('raw',utf(this.env.FACT_EVENT_SIGNING_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=base64(await crypto.subtle.sign('HMAC',k,utf(canon(now))));
  const result=await enroll({...now,signature},this.env);
  await this.env.ISSUER_VAULT.put(PREFIX+'github-oidc/'+payload.event_id,JSON.stringify({state:result.state,engine_id:payload.engine_id,event_id:payload.event_id,at:new Date().toISOString(),authenticated_via:'GITHUB_ACTIONS_OIDC_BRIDGE',no_publication:true}));
  return result;
 }

 async enrollEngine(e){return enroll(e,this.env)}
 async enrollTrustedGithubEvent(e,token){
  if(this.env.FACT_PROVISION_ENABLED!=='true'||typeof this.env.GITHUB_OIDC_BRIDGE_SECRET!=='string'||this.env.GITHUB_OIDC_BRIDGE_SECRET.length<48||typeof token!=='string'||token.length!==this.env.GITHUB_OIDC_BRIDGE_SECRET.length)throw Error('TRUSTED_GITHUB_BRIDGE_DENIED');
  const a=utf(token),b=utf(this.env.GITHUB_OIDC_BRIDGE_SECRET);
  let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
  if(mismatch!==0)throw Error('TRUSTED_GITHUB_BRIDGE_DENIED');
  const {signature,...event}=e||{};
  if(signature!==undefined)throw Error('BRIDGE_EVENT_MUST_NOT_BE_PRESIGNED');
  const key=await crypto.subtle.importKey('raw',utf(this.env.FACT_EVENT_SIGNING_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=base64(await crypto.subtle.sign('HMAC',key,utf(canon(event))));
  return enroll({...event,signature:signed},this.env);
 }
 async imageReceipt(engine_id,request_id,item_id){if(!id.test(engine_id||'')||!(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(request_id||''))||!(/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(item_id||'')))throw Error('RESULT_ID_DENIED');const approved=await this.env.ISSUER_VAULT.get(PREFIX+'engines/fenix/LAB/'+engine_id,{type:'json'});if(approved?.state!=='ACTIVE')throw Error('ENGINE_NOT_REGISTERED');return await this.env.ISSUER_VAULT.get(PREFIX+'deliveries/'+engine_id+'/'+request_id+'/'+item_id,{type:'json'});}
 async requestImageFromTrustedGithub(input,token){
  const expected=this.env.GITHUB_OIDC_BRIDGE_SECRET;
  if(this.env.FACT_PROVISION_ENABLED!=='true'||typeof expected!=='string'||expected.length<48||typeof token!=='string'||token.length!==expected.length)throw Error('TRUSTED_GITHUB_IMAGE_DENIED');
  const a=utf(token),b=utf(expected);let bad=0;for(let i=0;i<a.length;i++)bad|=a[i]^b[i];
  if(bad!==0)throw Error('TRUSTED_GITHUB_IMAGE_DENIED');
  if(!input||input.company_id!=='fenix'||input.environment!=='LAB'||!id.test(input.engine_id||'')||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(input.request_id||'')||
    input.channel_id!=='GENERIC'||input.publish_requested!==false||
    typeof input.prompt!=='string'||input.prompt.length<40||input.prompt.length>630||
    /api[._ -]?key|access[._ -]?token|password\s*:/i.test(input.prompt))throw Error('TRUSTED_GITHUB_IMAGE_SCOPE');
  const rec=await this.env.ISSUER_VAULT.get(PREFIX+'engines/fenix/LAB/'+input.engine_id,{type:'json'});
  if(rec?.state!=='ACTIVE'||rec.environment!=='LAB'||rec.company_id!=='fenix'||!rec.encrypted_private_key)throw Error('IMAGE_ENGINE_NOT_REGISTERED');
  const briefKey='meta/ums001-ai-image-factory/v1/briefs/'+input.engine_id+'/'+input.request_id;
  const before=await this.env.IMAGE_KV.get(briefKey,{type:'json'});
  if(before&&before.prompt!==input.prompt)throw Error('IMAGE_REQUEST_ID_CONFLICT');
  if(!before)await this.env.IMAGE_KV.put(briefKey,JSON.stringify({
    company_id:'fenix',environment:'LAB',origin_engine_id:input.engine_id,request_id:input.request_id,
    rights_profile:'SYNTHETIC_ORIGINAL',publish_requested:false,prompt:input.prompt
  }));
  const e={engine_id:input.engine_id,company_id:'fenix',environment:'LAB',version:rec.version,allowed_channels:['GENERIC']};
  const payload=makeProbe(e,rec);
  payload.request_id=input.request_id;
  payload.brief_ref='cerebro://briefs/ums001/'+input.request_id;
  payload.policy_version='ums001-execution-lab-v1';
  const unsigned={schema_version:1,key_id:rec.key_id,issuer:input.engine_id,sent_at_utc:new Date().toISOString(),
    nonce:crypto.randomUUID(),payload};
  const privateKey=await unseal(rec,this.env);
  const signed={...unsigned,signature:base64(await crypto.subtle.sign('Ed25519',privateKey,utf(canon(unsigned))))};
  const result=await this.env.SIGNED_GATEWAY.submitSignedJob(signed);
  if(!['REGISTERED_QA_PENDING','DUPLICATE_ACCEPTED'].includes(result?.status))throw Error('IMAGE_GATEWAY_DID_NOT_ACCEPT');
  return {state:'ACCEPTED',request_id:input.request_id,engine_id:input.engine_id,channel_id:'GENERIC',
    signed_gateway_status:result.status,publication:false};
 }
 async engineStatus(engine_id){
  if(!id.test(engine_id||''))throw Error('INVALID_ENGINE');
  const r=await this.env.ISSUER_VAULT.get(PREFIX+'engines/fenix/LAB/'+engine_id,{type:'json'});
  return {engine_id,state:r?.state||'NOT_REGISTERED',signing_test:r?.signing_test||null};
 }
}
export default {
 async queue(batch,env){
  if(batch.queue!==INBOX&&batch.queue!==RESULTS)throw Error('FACT_WRONG_QUEUE');
  if(batch.queue===RESULTS){for(const m of batch.messages){try{await receiveImageResult(m.body,env);m.ack()}catch(e){try{await env.ISSUER_VAULT.put(PREFIX+'result-errors/'+String(m.id).slice(0,60),JSON.stringify({code:String(e?.message||'ERROR').slice(0,85),at:new Date().toISOString()}));m.ack()}catch{m.retry({delaySeconds:60})}}}return;}
  for(const m of batch.messages){
   try{await enroll(m.body,env);m.ack()}
   catch(e){
    try{await env.ISSUER_VAULT.put(PREFIX+'errors/'+String(m.id).slice(0,60),JSON.stringify({
      code:String(e?.message||'FACT_ENROLL_ERROR').replace(/[^A-Z0-9_]/gi,'_').slice(0,90),
      at:new Date().toISOString(),no_registration_approved:true}));m.ack()}
    catch{m.retry({delaySeconds:60})}
   }
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})}
};