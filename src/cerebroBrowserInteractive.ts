import './cerebroBrowserWorkTotalDock';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

export type BrowserSessionV3={
 session_id:string;job_id:string;company_id:string;department_id:string;environment:string;version:string;
 state:string;control_owner:'CEREBRO'|'HUMAN'|'NONE';worker_alive:boolean;emergency_stop:boolean;
 current_url:string|null;current_title:string|null;tabs:Array<{index?:number;url?:string;active?:boolean;title?:string}>;active_tab_index:number|null;
 viewport_width:number|null;viewport_height:number|null;frame_ciphertext:string|null;frame_iv:string|null;frame_seq:number;frame_mime:string|null;frame_captured_at:string|null;
 human_lease_id:string|null;human_lease_expires_at:string|null;human_required:unknown;last_heartbeat_at:string|null;opened_at:string;expires_at:string;closed_at:string|null;updated_at:string;
};

export type BrowserCompanyV3={company_id:string;environment:string;version:string;state:string;tenant_boundary:string;prod_authorized:boolean;prod_write_authorized:boolean;trading_access:boolean;additional_cost_eur:number|string};
type ApiResult<T>=Promise<{status:number;data:T|null}>;
const BROWSER_GATEWAY='cerebro-browser-gateway-v1';
const WORKMODE_STYLE_ID='cerebro-browser-workmode-v2';
const WORKMODE_INSTALLED='cerebroBrowserWorkmodeV2';
const REALTIME_INSTALLED='cerebroBrowserRealtimeFastlaneV1';
const HUMAN_TEXT_BATCH_MS=30;
const REALTIME_ACK_TIMEOUT_MS=260;

type HumanTypingState={value:string;timer:number};
type BatchedKeyboardEvent=globalThis.KeyboardEvent&{__cerebroTypingBatch?:boolean};
type MappedMouseEvent=globalThis.MouseEvent&{__cerebroPointerMapped?:boolean};
type RealtimeAck={dedupe_key?:string;ok?:boolean;error?:string};
type RealtimeFrame={session_id?:string;frame_ciphertext?:string;frame_iv?:string;frame_mime?:string;frame_seq?:number};
type RealtimeEntry={channel:any;subscribed:boolean;ready:Promise<boolean>;acks:Map<string,(payload:RealtimeAck|null)=>void>;companyId:string;frameKey:CryptoKey|null;frameUrl:string};

