import {useEffect,useState,type FormEvent} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {BrainCircuit,ChevronLeft,Send,ShieldCheck} from 'lucide-react';
import {cerebroConsoleLinkEnabled} from './cerebroConsoleAccess';
import {fetchCerebroConsoleHealth,postCerebroConsoleChat,type CerebroConsoleHealth} from './cerebroConsoleApi';
import './cerebro-console.css';

const CONTEXTS=['GENERAL','EMPRESA','ENGINE','CRM','APP','SEO','MARKETING','TRAINING','AUTOMATION'];
type GatewayState='closed'|'checking'|'ready'|'error';
type ChatLine={role:'user'|'cerebro';text:string};

export default function CerebroConsoleShell(){
 const location=useLocation(),navigate=useNavigate();
 const configured=cerebroConsoleLinkEnabled();
 const [gatewayState,setGatewayState]=useState<GatewayState>(configured?'checking':'closed');
 const [health,setHealth]=useState<CerebroConsoleHealth|null>(null);
 const [message,setMessage]=useState('');
 const [sending,setSending]=useState(false);
 const [lines,setLines]=useState<ChatLine[]>([]);

 useEffect(()=>{
  if(location.pathname!=='/cerebro')return;
  document.documentElement.dataset.cerebroConsole='1';
  return()=>{delete document.documentElement.dataset.cerebroConsole};
 },[location.pathname]);

 useEffect(()=>{
  let cancelled=false;
  if(location.pathname!=='/cerebro'||!configured){setGatewayState('closed');setHealth(null);return}
  setGatewayState('checking');
  fetchCerebroConsoleHealth().then(({status,data})=>{
   if(cancelled)return;
   const safe=Boolean(status===200&&data?.status==='ok'&&data.authenticated_transport===true&&data.direct_model_access===false&&data.prod_execution_enabled===false&&data.live_writes===false);
   setHealth(safe?data:null);
   setGatewayState(safe?'ready':'error');
  });
  return()=>{cancelled=true};
 },[configured,location.pathname]);

 if(location.pathname!=='/cerebro')return null;
 const ready=gatewayState==='ready';
 const chatReady=Boolean(ready&&health?.chat_available&&health?.chat_mode==='DETERMINISTIC_READ_ONLY');
 const title=ready?'Transporte autenticado verificado':gatewayState==='checking'?'Verificando CEREBRO Gateway…':'Superficie preparada, conexión cerrada';
 const detail=chatReady
  ?'CEREBRO móvil está disponible en modo determinista y solo lectura. Puedes preguntar por estado, motores, contrato o ayuda. No ejecuta escrituras ni accede directamente a ningún modelo.'
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
  const {status,data}=await postCerebroConsoleChat(text);
  const response=status>0&&data?.message?data.message:'No he podido contactar con CEREBRO Gateway.';
  setLines(current=>[...current,{role:'cerebro',text:response}]);
  setSending(false);
 }

 return <main className="cerebro-console">
  <header className="cerebro-header"><button className="cerebro-back" onClick={()=>navigate('/perfil')}><ChevronLeft size={18}/> Mi perfil</button><div><small>CEREBRO OS · CONSOLE V0</small><h1><BrainCircuit size={25}/> CEREBRO</h1></div><span className="cerebro-lab"><ShieldCheck size={16}/> LAB</span></header>
  <section className="cerebro-panel">
   <h2>{title}</h2>
   <p>{detail}</p>
   <div className="cerebro-fields"><label>Empresa<select disabled><option>Fénix · sesión autenticada</option></select></label><label>Contexto<select disabled>{CONTEXTS.map(item=><option key={item}>{item}</option>)}</select></label></div>
   <div className="cerebro-chat-log" aria-live="polite">
    {lines.length===0?<div className="cerebro-chat-empty">Escribe «estado», «motores», «contrato» o «ayuda».</div>:lines.map((line,index)=><div key={index} className={`cerebro-chat-line cerebro-chat-${line.role}`}><strong>{line.role==='user'?'Tú':'CEREBRO'}</strong><span>{line.text}</span></div>)}
   </div>
   <form className="cerebro-chat-form" onSubmit={submit}>
    <textarea value={message} onChange={event=>setMessage(event.target.value)} disabled={!chatReady||sending} rows={3} placeholder={chatReady?'Escribe a CEREBRO…':'Chat disponible cuando el Gateway confirme el modo seguro.'}/>
    <button type="submit" disabled={!chatReady||sending||!message.trim()}><Send size={17}/>{sending?'Enviando…':'Enviar'}</button>
   </form>
   <div className="cerebro-audit-note"><strong>Seguridad V0</strong><span>Modo determinista y solo lectura. Sin escrituras, sin acceso directo a modelos y sin acciones PROD. Las conversaciones de esta pantalla aún no se declaran persistentes.</span></div>
   <button onClick={()=>navigate('/perfil')}>Volver a mi perfil</button>
  </section>
 </main>;
}
