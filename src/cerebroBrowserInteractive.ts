import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

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

function installBrowserWorkModeUx(){
 if(typeof document==='undefined'||typeof window==='undefined')return;
 const state=window as unknown as Window&Record<string,unknown>;
 if(state[WORKMODE_INSTALLED])return;
 state[WORKMODE_INSTALLED]=true;
 const installStyle=()=>{
  if(!document.head||document.getElementById(WORKMODE_STYLE_ID))return;
  const style=document.createElement('style');
  style.id=WORKMODE_STYLE_ID;
  style.textContent=`
   body.cerebro-browser-viewer-expanded{overflow:hidden!important}
   body.cerebro-browser-viewer-expanded .cerebro-browser-frame--expanded{position:fixed!important;inset:8px 8px 90px 8px!important;width:auto!important;height:auto!important;max-width:none!important;margin:0!important;z-index:9998!important;border-radius:14px!important;box-shadow:0 28px 90px rgba(0,0,0,.72),0 0 0 1px rgba(55,217,255,.18)!important}
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
 const onKeyDown=(event:globalThis.KeyboardEvent)=>{
  const root=document.querySelector('.cerebro-browser-console');
  if(!root)return;
  const expanded=document.body.classList.contains('cerebro-browser-viewer-expanded');
  if(event.key==='Escape'&&expanded){
   const button=root.querySelector<HTMLButtonElement>('[data-cerebro-viewer-expand]');
   if(button){event.preventDefault();event.stopPropagation();button.click();}
   return;
  }
  const target=event.target;
  const typing=target instanceof HTMLTextAreaElement||target instanceof HTMLInputElement||(target instanceof HTMLElement&&target.isContentEditable);
  if(event.key==='/'&&!typing){
   const composer=root.querySelector<HTMLTextAreaElement>('.cerebro-browser-form textarea');
   if(composer&&!composer.disabled){event.preventDefault();composer.focus();}
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installStyle,{once:true});else installStyle();
 document.addEventListener('keydown',onKeyDown,true);
}
installBrowserWorkModeUx();

export async function fetchBrowserInteractiveApi<T>(path:string,body:unknown={}):ApiResult<T>{
 const {data:{session}}=await supabase.auth.getSession();
 const token=session?.access_token;if(!token)return{status:401,data:null};
 try{
  const response=await fetch(`${SUPABASE_URL}/functions/v1/${BROWSER_GATEWAY}${path}`,{
   method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null) as T|null;
  return{status:response.status,data};
 }catch{return{status:0,data:null}}
}

function bytesFromB64(value:string){const raw=atob(value);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i+=chunk)raw+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(raw);}
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