function installBrowserWorkModeUx(){
 if(typeof document==='undefined'||typeof window==='undefined')return;
 const state=window as unknown as Window&Record<string,unknown>;
 if(state[WORKMODE_INSTALLED])return;
 state[WORKMODE_INSTALLED]=true;
 const typingState=new WeakMap<Element,HumanTypingState>();
 const installStyle=()=>{
  if(!document.head||document.getElementById(WORKMODE_STYLE_ID))return;
  const style=document.createElement('style');
  style.id=WORKMODE_STYLE_ID;
  style.textContent=`
   .cerebro-browser-console .cerebro-browser-viewport>img{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:fill!important}
   body.cerebro-browser-viewer-expanded{overflow:hidden!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-frame--expanded{position:fixed!important;inset:8px 8px 90px 8px!important;width:auto!important;height:auto!important;max-width:none!important;margin:0!important;z-index:9998!important;border-radius:14px!important;box-shadow:0 28px 90px rgba(0,0,0,.72),0 0 0 1px rgba(55,217,255,.18)!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-frame--expanded .cerebro-browser-viewport>img{object-fit:fill!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-composer{position:fixed!important;left:8px!important;right:8px!important;bottom:8px!important;width:auto!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;z-index:10000!important;background:transparent!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-form{height:72px!important;min-height:72px!important;border-color:rgba(55,217,255,.42)!important;background:rgba(3,16,24,.97)!important;box-shadow:0 18px 60px rgba(0,0,0,.58),0 0 0 1px rgba(55,217,255,.08)!important;backdrop-filter:blur(24px) saturate(135%)!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-form textarea{max-height:56px!important;font-size:14px!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button{width:auto!important;min-width:118px!important;padding:0 12px!important;color:#dff8ff!important;border-color:rgba(55,217,255,.34)!important;background:rgba(12,42,56,.9)!important;font-size:0!important;font-weight:900!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button::after{content:'✕  PEQUEÑO';font-size:11px!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-composer::before{content:'ORDEN A CEREBRO · ENTER ENVÍA · ESC SALE DE PANTALLA GRANDE';position:absolute;left:16px;bottom:72px;padding:5px 8px;border:1px solid rgba(55,217,255,.18);border-radius:8px 8px 0 0;background:rgba(3,16,24,.94);color:#86cfe0;font-size:9px;font-weight:900;letter-spacing:.06em;pointer-events:none}
   @media(max-width:900px){body.cerebro-browser-viewer-expanded .cerebro-browser-frame--expanded{inset:4px 4px 82px 4px!important}body.cerebro-browser-viewer-expanded .cerebro-browser-composer{left:4px!important;right:4px!important;bottom:4px!important}body.cerebro-browser-viewer-expanded .cerebro-browser-form{height:68px!important;min-height:68px!important}body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button{min-width:46px!important;padding:0 9px!important}body.cerebro-browser-viewer-expanded .cerebro-browser-expand-button::after{content:'✕';font-size:16px!important}body.cerebro-browser-viewer-expanded .cerebro-browser-composer::before{display:none}}
  `;
  document.head.appendChild(style);
 };
 const viewportForEvent=(event:Event)=>{
  const direct=event.target instanceof Element?event.target.closest('.cerebro-browser-viewport'):null;
  if(direct)return direct;
  const active=document.activeElement;
  return active instanceof Element?active.closest('.cerebro-browser-viewport'):null;
 };
 const flushTyping=(viewport:Element,typing:HumanTypingState)=>{
  if(typing.timer){window.clearTimeout(typing.timer);typing.timer=0;}
  const text=typing.value;
  typing.value='';
  if(!text)return;
  for(const key of text){
   const batched=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,composed:true}) as BatchedKeyboardEvent;
   batched.__cerebroTypingBatch=true;
   viewport.dispatchEvent(batched);
  }
 };
 const onKeyDown=(event:globalThis.KeyboardEvent)=>{
  const enriched=event as BatchedKeyboardEvent;
  if(enriched.__cerebroTypingBatch)return;
  const root=document.querySelector('.cerebro-browser-console');
  if(!root)return;
  const viewport=viewportForEvent(event);
  if(viewport){
   let typing=typingState.get(viewport);
   if(!typing){typing={value:'',timer:0};typingState.set(viewport,typing);}
   const printable=event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.isComposing;
   if(printable){
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    typing.value=`${typing.value}${event.key}`.slice(0,4000);
    if(!typing.timer)typing.timer=window.setTimeout(()=>flushTyping(viewport,typing!),HUMAN_TEXT_BATCH_MS);
    return;
   }
   if(typing.value)flushTyping(viewport,typing);
  }
  const expanded=document.body.classList.contains('cerebro-browser-viewer-expanded');
  if(event.key==='Escape'&&expanded){
   const button=root.querySelector<HTMLButtonElement>('[data-cerebro-viewer-expand]');
   if(button){event.preventDefault();event.stopPropagation();button.click();}
   return;
  }
  const target=event.target;
  const typingTarget=target instanceof HTMLTextAreaElement||target instanceof HTMLInputElement||(target instanceof HTMLElement&&target.isContentEditable);
  if(event.key==='/'&&!typingTarget){
   const composer=root.querySelector<HTMLTextAreaElement>('.cerebro-browser-form textarea');
   if(composer&&!composer.disabled){event.preventDefault();composer.focus();}
  }
 };
 const remapPointer=(event:globalThis.MouseEvent)=>{
  const enriched=event as MappedMouseEvent;
  if(enriched.__cerebroPointerMapped)return;
  const image=event.target instanceof Element?event.target.closest('.cerebro-browser-viewport>img'):null;
  if(!(image instanceof HTMLImageElement))return;
  const rect=image.getBoundingClientRect();
  const naturalWidth=image.naturalWidth;
  const naturalHeight=image.naturalHeight;
  if(!rect.width||!rect.height||!naturalWidth||!naturalHeight)return;
  const scale=Math.min(rect.width/naturalWidth,rect.height/naturalHeight);
  const containLeft=rect.left+(rect.width-naturalWidth*scale)/2;
  const containTop=rect.top+(rect.height-naturalHeight*scale)/2;
  const remoteX=((event.clientX-rect.left)/rect.width)*naturalWidth;
  const remoteY=((event.clientY-rect.top)/rect.height)*naturalHeight;
  const mappedX=containLeft+remoteX*scale;
  const mappedY=containTop+remoteY*scale;
  if(Math.abs(mappedX-event.clientX)<.25&&Math.abs(mappedY-event.clientY)<.25)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const mapped=new MouseEvent(event.type,{bubbles:true,cancelable:true,composed:true,view:window,detail:event.detail,screenX:event.screenX,screenY:event.screenY,clientX:mappedX,clientY:mappedY,ctrlKey:event.ctrlKey,shiftKey:event.shiftKey,altKey:event.altKey,metaKey:event.metaKey,button:event.button,buttons:event.buttons,relatedTarget:event.relatedTarget}) as MappedMouseEvent;
  mapped.__cerebroPointerMapped=true;
  image.dispatchEvent(mapped);
 };
 const onPaste=(event:ClipboardEvent)=>{
  const viewport=viewportForEvent(event);
  if(!viewport)return;
  const typing=typingState.get(viewport);
  if(typing?.value)flushTyping(viewport,typing);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installStyle,{once:true});else installStyle();
 document.addEventListener('keydown',onKeyDown,true);
 document.addEventListener('paste',onPaste,true);
 document.addEventListener('click',remapPointer,true);
 document.addEventListener('dblclick',remapPointer,true);
}
installBrowserWorkModeUx();

