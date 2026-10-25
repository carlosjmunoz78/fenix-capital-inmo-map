import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

type WorkProfile={
 identity_id:string;account_id:string;provider:string;display_label:string;browser_profile_id:string;
 state:string;verification_state:string;verified_account_hint:string|null;last_used_at?:string|null;
 active_session?:{session_id:string;state:string;worker_alive:boolean;human_required?:unknown}|null;
 login_policy:string;has_session_bundle:boolean;secret_material_exposed:boolean;
};
type ProfilesResponse={ok:boolean;company_id?:string;profiles?:WorkProfile[];error?:string};
type ActionResponse={ok:boolean;error?:string;state?:string;verification_state?:string;account_hint?:string;session?:{session_id:string};active_session?:{session_id:string;state:string};target_browser_profile_id?:string};

const ENVIRONMENT=IS_PRODUCTION?'PROD':'PREPROD';
const OWNER=IS_PRODUCTION?'cerebro-browser-work-total-owner-v1-prod':'cerebro-browser-work-total-owner-v1-preprod';
const IDEMPOTENCY_PREFIX=IS_PRODUCTION?'browser-work-total-v1-prod-ui-':'browser-work-total-v1-ui-';
const ROOT_ID='cerebro-browser-work-total-profile-dock';
const STYLE_ID='cerebro-browser-work-total-profile-style';
const TERMINAL=new Set(['HIBERNATED','STOPPED','ERROR','CLOSED']);
let profiles:WorkProfile[]=[];
let selectedKey='';
let busy=false;
let error='';
let info='';
let mounted=false;
let interval=0;
let company='fenix';

