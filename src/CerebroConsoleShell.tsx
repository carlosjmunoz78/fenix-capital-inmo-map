import {useEffect,useState,type FormEvent} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {BrainCircuit,ChevronLeft,Send,ShieldCheck} from 'lucide-react';
import {cerebroConsoleLinkEnabled} from './cerebroConsoleAccess';
import {fetchAppApi,supabase} from './supabase';
import {fetchCerebroConsoleHealth,postCerebroConsoleChat,type CerebroConsoleHealth,type CerebroPendingAction,type CerebroReadContext} from './cerebroConsoleApi';
import './cerebro-console.css';

const CONTEXTS=['GENERAL','EMPRESA','ENGINE','CRM','APP','SEO','MARKETING','TRAINING','AUTOMATION'];
type GatewayState='closed'|'checking'|'ready'|'error';
type ChatLine={role:'user'|'cerebro';text:string;mediaUrl?:string|null};
type OwnerAccess='checking'|'allowed'|'denied';
type SessionContext={actor_code?:string;role?:string};

function renderMessage(text:string){
 const parts=text.split(/(https?:\/\/[^\s]+)/g);
 return parts.map((part,index)=>/^https?:\/\//.test(part)?<a key={index} href={part} target="_blank" rel="noreferrer">{part}</a>:part);
}

export default function CerebroConsoleShell(){
 const location=useLocation(),navigate=useNavigate();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const configured=cerebroConsoleLinkEnabled();
 const [ownerAccess,setOwnerAccess]=useState<OwnerAccess>('checking');
 const [gatewayState,setGatewayState]=useState<GatewayState>('closed');
 const [health,setHealth]=useState<CerebroConsoleHealth|null>(null);
 const [message,setMessage]=useState('');
 const [sending,setSending]=useState(false);
 const [lines,setLines]=useState<ChatLine[]>([]);
 const [pendingAction,setPendingAction]=useState<CerebroPendingAction|null>(null);
 const [readContext,setReadContext]=useState<CerebroReadContext|null>(null);

 useEffect(()=>{
  let cancelled=false;
  if(!isCerebroPath){setOwnerAccess('checking');return}
  const check=async()=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(cancelled)return;
   if(!session){setOwnerAccess('checking');return}
   const {status,data}=await fetchAppApi<SessionContext>('/session/context');
   if(cancelled)return;
   const allowed=Boolean(status===200&&data?.actor_code==='CARLOS-ADMIN');
   setOwnerAccess(allowed?'allowed':'denied');
   if(!allowed)navigate('/inicio',{replace:true});
  };
  void check();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{void check()});
  return()=>{cancelled=true;subscription.unsubscribe()};
 },[isCerebroPath,navigate]);

 useEffect(()=>{
  if(!isCerebroPath||ownerAccess!=='allowed')return;
  document.documentElement.dataset.cerebroConsole='1';
  return()=>{delete document.documentElement.dataset.cerebroConsole};
 },[isCerebroPath,ownerAccess]);

 useEffect(()=>{
  let cancelled=false;
  if(!isCerebroPath||ownerAccess!=='allowed'||!configured){setGatewayState('closed');setHealth(null);return}
  setGatewayState('checking');
  fetchCerebroConsoleHealth().then(({status,data})=>{
   if(cancelled)return;
   const safe=Boolean(status===200&&data?.status==='ok'&&data.authenticated_transport===true&&data.direct_model_access===false&&data.prod_execution_enabled===false&&data.live_writes===false);
   setHealth(safe?data:null);
   setGatewayState(safe?'ready':'error');
  });
  return()=>{cancelled=true};
 },[configured,isCerebroPath,ownerAccess]);

 if(!isCerebroPath||ownerAccess!=='allowed')return null;
 const ready=gatewayState==='ready';
 const chatReady=Boolean(ready&&health?.chat_available&&['DETERMINISTIC_READ_ONLY','OWNER_DECISION_BY_EXCEPTION_V1'].includes(health?.chat_mode||''));
 const title=ready?'Transporte autenticado verificado':gatewayState==='checking'?'Verificando CEREBRO Gateway…':'Superficie preparada, conexión cerrada';
 const detail=chatReady
  ?'CEREBRO móvil aplica decisión humana por excepción: puedes consultar sin activar cambios y las acciones requieren una propuesta exacta seguida de tu confirmación explícita.'
  :ready
   ?`CEREBRO Gateway responde por HTTPS autenticado (${health?.environment||'LAB'} · ${health?.version||'V0'}). Las escrituras continúan cerradas hasta superar sus gates.`
   :'Esta pantalla reserva la interfaz propia de CEREBRO dentro de Fénix. La comunicación permanece cerrada hasta disponer de una URL HTTPS desplegada y autenticada delante de CEREBRO Gateway.';

 async function submit(event:FormEvent){
  event.preventDefault();
  const text=message.trim();
  if(!text||!chatReady||sending)return;
  setLines(current=>[...current,{role:'user',text}]);
  setMessage('');
  setSending(true);
  const {status,data}=await postCerebroConsoleChat(text,pendingAction,readContext);
  const response=status>0&&data?.message?data.message:'No he podido contactar con CEREBRO Gateway.';
  if(data?.read_context)setReadContext(data.read_context);
  if(data?.status==='CANCELED'||data?.status==='ACTION_ACCEPTED'||(data?.status==='ACTION_CONFIRMED'&&!data?.action))setPendingAction(null);
  else if(data?.action)setPendingAction(data.action);
  const mediaUrl=data?.media?.public_media_url||data?.read_context?.public_media_url||null;
  setLines(current=>[...current,{role:'cerebro',text:response,mediaUrl}]);
  setSending(false);
 }

 return <main className="cerebro-console">
  <header className="cerebro-header"><button className="cerebro-back" onClick={()=>navigate('/perfil')}><ChevronLeft size={18}/> Mi perfil</button><div><small>CEREBRO OS · CONSOLE V0</small><h1><BrainCircuit size={25}/> CEREBRO</h1></div><span className="cerebro-lab"><ShieldCheck size={16}/> LAB</span></header>
  <section className="cerebro-panel">
   <h2>{title}</h2>
   <p>{detail}</p>
   <div className="cerebro-fields"><label>Empresa<select disabled><option>Fénix · sesión autenticada</option></select></label><label>Contexto<select disabled>{CONTEXTS.map(item=><option key={item}>{item}</option>)}</select></label></div>
   <div className="cerebro-chat-log" aria-live="polite">
    {lines.length===0?<div className="cerebro-chat-empty">Pregunta lo que necesites o pide una acción. CEREBRO separará lectura de ejecución.</div>:lines.map((line,index)=><div key={index} className={`cerebro-chat-line cerebro-chat-${line.role}`}><strong>{line.role==='user'?'Tú':'CEREBRO'}</strong><span>{renderMessage(line.text)}</span>{line.role==='cerebro'&&line.mediaUrl?<a className="cerebro-media-link" href={line.mediaUrl} target="_blank" rel="noreferrer"><img className="cerebro-media-preview" src={line.mediaUrl} alt="Imagen asociada a la publicación"/><span>Abrir imagen</span></a>:null}</div>)}
   </div>
   <form className="cerebro-chat-form" onSubmit={submit}>
    <textarea value={message} onChange={event=>setMessage(event.target.value)} disabled={!chatReady||sending} rows={3} placeholder={chatReady?'Escribe a CEREBRO…':'Chat disponible cuando el Gateway confirme el modo seguro.'}/>
    <button type="submit" disabled={!chatReady||sending||!message.trim()}><Send size={17}/>{sending?'Enviando…':'Enviar'}</button>
   </form>
   <div className="cerebro-audit-note"><strong>Decisión humana por excepción</strong><span>Las consultas no requieren confirmación. Una acción requiere propuesta exacta + un «sí». Preguntar o pedir explicación no ejecuta nada. Los ejecutores reales siguen sujetos a sus gates y a evidencia viva.</span></div>
   <button onClick={()=>navigate('/perfil')}>Volver a mi perfil</button>
  </section>
 </main>;
}