export async function fetchBrowserInteractiveApi<T>(path:string,body:unknown={}):ApiResult<T>{
 const {data:{session}}=await supabase.auth.getSession();
 const token=session?.access_token;if(!token)return{status:401,data:null};
 try{
  const response=await fetch(`${SUPABASE_URL}/functions/v1/${IS_PRODUCTION&&['/owner/takeover','/owner/handback','/owner/input','/owner/stop'].includes(path)?'cerebro-browser-work-total-owner-v1-prod/'+path.split('/').at(-1):BROWSER_GATEWAY+path}`,{
   method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null) as T|null;
  return{status:response.status,data};
 }catch{return{status:0,data:null}}
}

function bytesFromB64(value:string){const raw=atob(value);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}
function b64FromBytes(bytes:Uint8Array){let raw='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)raw+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(raw);}

export async function importBrowserSessionKey(keyB64:string){
 return crypto.subtle.importKey('raw',bytesFromB64(keyB64),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export async function decryptBrowserFrame(key:CryptoKey,ciphertextB64:string,ivB64:string,mime='image/png'){
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFromB64(ivB64)},key,bytesFromB64(ciphertextB64));
 return URL.createObjectURL(new Blob([plain],{type:mime||'image/png'}));
}
export async function encryptBrowserInput(key:CryptoKey,payload:Record<string,unknown>){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const plain=new TextEncoder().encode(JSON.stringify(payload));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain);
 return{payload_ciphertext:b64FromBytes(new Uint8Array(encrypted)),payload_iv:b64FromBytes(iv)};
}

function installBrowserRealtimeFastlane(){
 if(!IS_PRODUCTION||typeof window==='undefined')return;
 const state=window as unknown as Window&Record<string,unknown>;
 if(state[REALTIME_INSTALLED])return;
 state[REALTIME_INSTALLED]=true;
 const nativeFetch=window.fetch.bind(window);
 const entries=new Map<string,RealtimeEntry>();
 let activeSessionId='';
 const topic=(sessionId:string)=>`cerebro-browser-human-v1:${sessionId}`;
 const parseBody=(init?:RequestInit)=>{if(typeof init?.body!=='string')return null;try{const body=JSON.parse(init.body);return body&&typeof body==='object'?body as Record<string,unknown>:null;}catch{return null;}};
 const requestUrl=(input:RequestInfo|URL)=>typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');
 const ensureFrameKey=async(entry:RealtimeEntry,sessionId:string)=>{
  if(entry.frameKey)return entry.frameKey;
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error('REALTIME_OWNER_AUTH_REQUIRED');
  const response=await nativeFetch(`${SUPABASE_URL}/functions/v1/cerebro-browser-work-total-owner-v1-prod/key`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({company_id:entry.companyId,session_id:sessionId})});
  const data=await response.json().catch(()=>null) as {ok?:boolean;key_b64?:string}|null;
  if(!response.ok||!data?.ok||!data.key_b64)throw new Error('REALTIME_FRAME_KEY_UNAVAILABLE');
  entry.frameKey=await importBrowserSessionKey(data.key_b64);
  return entry.frameKey;
 };
 const applyFrame=async(entry:RealtimeEntry,payload:RealtimeFrame)=>{
  const sessionId=String(payload.session_id||'');
  if(!sessionId||sessionId!==activeSessionId||!payload.frame_ciphertext||!payload.frame_iv)return;
  try{
   const key=await ensureFrameKey(entry,sessionId);
   const next=await decryptBrowserFrame(key,payload.frame_ciphertext,payload.frame_iv,payload.frame_mime||'image/png');
   const image=document.querySelector<HTMLImageElement>('.cerebro-browser-console .cerebro-browser-viewport>img');
   if(!image){URL.revokeObjectURL(next);return;}
   if(entry.frameUrl)URL.revokeObjectURL(entry.frameUrl);
   entry.frameUrl=next;image.src=next;image.dataset.realtimeFrameSeq=String(payload.frame_seq??'');
  }catch{/* durable encrypted frame refresh remains fallback */}
 };
 const ensureChannel=(sessionId:string,companyId:string)=>{
  const existing=entries.get(sessionId);if(existing){existing.companyId=companyId;return existing;}
  const acks=new Map<string,(payload:RealtimeAck|null)=>void>();let resolveReady:(value:boolean)=>void=()=>{};
  const ready=new Promise<boolean>(resolve=>{resolveReady=resolve;});
  const entry:RealtimeEntry={channel:null,subscribed:false,ready,acks,companyId,frameKey:null,frameUrl:''};
  const channel=supabase.channel(topic(sessionId),{config:{broadcast:{self:false,ack:true}}});entry.channel=channel;
  channel.on('broadcast',{event:'ack'},({payload}:{payload:RealtimeAck})=>{const key=String(payload?.dedupe_key||'');const resolve=acks.get(key);if(resolve){acks.delete(key);resolve(payload);}});
  channel.on('broadcast',{event:'frame'},({payload}:{payload:RealtimeFrame})=>{void applyFrame(entry,payload);});
  channel.subscribe((status:string)=>{if(status==='SUBSCRIBED'){entry.subscribed=true;resolveReady(true);}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){entry.subscribed=false;resolveReady(false);}});
  entries.set(sessionId,entry);return entry;
 };
 const sendFast=async(body:Record<string,unknown>)=>{
  const sessionId=String(body.session_id||''),leaseId=String(body.lease_id||''),commandType=String(body.command_type||''),ciphertext=String(body.payload_ciphertext||''),iv=String(body.payload_iv||''),companyId=String(body.company_id||'fenix');
  if(!sessionId||!leaseId||!commandType||!ciphertext||!iv)return null;
  activeSessionId=sessionId;const entry=ensureChannel(sessionId,companyId);
  const ready=entry.subscribed||await Promise.race([entry.ready,new Promise<boolean>(resolve=>window.setTimeout(()=>resolve(false),220))]);if(!ready)return null;
  const dedupeKey=await digest(`${commandType}|${ciphertext}|${iv}`);
  const ackPromise=new Promise<RealtimeAck|null>(resolve=>{entry.acks.set(dedupeKey,resolve);window.setTimeout(()=>{if(entry.acks.delete(dedupeKey))resolve(null);},REALTIME_ACK_TIMEOUT_MS);});
  const sent=await entry.channel.send({type:'broadcast',event:'input',payload:{session_id:sessionId,lease_id:leaseId,command_type:commandType,payload_ciphertext:ciphertext,payload_iv:iv,dedupe_key:dedupeKey}}).catch(()=>null);
  if(sent!=='ok'){entry.acks.delete(dedupeKey);return null;}return ackPromise;
 };
 window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=requestUrl(input),body=parseBody(init);
  if(url.includes('/functions/v1/cerebro-browser-gateway-v1/owner/status')&&body?.session_id)activeSessionId=String(body.session_id);
  if(!url.includes('/functions/v1/cerebro-browser-work-total-owner-v1-prod/input')||String(init?.method||'GET').toUpperCase()!=='POST'||!body)return nativeFetch(input,init);
  const durable=nativeFetch(input,init);const ack=await sendFast(body).catch(()=>null);
  if(ack?.ok===true){void durable.catch(()=>{});return new Response(JSON.stringify({ok:true,realtime:true}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
  return durable;
 }) as typeof window.fetch;
 window.addEventListener('beforeunload',()=>{for(const entry of entries.values()){if(entry.frameUrl)URL.revokeObjectURL(entry.frameUrl);void supabase.removeChannel(entry.channel);}entries.clear();},{once:true});
}
installBrowserRealtimeFastlane();
