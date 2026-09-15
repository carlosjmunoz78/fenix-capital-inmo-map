import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Maximize2,MessageCircle,Minimize2,RefreshCw,Send,X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {gatewayRpc} from './appRpcCompat';

const SIZE='46px';
const RIGHT='20px';
const ORANGE='#ff5a1f';
const CHAT_EVENT='fenix:internal-chat-toggle';

type ChatMessage={message_code:string;sender_actor_code:string;sender_name:string;sender_role:string;body:string;created_at:string};
type ChatPayload={ok?:boolean;status?:number;items?:ChatMessage[];item?:ChatMessage;error?:string};

const miniCss=`
.fenix-mini-chat{position:fixed;right:20px;bottom:78px;width:min(390px,calc(100vw - 28px));height:min(560px,calc(100vh - 118px));z-index:2147483000;border:1px solid var(--border,#e5e7eb);border-radius:20px;background:var(--surface,#fff);color:var(--text,#111827);box-shadow:0 24px 70px rgba(15,23,42,.26);display:flex;flex-direction:column;overflow:hidden}.fenix-mini-chat[data-minimized='true']{height:auto}.fenix-mini-chat-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;border-bottom:1px solid var(--border,#e5e7eb);background:var(--surface,#fff)}.fenix-mini-chat-title{display:flex;align-items:center;gap:9px;min-width:0}.fenix-mini-chat-title>span{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:rgba(255,90,31,.12);color:#ff5a1f}.fenix-mini-chat-title strong{display:block;font-size:13px}.fenix-mini-chat-title small{display:block;color:var(--muted,#667085);font-size:10px;margin-top:2px}.fenix-mini-chat-actions{display:flex;align-items:center;gap:3px}.fenix-mini-chat-actions button{width:31px;height:31px;border:0;border-radius:9px;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer}.fenix-mini-chat-actions button:hover{background:rgba(127,127,127,.1)}.fenix-mini-chat-body{display:flex;flex:1;min-height:0;flex-direction:column}.fenix-mini-chat-stream{flex:1;min-height:0;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:9px;background:var(--bg,#f7f7f8)}.fenix-mini-chat-empty{margin:auto;text-align:center;color:var(--muted,#667085);font-size:12px;max-width:240px}.fenix-mini-msg{align-self:flex-start;max-width:86%;border:1px solid var(--border,#e5e7eb);border-radius:15px 15px 15px 5px;background:var(--surface,#fff);padding:9px 10px;box-shadow:0 2px 7px rgba(15,23,42,.04)}.fenix-mini-msg header{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px}.fenix-mini-msg strong{font-size:10.5px;color:#ff5a1f}.fenix-mini-msg time{font-size:9px;color:var(--muted,#667085)}.fenix-mini-msg p{margin:0;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.38}.fenix-mini-chat-notice{padding:7px 12px;background:rgba(255,90,31,.08);color:#c44216;font-size:10.5px}.fenix-mini-chat-compose{border-top:1px solid var(--border,#e5e7eb);padding:10px;background:var(--surface,#fff);display:grid;gap:7px}.fenix-mini-chat-compose textarea{width:100%;min-height:62px;max-height:120px;resize:vertical;box-sizing:border-box;border:1px solid var(--border,#d0d5dd);border-radius:12px;padding:9px 10px;background:var(--surface,#fff);color:inherit;font:inherit;font-size:12px}.fenix-mini-chat-compose footer{display:flex;justify-content:space-between;align-items:center;gap:8px}.fenix-mini-chat-compose footer small{color:var(--muted,#667085);font-size:9.5px}.fenix-mini-chat-compose button{border:0;border-radius:10px;background:#ff5a1f;color:white;padding:8px 11px;font-weight:800;font-size:11px;display:flex;align-items:center;gap:6px;cursor:pointer}.fenix-mini-chat-compose button:disabled{opacity:.45;cursor:not-allowed}html[data-theme='dark'] .fenix-mini-chat,html[data-theme='dark'] .fenix-mini-chat-head,html[data-theme='dark'] .fenix-mini-chat-compose,html[data-theme='dark'] .fenix-mini-msg,html[data-theme='dark'] .fenix-mini-chat-compose textarea{background:#202023;border-color:#39393e;color:#f4f4f5}html[data-theme='dark'] .fenix-mini-chat-stream{background:#171719}@media(max-width:600px){.fenix-mini-chat{right:10px;bottom:76px;width:calc(100vw - 20px);height:min(72vh,580px);border-radius:18px}}
`;

