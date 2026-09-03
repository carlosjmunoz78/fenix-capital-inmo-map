import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {MessageCircle,Moon,RefreshCw,Send,Sun} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';
import './chat-shell.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type ChatMessage={message_code:string;sender_actor_code:string;sender_name:string;sender_role:string;body:string;created_at:string};
type ChatPayload={ok?:boolean;status?:number;channel?:string;items?:ChatMessage[];item?:ChatMessage;error?:string};

const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function cleanMessages(raw:unknown):ChatMessage[]{
  if(!raw||typeof raw!=='object')return[];
  const items=(raw as ChatPayload).items;
  if(!Array.isArray(items))return[];
  return items.filter((m):m is ChatMessage=>Boolean(m&&typeof m.message_code==='string'&&typeof m.body==='string'));
}
function timeLabel(value:string){
  const d=new Date(value);if(Number.isNaN(d.getTime()))return'';
  return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);
}

export default function ChatShell(){
  const location=useLocation();
  const active=location.pathname==='/chat';
  const [ready,setReady]=useState(false),[logged,setLogged]=useState(false);
  const [theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
  const [ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]);
  const [messages,setMessages]=useState<ChatMessage[]>([]),[draft,setDraft]=useState('');
  const [loading,setLoading]=useState(false),[sending,setSending]=useState(false),[notice,setNotice]=useState('');
  const endRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{if(alive){setLogged(Boolean(s));setReady(true)}});return()=>{alive=false;subscription.unsubscribe()};},[active]);
  useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme)},[active,theme]);
  useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{try{const[c,n]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]);if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);}catch{if(alive){setCtx(null);setNav([])}}})();return()=>{alive=false};},[active,logged]);

  async function load(silent=false){
    if(!active||!logged)return;
    if(!silent)setLoading(true);
    try{
      const {data,error}=await supabase.rpc('fenix_prod_chat_list_user',{p_limit:100});
      if(error){setNotice('No se pudo cargar el chat interno.');return;}
      const payload=data as ChatPayload|null;
      if(payload?.status===403){setNotice('Tu perfil no tiene acceso al chat interno.');setMessages([]);return;}
      setMessages(cleanMessages(payload));setNotice('');
    }catch{setNotice('No se pudo conectar con el chat interno.');}
    finally{if(!silent)setLoading(false);}
  }

  useEffect(()=>{if(!active||!logged)return;void load();const timer=window.setInterval(()=>void load(true),15000);return()=>window.clearInterval(timer);},[active,logged]);
  useEffect(()=>{if(messages.length)endRef.current?.scrollIntoView({behavior:'smooth',block:'end'});},[messages.length]);

  async function submit(e:FormEvent){
    e.preventDefault();const body=draft.trim();if(!body||sending)return;
    if(body.length>4000){setNotice('El mensaje supera el máximo de 4.000 caracteres.');return;}
    setSending(true);setNotice('');
    try{
      const idempotency=`chat-${crypto.randomUUID()}`;
      const {data,error}=await supabase.rpc('fenix_prod_chat_send_user',{p_body:body,p_idempotency_key:idempotency});
      if(error){setNotice('No se pudo enviar el mensaje.');return;}
      const payload=data as ChatPayload|null;
      if(payload?.status!==200||!payload.item){setNotice(payload?.status===403?'Tu perfil no puede escribir en este chat.':'No se pudo guardar el mensaje.');return;}
      setDraft('');await load(true);
    }catch{setNotice('No se pudo enviar el mensaje.');}
    finally{setSending(false);}
  }

  const role=ctx?.role||'Usuario',actor=ctx?.actor_code||'';
  const effectiveNav=nav.length?nav:fallbackNav;
  const count=useMemo(()=>messages.length,[messages.length]);
  if(!active||!ready||!logged)return null;

  const topbar=<header className="ops-top"><div className="ops-profile"><strong>Chat interno CEREBRO</strong></div><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{role}</strong></div></div></header>;

  return <OperationalShellFrame className="chat-root" theme={theme} navigation={effectiveNav} activeRoute="/chat" anaSubtitle="Conversación interna del equipo Fénix." anaRoute="/ana" query="" onQueryChange={()=>{}} searchPlaceholder="" name={role} role="" initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={async()=>{await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL}} topbar={topbar} contentClassName="chat-content">
    <section className="chat-heading">
      <div><small>COMUNICACIÓN INTERNA</small><h1>Chat CEREBRO</h1><p>Canal persistente del equipo. Los mensajes quedan asociados al usuario autenticado y no modifican expedientes ni tareas.</p></div>
      <button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={17}/>{loading?'Actualizando…':'Actualizar'}</button>
    </section>

    <section className="chat-card" aria-label="Chat interno del equipo">
      <header><div><MessageCircle size={20}/><span><strong>Equipo Fénix</strong><small>{count} mensajes cargados</small></span></div><span className="chat-live-dot">Actualización cada 15 s</span></header>
      <div className="chat-stream" data-testid="chat-stream">
        {loading&&messages.length===0&&<div className="ops-message">Cargando conversación…</div>}
        {!loading&&messages.length===0&&!notice&&<div className="ops-empty"><strong>Aún no hay mensajes</strong><span>Escribe el primero para abrir el canal interno.</span></div>}
        {messages.map(m=>{const mine=Boolean(actor&&m.sender_actor_code===actor);return <article key={m.message_code} className={mine?'chat-message mine':'chat-message'} data-testid="chat-message"><div className="chat-meta"><strong>{mine?'Tú':m.sender_name||m.sender_actor_code}</strong><span>{m.sender_role}</span><time>{timeLabel(m.created_at)}</time></div><p>{m.body}</p></article>})}
        <div ref={endRef}/>
      </div>
      {notice&&<div className="chat-notice" role="status">{notice}</div>}
      <form className="chat-compose" onSubmit={submit}>
        <textarea aria-label="Mensaje interno" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={4000} placeholder="Escribe un mensaje para el equipo…"/>
        <div><small>{draft.length}/4000</small><button type="submit" disabled={!draft.trim()||sending}><Send size={17}/>{sending?'Enviando…':'Enviar'}</button></div>
      </form>
    </section>
  </OperationalShellFrame>;
}
