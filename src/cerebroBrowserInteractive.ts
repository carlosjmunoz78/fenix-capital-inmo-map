import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

export type BrowserSessionV3={
 session_id:string;job_id:string;company_id:string;department_id:string;environment:string;version:string;
 state:string;control_owner:'CEREBRO'|'HUMAN'|'NONE';worker_alive:boolean;emergency_stop:boolean;
 current_url:string|null;current_title:string|null;tabs:Array<{index?:number;url?:string;active?:boolean;title?:string}>;active_tab_index:number|null;
 viewport_width:number|null;viewport_height:number|null;frame_ciphertext:string|null;frame_iv:string|null;frame_seq:number;frame_mime:string|null;frame_captured_at:string|null;
 human_lease_id:string|null;human_lease_expires_at:string|null;human_required:unknown;last_heartbeat_at:string|null;opened_at:string;expires_at:string;closed_at:string|null;updated_at:string;
};

type ApiResult<T>=Promise<{status:number;data:T|null}>;
const BROWSER_GATEWAY='cerebro-console-browser-gateway-v1';
const BROWSER_SCOPE=Object.freeze({company_id:'fenix',engine_id:'CONSOLE-001',environment:'PROD',version:'v3'});

export async function fetchBrowserInteractiveApi<T>(path:string,body:Record<string,unknown>={}):ApiResult<T>{
 const {data:{session}}=await supabase.auth.getSession();
 const token=session?.access_token;if(!token)return{status:401,data:null};
 const route=String(path||'').replace(/^\/+/, '');
 try{
  const response=await fetch(`${SUPABASE_URL}/functions/v1/${BROWSER_GATEWAY}/${route}`,{
   method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({...body,...BROWSER_SCOPE}),cache:'no-store'
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