function cleanMessages(raw:unknown):ChatMessage[]{
 if(!raw||typeof raw!=='object')return[];
 const items=(raw as ChatPayload).items;
 if(!Array.isArray(items))return[];
 return items.filter((m):m is ChatMessage=>Boolean(m&&typeof m.message_code==='string'&&typeof m.body==='string'));
}
function timeLabel(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit'}).format(d);}

function styleLauncher(el:HTMLElement,bottom:string){
  el.style.position='fixed';
  el.style.setProperty('right',RIGHT,'important');
  el.style.setProperty('bottom',bottom,'important');
  el.style.width=SIZE;
  el.style.height=SIZE;
  el.style.minWidth=SIZE;
  el.style.minHeight=SIZE;
  el.style.border='0';
  el.style.borderRadius='50%';
  el.style.background=ORANGE;
  el.style.color='#fff';
  el.style.boxShadow='0 10px 28px rgba(20,27,38,.2)';
  el.style.padding='0';
  el.style.display='grid';
  el.style.placeItems='center';
  el.style.zIndex='2147482000';
  el.style.setProperty('transform','none','important');
}

function removeLauncherText(el:HTMLElement){
  el.classList.add('fenix-calculator-launcher-restored');
  for(const node of Array.from(el.childNodes))if(node.nodeType===Node.TEXT_NODE)node.textContent='';
  if(el.getAttribute('aria-label')!=='Calculadora Hipotecaria')el.setAttribute('aria-label','Calculadora Hipotecaria');
  if(el.getAttribute('title')!=='Calculadora')el.setAttribute('title','Calculadora');
  styleLauncher(el,'76px');
}

function ensureChatLauncher(){
  const calc=document.querySelector<HTMLElement>('.calc-launcher:not(.fenix-chat-launcher-restored)');
  if(!calc||document.querySelector('.fenix-chat-launcher-restored'))return;
  const button=document.createElement('button');
  button.type='button';
  button.className='fenix-chat-launcher-restored';
  button.setAttribute('aria-label','Abrir chat interno');
  button.setAttribute('title','Chat interno');
  button.textContent='💬';
  button.style.fontSize='20px';
  button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent(CHAT_EVENT)));
  document.body.appendChild(button);
  styleLauncher(button,'22px');
}

function normalize(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('[aria-label="Calculadora Hipotecaria PRO"]').forEach(el=>{
    if(el.getAttribute('aria-label')!=='Calculadora Hipotecaria')el.setAttribute('aria-label','Calculadora Hipotecaria');
  });
  root.querySelectorAll<HTMLElement>('.calc-panel>header>div:first-child>strong').forEach(el=>{
    for(const node of Array.from(el.childNodes))if(node.nodeType===Node.TEXT_NODE&&node.textContent?.includes('PRO'))node.textContent=node.textContent.replace(/\s*PRO\b/g,'');
  });
  root.querySelectorAll<HTMLElement>('.calc-launcher:not(.fenix-chat-launcher-restored)').forEach(removeLauncherText);
  root.querySelectorAll<HTMLElement>('.fenix-chat-launcher-restored').forEach(el=>styleLauncher(el,'22px'));
  ensureChatLauncher();
}

