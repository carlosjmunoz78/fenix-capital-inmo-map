import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {FileAudio,FileText,Image as ImageIcon,MessageCircle,Paperclip,RefreshCw,Send,X} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {supabase,fetchAppApi} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';

type Theme='light'|'dark';
type Attachment={attachment_code?:string;filename?:string;mime_type?:string;size_bytes?:number;storage_path?:string;created_at?:string};
type Msg={message_code?:string;sender_actor_code?:string;sender_name?:string;body?:string;created_at?:string;attachments?:Attachment[]};
type ChatPayload={ok?:boolean;status?:number;channel?:string;items?:Msg[];item?:Msg;error?:string};
type Ctx={actor_code?:string;role?:string;display_name?:string;context?:{actor_code?:string;role?:string;display_name?:string}};
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
const BUCKET='fenix-prod-chat';
const ACCEPT='image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,audio/opus,audio/aac,audio/flac';
const ALLOWED=new Set(ACCEPT.split(','));
const MAX=20*1024*1024;
function safeName(name:string){return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-160)||'archivo';}
function attachmentIcon(mime=''){if(mime.startsWith('image/'))return <ImageIcon size={15}/>;if(mime.startsWith('audio/'))return <FileAudio size={15}/>;return <FileText size={15}/>;}

export default function ChatShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname.replace(/\/+$/,'')==='/chat';
 const[logged,setLogged]=useState(false),[ready,setReady]=useState(false),[nav,setNav]=useState<NavItem[]>([]),[ctx,setCtx]=useState<Ctx|null>(null),[items,setItems]=useState<Msg[]>([]),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[query,setQuery]=useState(''),[pending,setPending]=useState<File|null>(null);
 const[theme,setTheme]=useState<Theme>(()=>(localStorage.getItem('fenix-theme') as Theme)||'light');
 const fileInput=useRef<HTMLInputElement|null>(null);
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true);if(!s)setPending(null)});return()=>{alive=false;subscription.unsubscribe()};},[]);
 async function load(){if(!active||!logged)return;setBusy(true);setMsg('');try{const[c,n,r]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation'),supabase.rpc('fenix_prod_chat_list_user',{p_limit:200})]);setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);if(r.error){setMsg('No se pudo cargar el chat interno.');setItems([]);return;}const data=r.data as ChatPayload;setItems(data?.ok&&Array.isArray(data.items)?data.items:[]);if(!data?.ok)setMsg(data?.status===403?'Tu identidad no está vinculada al chat interno.':'No se pudo cargar el chat interno.');}finally{setBusy(false)}}
 useEffect(()=>{if(active&&logged)void load()},[active,logged]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;localStorage.setItem('fenix-theme',theme);sessionStorage.setItem('fenix-theme',theme)},[active,theme]);
 function chooseFile(file?:File){if(!file)return;if(file.size<=0||file.size>MAX){setMsg('El archivo debe ocupar entre 1 byte y 20 MB.');return;}if(!ALLOWED.has(file.type)){setMsg('Formato no admitido. Usa imagen, PDF, TXT, DOCX, XLSX o audio compatible.');return;}setPending(file);setMsg('');}
 async function uploadAttachment(file:File,messageCode:string){
  const{data:{session}}=await supabase.auth.getSession();if(!session?.user?.id)throw new Error('unauthorized');
  const storagePath=`${session.user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const up=await supabase.storage.from(BUCKET).upload(storagePath,file,{contentType:file.type,upsert:false});if(up.error)throw new Error('upload_failed');
  const add=await supabase.rpc('fenix_prod_chat_attachment_add_user',{p_message_code:messageCode,p_storage_path:storagePath,p_filename:file.name,p_mime_type:file.type,p_size_bytes:file.size});
  const data=add.data as {ok?:boolean;error?:string}|null;
  if(add.error||!data?.ok){await supabase.storage.from(BUCKET).remove([storagePath]);throw new Error(data?.error||'attachment_register_failed');}
 }
 async function send(e:FormEvent){
  e.preventDefault();const text=body.trim();const file=pending;if((!text&&!file)||busy)return;setBusy(true);setMsg('');
  const key=`chat-ui-${Date.now()}-${crypto.randomUUID()}`;const messageBody=text||(file?`📎 ${file.name}`:'');
  const r=await supabase.rpc('fenix_prod_chat_send_user',{p_body:messageBody,p_idempotency_key:key});const data=r.data as ChatPayload|null;const messageCode=data?.item?.message_code;
  if(r.error||!data?.ok||!messageCode){setMsg('No se pudo enviar el mensaje. No se ha duplicado ningún envío.');setBusy(false);return;}
  if(file){try{await uploadAttachment(file,messageCode)}catch{setMsg('El mensaje se envió, pero el adjunto no pudo guardarse. Puedes volver a adjuntarlo en un mensaje nuevo.');setBody('');setPending(null);await load();setBusy(false);return;}}
  setBody('');setPending(null);await load();setBusy(false);
 }
 async function openAttachment(a:Attachment){if(!a.storage_path)return;setMsg('');const r=await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path,300);if(r.error||!r.data?.signedUrl){setMsg('No se pudo abrir el adjunto.');return;}window.open(r.data.signedUrl,'_blank','noopener,noreferrer');}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const context=ctx?.context??ctx??{};const role=String(context.role??'Usuario'),name=String(context.display_name??context.actor_code??role);const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?items.filter(x=>`${x.sender_name??''} ${x.sender_actor_code??''} ${x.body??''} ${(x.attachments??[]).map(a=>a.filename).join(' ')}`.toLowerCase().includes(q)):items},[items,query]);
 if(!ready||!logged)return null;
 if(!active)return <button type="button" className="fenix-chat-launcher" aria-label="Abrir chat de equipo" title="Chat de equipo" onClick={()=>navigate('/chat')}><MessageCircle size={20}/><style>{`.fenix-chat-launcher{position:fixed;right:18px;bottom:18px;z-index:9050;width:46px;height:46px;border-radius:14px;border:1px solid #870064;background:#870064;color:#fff;display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18)}.fenix-chat-launcher:hover,.fenix-chat-launcher:focus-visible{filter:brightness(1.08)}@media(max-width:650px){.fenix-chat-launcher{right:18px;bottom:18px}}`}</style></button>;
 const effectiveNav=nav.length?nav:fallbackNav;
 return <OperationalShellFrame className="chat-root" theme={theme} navigation={effectiveNav} activeRoute="/chat" anaSubtitle="Chat interno del equipo." anaRoute="/ana" query={query} onQueryChange={setQuery} searchPlaceholder="Buscar en el chat..." name={name} role={role} initials={name.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="chat-content">
  <style>{`.chat-content{display:grid;gap:16px}.chat-hero,.chat-panel{border:1px solid var(--border,#e5e5e8);background:var(--panel,#fff);border-radius:16px;padding:18px}.chat-hero{display:flex;align-items:center;justify-content:space-between;gap:14px}.chat-hero h2{margin:3px 0}.chat-feed{display:grid;gap:10px;max-height:55vh;overflow:auto;padding:4px}.chat-message{border:1px solid var(--border,#e5e5e8);border-radius:13px;padding:11px 13px;background:var(--surface,#fff)}.chat-meta{font-size:11px;color:var(--muted,#666);display:flex;justify-content:space-between;gap:12px}.chat-body{white-space:pre-wrap;margin-top:5px}.chat-attachments{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.chat-attachment{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border,#ddd);background:var(--surface,#fff);color:var(--text,#222);border-radius:9px;padding:7px 9px;cursor:pointer;max-width:100%}.chat-attachment span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chat-compose{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:end}.chat-compose textarea{min-height:72px;resize:vertical;padding:11px;border-radius:12px;border:1px solid var(--border,#ddd);background:var(--surface,#fff);color:var(--text,#222)}.chat-compose button,.chat-refresh{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;border-radius:11px;border:0;background:#870064;color:#fff;font-weight:800;cursor:pointer}.chat-attach{height:44px;min-width:44px}.chat-pending{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border,#ddd);border-radius:10px;padding:9px 11px}.chat-pending button{background:transparent;color:var(--text,#222);padding:5px}.chat-empty{text-align:center;padding:32px;color:var(--muted,#666)}@media(max-width:650px){.chat-compose{grid-template-columns:auto 1fr}.chat-compose>button[type='submit']{grid-column:1 / -1}.chat-hero{align-items:flex-start;flex-direction:column}}`}</style>
  <section className="chat-hero"><div><span className="eyebrow">EQUIPO</span><h2>Chat interno</h2><p>Texto, imágenes, documentos y audios vinculados a usuarios autenticados. No se admite suplantar otro actor.</p></div><button type="button" className="chat-refresh" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/>{busy?'Actualizando…':'Actualizar'}</button></section>
  <section className="chat-panel" aria-label="Mensajes del equipo"><div className="chat-feed">{filtered.length?filtered.map((x,i)=><article className="chat-message" key={x.message_code??`${x.created_at}-${i}`}><div className="chat-meta"><strong>{x.sender_name||x.sender_actor_code||'Equipo'}</strong><span>{x.created_at?new Date(x.created_at).toLocaleString('es-ES'):''}</span></div><div className="chat-body">{x.body}</div>{Boolean(x.attachments?.length)&&<div className="chat-attachments">{x.attachments!.map(a=><button type="button" className="chat-attachment" key={a.attachment_code??a.storage_path} onClick={()=>void openAttachment(a)}>{attachmentIcon(a.mime_type)}<span>{a.filename||'Adjunto'}</span></button>)}</div>}</article>):<div className="chat-empty"><MessageCircle size={28}/><p>{query?'No hay mensajes que coincidan con la búsqueda.':'Todavía no hay mensajes en el chat.'}</p></div>}</div></section>
  <form className="chat-panel chat-compose" onSubmit={send}><input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={e=>{chooseFile(e.target.files?.[0]);e.target.value='';}}/><button type="button" className="chat-attach" aria-label="Adjuntar imagen, documento o audio" title="Adjuntar" disabled={busy} onClick={()=>fileInput.current?.click()}><Paperclip size={18}/></button><textarea aria-label="Mensaje para el equipo" placeholder="Escribe un mensaje para el equipo..." value={body} onChange={e=>setBody(e.target.value)} disabled={busy}/><button type="submit" disabled={busy||(!body.trim()&&!pending)}><Send size={17}/>{busy?'Enviando…':'Enviar'}</button>{pending&&<div className="chat-pending"><span>{attachmentIcon(pending.type)} <strong>{pending.name}</strong> · {(pending.size/1024/1024).toLocaleString('es-ES',{maximumFractionDigits:2})} MB</span><button type="button" aria-label="Quitar adjunto" onClick={()=>setPending(null)}><X size={16}/></button></div>}{msg&&<strong style={{gridColumn:'1 / -1',fontSize:12}}>{msg}</strong>}</form>
 </OperationalShellFrame>;
}
