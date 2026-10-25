import {encryptBrowserInput,fetchBrowserInteractiveApi,importBrowserSessionKey,type BrowserCompanyV3,type BrowserSessionV3} from './cerebroBrowserInteractive';

type CompaniesResponse={ok:boolean;companies:BrowserCompanyV3[];error?:string};
type StatusResponse={ok:boolean;session:BrowserSessionV3|null;error?:string};
type KeyResponse={ok:boolean;key_b64?:string;error?:string};
type ActionResponse={ok:boolean;error?:string};

const KEY_BATCH_MS=55;
const MAX_CHUNK=96;
const FAST_VIEWER_POLL_MS=300;
const nativeSetInterval=window.setInterval.bind(window);

if(window.location.pathname==='/cerebro'&&new URLSearchParams(window.location.search).get('section')==='browser'){
  window.setInterval=((handler:TimerHandler,timeout?:number,...args:any[])=>{
    const next=timeout===900?FAST_VIEWER_POLL_MS:timeout;
    return nativeSetInterval(handler,next,...args);
  }) as typeof window.setInterval;
}

let companyId='';
let sessionId='';
let sessionKey:CryptoKey|null=null;
let keySessionId='';
let buffer='';
let timer:number|undefined;
let queue:Promise<void>=Promise.resolve();

async function resolveCompany(){
  if(companyId)return companyId;
  const r=await fetchBrowserInteractiveApi<CompaniesResponse>('/owner/companies',{});
  const companies=Array.isArray(r.data?.companies)?r.data!.companies:[];
  const selected=companies.find(item=>item.prod_authorized)||companies[0];
  if(r.status!==200||!r.data?.ok||!selected)throw new Error(r.data?.error||'BROWSER_COMPANY_NOT_AVAILABLE');
  companyId=selected.company_id;
  return companyId;
}

async function resolveHumanSession(){
  const company=await resolveCompany();
  const r=await fetchBrowserInteractiveApi<StatusResponse>('/owner/status',{company_id:company});
  const session=r.data?.session;
  if(r.status!==200||!r.data?.ok||!session)throw new Error(r.data?.error||'BROWSER_SESSION_NOT_AVAILABLE');
  if(session.state!=='HUMAN_CONTROLLED'||session.control_owner!=='HUMAN'||!session.worker_alive||!session.human_lease_id)throw new Error('BROWSER_HUMAN_CONTROL_NOT_ACTIVE');
  if(sessionId!==session.session_id){sessionId=session.session_id;sessionKey=null;keySessionId='';}
  return session;
}

async function resolveKey(session:BrowserSessionV3){
  if(sessionKey&&keySessionId===session.session_id)return sessionKey;
  const r=await fetchBrowserInteractiveApi<KeyResponse>('/owner/key',{company_id:session.company_id,session_id:session.session_id});
  if(r.status!==200||!r.data?.ok||!r.data.key_b64)throw new Error(r.data?.error||'BROWSER_KEY_NOT_AVAILABLE');
  sessionKey=await importBrowserSessionKey(r.data.key_b64);
  keySessionId=session.session_id;
  return sessionKey;
}

async function send(commandType:string,payload:Record<string,unknown>){
  const session=await resolveHumanSession();
  const key=await resolveKey(session);
  const encrypted=await encryptBrowserInput(key,payload);
  const r=await fetchBrowserInteractiveApi<ActionResponse>('/owner/input',{
    company_id:session.company_id,
    session_id:session.session_id,
    lease_id:session.human_lease_id,
    command_type:commandType,
    ...encrypted
  });
  if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'BROWSER_FAST_INPUT_REJECTED');
}

function enqueue(commandType:string,payload:Record<string,unknown>){
  queue=queue.then(()=>send(commandType,payload)).catch(()=>undefined);
  return queue;
}

function flush(){
  if(timer!==undefined){window.clearTimeout(timer);timer=undefined;}
  const value=buffer;
  buffer='';
  if(value)void enqueue('KEYBOARD_TYPE',{value});
}

function scheduleFlush(){
  if(timer!==undefined)window.clearTimeout(timer);
  timer=window.setTimeout(flush,KEY_BATCH_MS);
}

const PASSTHROUGH_KEYS=new Set(['Shift','Control','Alt','Meta','CapsLock']);

document.addEventListener('keydown',event=>{
  const target=event.target;
  if(!(target instanceof Element)||!target.closest('.cerebro-browser-viewport'))return;
  if(target.closest('[data-browser-native-input]'))return;
  if(event.isComposing||PASSTHROUGH_KEYS.has(event.key))return;

  const printable=event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey;
  if(printable){
    event.preventDefault();
    event.stopImmediatePropagation();
    buffer+=event.key;
    if(buffer.length>=MAX_CHUNK)flush(); else scheduleFlush();
    return;
  }

  if(buffer)flush();
  event.preventDefault();
  event.stopImmediatePropagation();
  void enqueue('KEYBOARD_PRESS',{key:event.key});
},true);

window.addEventListener('blur',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