function keyOf(profile:WorkProfile){return`${profile.identity_id}|${profile.account_id}`;}
function escapeHtml(value:unknown){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]||ch));}
function short(value:string){return value.length>20?`${value.slice(0,8)}…${value.slice(-5)}`:value;}
function selected(){return profiles.find(profile=>keyOf(profile)===selectedKey)||profiles[0]||null;}
function active(){return profiles.find(profile=>profile.active_session&&!TERMINAL.has(profile.active_session.state))||null;}
function currentCompany(){
 const select=document.querySelector<HTMLSelectElement>('.cerebro-browser-console select[aria-label="Seleccionar empresa"]');
 if(select?.value)return select.value;
 const first=document.querySelector<HTMLElement>('.cerebro-browser-console .cerebro-browser-session-context span strong');
 const text=first?.textContent?.trim().toLowerCase();
 return text&&/^[a-z0-9._:-]+$/.test(text)?text:'fenix';
}
async function api<T extends {ok:boolean;error?:string}>(route:string,body:Record<string,unknown>):Promise<T>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw new Error(`${ENVIRONMENT}_AUTH_REQUIRED`);
 const response=await fetch(`${SUPABASE_URL}/functions/v1/${OWNER}/${route}`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>null) as T|null;
 if(!response.ok||!data?.ok)throw new Error(data?.error||`WORK_TOTAL_${route.toUpperCase()}_${response.status}`);
 return data;
}
function installStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
 #${ROOT_ID}{width:100%;display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(150px,.8fr) auto;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(77,184,255,.12);background:linear-gradient(90deg,rgba(3,19,28,.96),rgba(7,27,38,.94));color:#cbe5ef}
 #${ROOT_ID} .wt-main{display:flex;align-items:center;gap:8px;min-width:0}
 #${ROOT_ID} .wt-badge{flex:none;padding:5px 7px;border:1px solid rgba(76,227,162,.25);border-radius:8px;background:rgba(20,105,77,.12);color:#95efc7;font-size:7px;font-weight:900;letter-spacing:.1em}
 #${ROOT_ID} select{width:100%;min-width:0;border:1px solid rgba(77,184,255,.16);border-radius:8px;background:#071821;color:#d8edf5;padding:7px 8px;font-size:9px;font-weight:700;outline:none}
 #${ROOT_ID} .wt-state{min-width:0;display:flex;flex-direction:column;gap:2px;font-size:8px;color:#779ca9}
 #${ROOT_ID} .wt-state strong{color:#cae6ef;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #${ROOT_ID} .wt-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
 #${ROOT_ID} button{border:1px solid rgba(77,184,255,.18);border-radius:8px;background:rgba(8,34,46,.9);color:#cbe5ef;padding:7px 9px;font-size:8px;font-weight:900;cursor:pointer}
 #${ROOT_ID} button:hover:not(:disabled){border-color:rgba(77,184,255,.42);background:rgba(11,48,65,.96)}
 #${ROOT_ID} button[data-kind="primary"]{border-color:rgba(76,227,162,.3);color:#a8f4d2;background:rgba(28,111,81,.13)}
 #${ROOT_ID} button[data-kind="danger"]{border-color:rgba(255,106,66,.25);color:#ffb09c;background:rgba(112,40,24,.12)}
 #${ROOT_ID} button:disabled{opacity:.38;cursor:not-allowed}
 #${ROOT_ID} .wt-message{grid-column:1/-1;font-size:8px;color:#91b4c0;min-height:10px}
 #${ROOT_ID} .wt-message.is-error{color:#ff9b80}
 @media(max-width:900px){#${ROOT_ID}{grid-template-columns:1fr;gap:6px}#${ROOT_ID} .wt-actions{justify-content:flex-start}#${ROOT_ID} .wt-message{grid-column:1}}
 `;document.head.appendChild(style);
}
function render(){
 const root=document.getElementById(ROOT_ID);if(!root)return;
 const profile=selected();const current=active();const pending=profile?.verification_state==='PENDING_CONFIRMATION';
 root.innerHTML=`
  <div class="wt-main"><span class="wt-badge">WORK TOTAL · ${ENVIRONMENT}</span><select aria-label="Perfil Work Total" ${busy?'disabled':''}>${profiles.length?profiles.map(p=>`<option value="${escapeHtml(keyOf(p))}" ${keyOf(p)===selectedKey?'selected':''}>${escapeHtml(p.display_label)} · ${escapeHtml(p.state)}</option>`).join(''):'<option value="">Sin perfiles autorizados</option>'}</select></div>
  <div class="wt-state"><span>PERFIL / IDENTIDAD</span><strong>${profile?`${escapeHtml(profile.provider.toUpperCase())} · ${escapeHtml(profile.verification_state)}${profile.verified_account_hint?` · ${escapeHtml(profile.verified_account_hint)}`:''}`:'Esperando catálogo'}</strong><span>${current?.active_session?`Activa ${escapeHtml(short(current.active_session.session_id))} · ${escapeHtml(current.active_session.state)}`:profile?.has_session_bundle?'Sesión dormida disponible':'Sin sesión persistida'}</span></div>
  <div class="wt-actions">
   <button type="button" data-action="open" data-kind="primary" ${busy||!profile?'disabled':''}>${profile?.has_session_bundle?'Reanudar':'Abrir'}</button>
   <button type="button" data-action="sleep" ${busy||!current?.active_session?'disabled':''}>Dormir</button>
   <button type="button" data-action="confirm" data-kind="primary" ${busy||!pending?'disabled':''}>Confirmar cuenta</button>
   <button type="button" data-action="forget" data-kind="danger" ${busy||!profile?.has_session_bundle||Boolean(profile?.active_session)?'disabled':''}>Olvidar sesión</button>
   <button type="button" data-action="refresh" ${busy?'disabled':''}>Actualizar</button>
  </div>
  <div class="wt-message ${error?'is-error':''}">${escapeHtml(error||info||`Perfiles aislados · sesión cifrada · 0 € adicional · ${ENVIRONMENT} gobernado`)}</div>`;
 const select=root.querySelector<HTMLSelectElement>('select[aria-label="Perfil Work Total"]');
 select?.addEventListener('change',()=>{selectedKey=select.value;error='';info='';render();});
 root.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(button=>button.addEventListener('click',()=>{void act(button.dataset.action||'');}));
}
async function refresh(){
 const nextCompany=currentCompany();if(nextCompany!==company){company=nextCompany;selectedKey='';}
 try{const data=await api<ProfilesResponse>('profiles',{company_id:company});profiles=Array.isArray(data.profiles)?data.profiles:[];if(!selectedKey||!profiles.some(p=>keyOf(p)===selectedKey))selectedKey=profiles[0]?keyOf(profiles[0]):'';error='';}catch(cause){error=String((cause as Error)?.message||cause);profiles=[];}render();
}
async function waitForSleep(sessionId:string){
 for(let attempt=0;attempt<40;attempt++){await new Promise(resolve=>window.setTimeout(resolve,400));const data=await api<ProfilesResponse>('profiles',{company_id:company});profiles=Array.isArray(data.profiles)?data.profiles:[];const still=profiles.some(p=>p.active_session?.session_id===sessionId&&!TERMINAL.has(p.active_session.state));if(!still){render();return;}}
 throw new Error('WORK_TOTAL_HIBERNATE_TIMEOUT');
}
async function act(action:string){
 if(busy)return;const profile=selected();if(!profile&&action!=='refresh')return;busy=true;error='';info='';render();
 try{
  if(action==='refresh'){await refresh();return;}
  if(action==='sleep'){
   const current=active();if(!current?.active_session)throw new Error('NO_ACTIVE_WORKSPACE');
   await api<ActionResponse>('hibernate',{company_id:company,session_id:current.active_session.session_id});info='Guardando workspace y liberando worker…';render();await waitForSleep(current.active_session.session_id);info='Workspace dormido y cifrado.';
  }else if(action==='open'){
   const current=active();
   if(current?.active_session&&current.browser_profile_id!==profile!.browser_profile_id){await api<ActionResponse>('hibernate',{company_id:company,session_id:current.active_session.session_id,target_browser_profile_id:profile!.browser_profile_id});info=`Durmiendo ${current.display_label}…`;render();await waitForSleep(current.active_session.session_id);}
   const start=await api<ActionResponse>('start',{company_id:company,identity_id:profile!.identity_id,account_id:profile!.account_id,idempotency_key:`${IDEMPOTENCY_PREFIX}${crypto.randomUUID()}`});const id=start.session?.session_id||start.active_session?.session_id;if(id)window.dispatchEvent(new CustomEvent('cerebro:browser-session-selected',{detail:id}));info=start.session?.session_id?`Workspace iniciado ${short(start.session.session_id)}.`:'Workspace reanudado.';
  }else if(action==='confirm'){
   const result=await api<ActionResponse>('confirm-account',{company_id:company,identity_id:profile!.identity_id,account_id:profile!.account_id});info=`Cuenta confirmada${result.account_hint?` · ${result.account_hint}`:''}.`;
  }else if(action==='forget'){
   await api<ActionResponse>('forget-session',{company_id:company,identity_id:profile!.identity_id,account_id:profile!.account_id});info='Sesión persistida revocada; identidad esperada preservada.';
  }
 }catch(cause){error=String((cause as Error)?.message||cause);}finally{busy=false;await refresh();render();}
}
function mount(){
 if(typeof document==='undefined')return;
 installStyle();const sessionbar=document.querySelector<HTMLElement>('.cerebro-browser-console .cerebro-browser-sessionbar');
 if(!sessionbar){mounted=false;return;}
 let root=document.getElementById(ROOT_ID);if(!root){root=document.createElement('div');root.id=ROOT_ID;root.setAttribute('aria-label',`Perfiles Work Total ${ENVIRONMENT}`);sessionbar.appendChild(root);}mounted=true;render();void refresh();
}
function install(){
 if(typeof document==='undefined'||typeof window==='undefined')return;
 const observer=new MutationObserver(()=>{if(!mounted||!document.getElementById(ROOT_ID))mount();});observer.observe(document.body,{childList:true,subtree:true});
 mount();interval=window.setInterval(()=>{if(document.getElementById(ROOT_ID))void refresh();else mount();},2500);
 window.addEventListener('beforeunload',()=>{window.clearInterval(interval);observer.disconnect();},{once:true});
}
install();
