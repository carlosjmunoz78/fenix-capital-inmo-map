import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

type AckPayload={dedupe_key?:string;ok?:boolean;error?:string};
type FramePayload={session_id?:string;frame_ciphertext?:string;frame_iv?:string;frame_mime?:string;frame_seq?:number};
type FastlaneEntry={channel:any;subscribed:boolean;ready:Promise<boolean>;acks:Map<string,(payload:AckPayload)=>void>;companyId:string;frameKey:CryptoKey|null;frameUrl:string};

const INSTALLED_KEY='__cerebroBrowserRealtimeFastlaneV1';
const OWNER_INPUT='/functions/v1/cerebro-browser-work-total-owner-v1-prod/input';
const OWNER_KEY='/functions/v1/cerebro-browser-work-total-owner-v1-prod/key';
const GATEWAY_STATUS='/functions/v1/cerebro-browser-gateway-v1/owner/status';
const ACK_TIMEOUT_MS=260;
const entries=new Map<string,FastlaneEntry>();
let activeSessionId='';

function bytesFromB64(value:string){const raw=atob(value);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}
async function sha256(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');}
function parseBody(init?:RequestInit){if(typeof init?.body!=='string')return null;try{const body=JSON.parse(init.body);return body&&typeof body==='object'?body as Record<string,unknown>:null;}catch{return null;}}
function urlOf(input:RequestInfo|URL){return typeof input==='string'?input:input instanceof URL?input.href:input.url;}
function topic(sessionId:string){return`cerebro-browser-human-v1:${sessionId}`;}

async function importFrameKey(keyB64:string){return crypto.subtle.importKey('raw',bytesFromB64(keyB64),{name:'AES-GCM'},false,['decrypt']);}
async function decryptFrame(key:CryptoKey,ciphertextB64:string,ivB64:string,mime='image/png'){
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFromB64(ivB64)},key,bytesFromB64(ciphertextB64));
 return URL.createObjectURL(new Blob([plain],{type:mime||'image/png'}));
}

function install(){
 if(!IS_PRODUCTION||typeof window==='undefined')return;
 const state=window as unknown as Window&Record<string,unknown>;
 if(state[INSTALLED_KEY])return;
 state[INSTALLED_KEY]=true;
 const nativeFetch=window.fetch.bind(window);

 const ensureFrameKey=async(entry:FastlaneEntry,sessionId:string)=>{
  if(entry.frameKey)return entry.frameKey;
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error('REALTIME_OWNER_AUTH_REQUIRED');
  const response=await nativeFetch(`${SUPABASE_URL}${OWNER_KEY}`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({company_id:entry.companyId,session_id:sessionId})});
  const body=await response.json().catch(()=>null) as {ok?:boolean;key_b64?:string}|null;
  if(!response.ok||!body?.ok||!body.key_b64)throw new Error('REALTIME_FRAME_KEY_UNAVAILABLE');
  entry.frameKey=await importFrameKey(body.key_b64);
  return entry.frameKey;
 };

 const applyFrame=async(entry:FastlaneEntry,payload:FramePayload)=>{
  const sessionId=String(payload.session_id||'');
  if(!sessionId||sessionId!==activeSessionId||!payload.frame_ciphertext||!payload.frame_iv)return;
  try{
   const key=await ensureFrameKey(entry,sessionId);
   const next=await decryptFrame(key,payload.frame_ciphertext,payload.frame_iv,payload.frame_mime||'image/png');
   const image=document.querySelector<HTMLImageElement>('.cerebro-browser-console .cerebro-browser-viewport>img');
   if(!image){URL.revokeObjectURL(next);return;}
   if(entry.frameUrl)URL.revokeObjectURL(entry.frameUrl);
   entry.frameUrl=next;
   image.src=next;
   image.dataset.realtimeFrameSeq=String(payload.frame_seq??'');
  }catch{/* durable status refresh remains the visual fallback */}
 };

 const ensureChannel=(sessionId:string,companyId:string)=>{
  const existing=entries.get(sessionId);if(existing){existing.companyId=companyId;return existing;}
  const acks=new Map<string,(payload:AckPayload)=>void>();
  let resolveReady:(value:boolean)=>void=()=>{};
  const ready=new Promise<boolean>(resolve=>{resolveReady=resolve;});
  const entry:FastlaneEntry={channel:null,subscribed:false,ready,acks,companyId,frameKey:null,frameUrl:''};
  const channel=supabase.channel(topic(sessionId),{config:{broadcast:{self:false,ack:true}}});
  entry.channel=channel;
  channel.on('broadcast',{event:'ack'},({payload}:{payload:AckPayload})=>{const key=String(payload?.dedupe_key||'');const resolve=acks.get(key);if(resolve){acks.delete(key);resolve(payload);}});
  channel.on('broadcast',{event:'frame'},({payload}:{payload:FramePayload})=>{void applyFrame(entry,payload);});
  channel.subscribe((status:string)=>{if(status==='SUBSCRIBED'){entry.subscribed=true;resolveReady(true);}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){entry.subscribed=false;resolveReady(false);}});
  entries.set(sessionId,entry);
  return entry;
 };

 const sendFast=async(body:Record<string,unknown>)=>{
  const sessionId=String(body.session_id||''),leaseId=String(body.lease_id||''),commandType=String(body.command_type||''),ciphertext=String(body.payload_ciphertext||''),iv=String(body.payload_iv||''),companyId=String(body.company_id||'fenix');
  if(!sessionId||!leaseId||!commandType||!ciphertext||!iv)return null;
  activeSessionId=sessionId;
  const entry=ensureChannel(sessionId,companyId);
  const ready=entry.subscribed||await Promise.race([entry.ready,new Promise<boolean>(resolve=>window.setTimeout(()=>resolve(false),220))]);
  if(!ready)return null;
  const dedupeKey=await sha256(`${commandType}|${ciphertext}|${iv}`);
  const ackPromise=new Promise<AckPayload|null>(resolve=>{
   entry.acks.set(dedupeKey,resolve);
   window.setTimeout(()=>{if(entry.acks.delete(dedupeKey))resolve(null);},ACK_TIMEOUT_MS);
  });
  const sent=await entry.channel.send({type:'broadcast',event:'input',payload:{session_id:sessionId,lease_id:leaseId,command_type:commandType,payload_ciphertext:ciphertext,payload_iv:iv,dedupe_key:dedupeKey}}).catch(()=>null);
  if(sent!=='ok'){entry.acks.delete(dedupeKey);return null;}
  return await ackPromise;
 };

 window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=urlOf(input);
  const body=parseBody(init);
  if(url.includes(GATEWAY_STATUS)&&body?.session_id)activeSessionId=String(body.session_id);
  if(!url.includes(OWNER_INPUT)||String(init?.method||'GET').toUpperCase()!=='POST'||!body)return nativeFetch(input,init);
  const durable=nativeFetch(input,init);
  const ack=await sendFast(body).catch(()=>null);
  if(ack?.ok===true){void durable.catch(()=>{});return new Response(JSON.stringify({ok:true,realtime:true}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
  return durable;
 }) as typeof window.fetch;

 window.addEventListener('beforeunload',()=>{for(const entry of entries.values()){if(entry.frameUrl)URL.revokeObjectURL(entry.frameUrl);void supabase.removeChannel(entry.channel);}entries.clear();},{once:true});
}

install();