export default function CalculatorLabelGuard(){
  const navigate=useNavigate();
  const[open,setOpen]=useState(false),[minimized,setMinimized]=useState(false),[messages,setMessages]=useState<ChatMessage[]>([]),[draft,setDraft]=useState(''),[loading,setLoading]=useState(false),[sending,setSending]=useState(false),[notice,setNotice]=useState('');
  const endRef=useRef<HTMLDivElement|null>(null);

  async function load(silent=false){
    if(!silent)setLoading(true);
    try{const{data,error}=await gatewayRpc<ChatPayload>('fenix_prod_chat_list_user',{p_limit:40});if(error){setNotice('No se pudo cargar el chat interno.');return;}const payload=data as ChatPayload|null;if(payload?.status===403){setNotice('Tu perfil no tiene acceso al chat interno.');setMessages([]);return;}setMessages(cleanMessages(payload));setNotice('');}catch{setNotice('No se pudo conectar con el chat interno.');}finally{if(!silent)setLoading(false);}
  }

  async function submit(e:FormEvent){
    e.preventDefault();const body=draft.trim();if(!body||sending)return;if(body.length>4000){setNotice('El mensaje supera el máximo de 4.000 caracteres.');return;}setSending(true);setNotice('');
    try{const{data,error}=await gatewayRpc<ChatPayload>('fenix_prod_chat_send_user',{p_body:body,p_idempotency_key:`chat-${crypto.randomUUID()}`});const payload=data as ChatPayload|null;if(error||payload?.status!==200||!payload?.item){setNotice(payload?.status===403?'Tu perfil no puede escribir en este chat.':'No se pudo guardar el mensaje.');return;}setDraft('');await load(true);}catch{setNotice('No se pudo enviar el mensaje.');}finally{setSending(false);}
  }

  useEffect(()=>{
    normalize();
    const observer=new MutationObserver(records=>{for(const record of records)for(const node of Array.from(record.addedNodes))if(node instanceof HTMLElement)normalize(node);normalize();});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});
    const toggle=()=>setOpen(v=>{const next=!v;if(next){setMinimized(false);void load();}return next;});
    window.addEventListener(CHAT_EVENT,toggle);
    return()=>{observer.disconnect();window.removeEventListener(CHAT_EVENT,toggle);document.querySelector('.fenix-chat-launcher-restored')?.remove();};
  },[]);
  useEffect(()=>{if(!open||minimized)return;const timer=window.setInterval(()=>void load(true),15000);return()=>window.clearInterval(timer);},[open,minimized]);
  useEffect(()=>{if(open&&!minimized&&messages.length)endRef.current?.scrollIntoView({behavior:'smooth',block:'end'});},[open,minimized,messages.length]);

  const count=useMemo(()=>messages.length,[messages.length]);
  const panel=open?createPortal(<><style>{miniCss}</style><aside className="fenix-mini-chat" data-testid="internal-chat-mini" data-minimized={minimized?'true':'false'} aria-label="Chat interno flotante"><header className="fenix-mini-chat-head"><div className="fenix-mini-chat-title"><span><MessageCircle size={18}/></span><div><strong>Chat interno</strong><small>{loading?'Actualizando…':`${count} mensajes cargados`}</small></div></div><div className="fenix-mini-chat-actions"><button type="button" title="Actualizar" aria-label="Actualizar chat" onClick={()=>void load()}><RefreshCw size={15}/></button><button type="button" title={minimized?'Restaurar':'Minimizar'} aria-label={minimized?'Restaurar chat':'Minimizar chat'} onClick={()=>setMinimized(v=>!v)}>{minimized?<MessageCircle size={15}/>:<Minimize2 size={15}/>}</button><button type="button" title="Ampliar" aria-label="Ampliar chat" onClick={()=>{setOpen(false);navigate('/chat')}}><Maximize2 size={15}/></button><button type="button" title="Cerrar" aria-label="Cerrar chat" onClick={()=>setOpen(false)}><X size={16}/></button></div></header>{!minimized&&<div className="fenix-mini-chat-body"><div className="fenix-mini-chat-stream">{loading&&messages.length===0&&<div className="fenix-mini-chat-empty">Cargando conversación…</div>}{!loading&&messages.length===0&&!notice&&<div className="fenix-mini-chat-empty">Aún no hay mensajes en el chat interno.</div>}{messages.map(m=><article className="fenix-mini-msg" key={m.message_code}><header><strong>{m.sender_name||m.sender_actor_code}</strong><time>{timeLabel(m.created_at)}</time></header><p>{m.body}</p></article>)}<div ref={endRef}/></div>{notice&&<div className="fenix-mini-chat-notice" role="status">{notice}</div>}<form className="fenix-mini-chat-compose" onSubmit={submit}><textarea aria-label="Mensaje interno flotante" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={4000} placeholder="Escribe un mensaje…"/><footer><small>{draft.length}/4000</small><button type="submit" disabled={!draft.trim()||sending}><Send size={14}/>{sending?'Enviando…':'Enviar'}</button></footer></form></div>}</aside></>,document.body):null;
  return panel;
}
