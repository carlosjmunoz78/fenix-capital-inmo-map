
import {WorkerEntrypoint} from 'cloudflare:workers';
const NS='meta/ums001-ai-image-factory/v1/';
const MODEL='@cf/black-forest-labs/flux-1-schnell';
const OWNER_EMAIL='carlosj.munozcabeza@gmail.com';
const REQ_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const CHANNELS=['SEO','INSTAGRAM','FACEBOOK','LINKEDIN','YOUTUBE','TIKTOK'];
const out=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(code,status=400)=>out({ok:false,code},status);
const hex=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
const textToBytes=s=>new TextEncoder().encode(s);
function requireText(value,min,max){return typeof value==='string'&&value.length>=min&&value.length<=max&&value.trim()===value}
function event(payload,source){
 const now=new Date().toISOString();
 return {schema_version:'1.0.0',event_type:'MEDIA_JOB_REQUESTED',
 request_id:payload.request_id,company_id:'fenix',engine_id:'UMS-001',
 origin_engine_id:source,environment:'LAB',version:'1.0.0',trigger:source==='CHATGPT-001'?'CHATGPT':'ENGINE_EVENT',
 asset_kind:'IMAGE',capability_id:'IMAGE.SYNTHETIC',item_id:payload.item_id,
 consumer_engine_id:payload.channel_id==='SEO'?'SEO-001':'SOC-001',channel_id:payload.channel_id,
 placement:payload.channel_id==='SEO'?'HERO':'FEED',
 brief_ref:'cerebro://briefs/ums001/'+payload.request_id,
 format:{profile_id:payload.channel_id==='SEO'?'SEO_HERO_LAB_SQUARE':'SOC_FEED_LAB_SQUARE',
 width_px:1024,height_px:1024,duration_seconds:null,output_mime:'image/jpeg'},
 rights_profile:'SYNTHETIC_ORIGINAL',priority:'NORMAL',requested_at_utc:now,
 deadline_utc:null,policy_version:'ums001-policy-v1',
 budget:{max_additional_cost_eur:0,max_attempts:1,prepaid_only:true,
 paid_execution_enabled:false,auto_recharge:false,publish_requested:false},
 reply_to:'cerebro://events/ums001/lab'};
}
function validateInput(obj,source){
 if(!obj||typeof obj!=='object'||Object.keys(obj).length>12)throw Error('INVALID_JSON');
 if(!REQ_ID.test(obj.request_id||'')||!(/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(obj.item_id||'')))throw Error('INVALID_IDS');
 if(!CHANNELS.includes(obj.channel_id))throw Error('CHANNEL_DENIED');
 if(source==='SOC-001'&&!['FACEBOOK','INSTAGRAM'].includes(obj.channel_id))throw Error('SOC_CHANNEL_DENIED');
 if(!requireText(obj.prompt,40,630)||/api[._ -]?key|access[._ -]?token|password\s*:/i.test(obj.prompt))throw Error('INVALID_PROMPT');
 if(obj.company_id!=='fenix'||obj.environment!=='LAB'||obj.publish_requested!==false||obj.rights_profile!=='SYNTHETIC_ORIGINAL')throw Error('SCOPE_DENIED');
}
async function submit(body,source,env){
 validateInput(body,source);
 if(!env.BRIEF_KV||!env.CHATGPT_QUEUE||!env.SOCIAL_QUEUE)throw Error('NOT_CONFIGURED');
 const pref=NS+'briefs/'+source+'/'+body.request_id;
 const ledger=NS+'gateway/'+source+'/'+body.request_id+'/'+body.item_id;
 const old=await env.BRIEF_KV.get(ledger,{type:'json'});
 if(old){if(old.origin_engine_id!==source||old.channel_id!==body.channel_id||old.prompt_sha!==await hex(textToBytes(body.prompt)))throw Error('REQUEST_CONFLICT');return {ok:true,status:old.status||'QUEUED',request_id:body.request_id,duplicate:true};}
 const record={company_id:'fenix',environment:'LAB',origin_engine_id:source,
 request_id:body.request_id,rights_profile:'SYNTHETIC_ORIGINAL',publish_requested:false,prompt:body.prompt};
 await env.BRIEF_KV.put(pref,JSON.stringify(record));
 const command=event(body,source);
 const queue=source==='CHATGPT-001'?env.CHATGPT_QUEUE:env.SOCIAL_QUEUE;
 await queue.send(command);
 await env.BRIEF_KV.put(ledger,JSON.stringify({status:'QUEUED',origin_engine_id:source,
 request_id:body.request_id,channel_id:body.channel_id,item_id:body.item_id,
 prompt_sha:await hex(textToBytes(body.prompt)),at:new Date().toISOString(),
 publication:false,paid_authorized:false}));
 return {ok:true,status:'QUEUED',request_id:body.request_id,item_id:body.item_id,
 engine_id:'UMS-001',origin_engine_id:source,environment:'LAB',publication:false};
}
function receiptKey(source,id,item){return NS+'receipts/'+source+'/'+id+'/'+item;}
async function getStatus(source,id,item,env){
 if(!REQ_ID.test(id)||!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(item))return fail('INVALID_IDS');
 const ledger=await env.BRIEF_KV.get(NS+'gateway/'+source+'/'+id+'/'+item,{type:'json'});
 if(!ledger)return fail('UNKNOWN_REQUEST',404);
 const r=await env.BRIEF_KV.get(receiptKey(source,id,item),{type:'json'});
 if(!r)return out({status:'QUEUED_OR_PROCESSING',request_id:id});
 if(r.company_id!=='fenix'||r.environment!=='LAB'||r.origin_engine_id!==source||r.request_id!==id||r.item_id!==item)return fail('RECEIPT_SCOPE_CONFLICT',409);
 return out({status:r.state,request_id:id,item_id:item,technical_qa:r.technical_qa||null,
 format_verified:r.format_verified===true,mime:r.mime||null,width_px:r.width_px||null,height_px:r.height_px||null,
 bytes:r.bytes||null,private_asset_available:r.state==='PRIVATE_READY',publication_authorized:false,
 visual_qa:r.visual_qa||null,brand_qa:r.brand_qa||null});
}
async function getAsset(source,id,item,env){
 if(!REQ_ID.test(id)||!/^[A-Z0-9][A-Z0-9_-]{2,79}$/.test(item))return fail('INVALID_IDS');
 const ledger=await env.BRIEF_KV.get(NS+'gateway/'+source+'/'+id+'/'+item,{type:'json'});
 if(!ledger)return fail('UNKNOWN_REQUEST',404);
 const r=await env.BRIEF_KV.get(receiptKey(source,id,item),{type:'json'});
 if(!r||r.state!=='PRIVATE_READY'||r.company_id!=='fenix'||r.environment!=='LAB'||r.origin_engine_id!==source||r.request_id!==id||r.item_id!==item||r.publish_authorized!==false||!(/^[a-f0-9]{64}$/.test(r.asset_sha256||'')))return fail('NOT_READY',409);
 const bytes=await env.BRIEF_KV.get(r.private_artifact_ref,{type:'arrayBuffer'});
 if(!bytes||await hex(bytes)!==r.asset_sha256)return fail('INTEGRITY_FAILURE',409);
 return new Response(bytes,{headers:{'content-type':'image/jpeg','content-disposition':'inline; filename="cerebro-'+id+'.jpg"','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
}
function ownerPage(){
 const body='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<title>CEREBRO · Productora de imágenes LAB</title><style>body{background:#111827;color:#e5e7eb;font:16px system-ui;margin:0 auto;padding:24px;max-width:760px}main{background:#1f2937;padding:28px;border-radius:18px}h1{font-size:26px}textarea,select,button{width:100%;box-sizing:border-box;padding:14px;margin:10px 0;background:#111827;border:1px solid #64748b;border-radius:8px;color:#fff;font:inherit}textarea{min-height:130px}button{background:#e97228;border:0;color:#111827;font-weight:bold;cursor:pointer}.small{font-size:13px;color:#94a3b8}img{width:100%;border-radius:12px}#result{white-space:pre-wrap}</style>'+
 '<main><h1>Productora CEREBRO · Imágenes</h1><p class="small">LAB · Archivo privado · Sin publicación automática. Formato 1024 × 1024 JPEG.</p><label>Describe la imagen</label><textarea id="prompt" placeholder="Por ejemplo: fotografía inmobiliaria luminosa de una vivienda en Córdoba..."></textarea><label>Destino</label><select id="channel"><option value="SEO">SEO / web</option><option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option><option value="LINKEDIN">LinkedIn</option><option value="YOUTUBE">YouTube</option><option value="TIKTOK">TikTok</option></select><button id="start">Crear imagen privada</button><p id="result" role="status"></p><img id="preview" hidden alt="Imagen generada por CEREBRO"><p class="small">La imagen requiere validación visual, derechos y marca antes de uso comercial.</p></main>'+
 '<script>const $=id=>document.getElementById(id); $("start").onclick=async()=>{const id="UMS001-LAB-OWNER-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,10).toUpperCase();const p=$("prompt").value.trim();if(p.length<40){$("result").textContent="Describe la imagen con al menos 40 caracteres.";return;}const payload={company_id:"fenix",environment:"LAB",request_id:id,item_id:"IMAGE001",channel_id:$("channel").value,prompt:p,rights_profile:"SYNTHETIC_ORIGINAL",publish_requested:false};$("start").disabled=true;$("result").textContent="Solicitud enviada…";try{const r=await fetch("/v1/media/jobs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const ack=await r.json();if(!r.ok)throw Error(ack.code||"ERROR");$("result").textContent="Solicitud "+id+" aceptada. Generando…";for(let t=0;t<35;t++){await new Promise(resolve=>setTimeout(resolve,2500));const s=await fetch("/v1/media/jobs/"+encodeURIComponent(id));const info=await s.json();if(info.status==="PRIVATE_READY"){$("preview").src="/v1/media/assets/"+encodeURIComponent(id);$("preview").hidden=false;$("result").textContent="Imagen privada creada. QA técnico: "+info.technical_qa+". Revisar marca y derechos.";break;}if(["HELD","ERROR","FAILED"].includes(info.status)){throw Error(info.status);}if(t===34)$("result").textContent="La solicitud sigue procesándose. ID: "+id;}}catch(e){$("result").textContent="No se completó: "+e.message;}finally{$("start").disabled=false;}};</script></html>';
 return new Response(body,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY'}});
}
export class UniversalImageGateway extends WorkerEntrypoint {
 async submitEngine(request,token){
  const source=request?.origin_engine_id;
  if(source!=='SOC-001'||typeof token!=='string'||typeof this.env.SOC001_TOKEN!=='string')throw Error('ENGINE_DENIED');
  const expected=await hex(textToBytes(this.env.SOC001_TOKEN));
  const provided=await hex(textToBytes(token));
  if(!/^[a-f0-9]{64}$/.test(expected)||expected!==provided)throw Error('ENGINE_AUTH_FAILED');
  return submit(request,source,this.env);
 }
}
export default {
 async fetch(request,env,ctx){
  // Worker-level Cloudflare Access is mandatory; no Access context means fail closed.
  if(!ctx?.access||typeof ctx.access.getIdentity!=='function')return fail('ACCESS_REQUIRED',403);
  let identity;try{identity=await ctx.access.getIdentity()}catch{return fail('ACCESS_NOT_VERIFIED',403)}
  if(identity?.email?.toLowerCase()!==OWNER_EMAIL)return fail('OWNER_ONLY',403);
  const u=new URL(request.url),p=u.pathname;
  if(request.method==='GET'&&p==='/')return ownerPage();
  if(request.method==='GET'&&p==='/health')return out({ok:true,service:'UMS-001',environment:'LAB',authenticated_owner:true,no_publication:true});
  if(request.method==='POST'&&p==='/v1/media/jobs'){
   if(Number(request.headers.get('content-length')||0)>8000)return fail('BODY_TOO_LARGE',413);
   try{const body=await request.json();return out(await submit(body,'CHATGPT-001',env),202)}catch(e){return fail(String(e?.message||'INVALID_REQUEST').slice(0,80),400)}
  }
  const m=p.match(/^\/v1\/media\/(jobs|assets)\/([A-Za-z0-9._:-]{8,127})$/);
  if(request.method==='GET'&&m)return m[1]==='jobs'?getStatus('CHATGPT-001',m[2],'IMAGE001',env):getAsset('CHATGPT-001',m[2],'IMAGE001',env);
  return fail('NOT_FOUND',404);
 }
};