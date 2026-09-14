import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {BrainCircuit,ChevronLeft,ShieldCheck} from 'lucide-react';
import {cerebroConsoleLinkEnabled} from './cerebroConsoleAccess';
import {fetchCerebroConsoleHealth,type CerebroConsoleHealth} from './cerebroConsoleApi';
import './cerebro-console.css';

const CONTEXTS=['GENERAL','EMPRESA','ENGINE','CRM','APP','SEO','MARKETING','TRAINING','AUTOMATION'];

type GatewayState='closed'|'checking'|'ready'|'error';

export default function CerebroConsoleShell(){
 const location=useLocation(),navigate=useNavigate();
 const configured=cerebroConsoleLinkEnabled();
 const [gatewayState,setGatewayState]=useState<GatewayState>(configured?'checking':'closed');
 const [health,setHealth]=useState<CerebroConsoleHealth|null>(null);

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
 const title=ready?'Transporte autenticado verificado':gatewayState==='checking'?'Verificando CEREBRO Gateway…':'Superficie preparada, conexión cerrada';
 const detail=ready
  ?`CEREBRO Gateway responde por HTTPS autenticado (${health?.environment||'LAB'} · ${health?.version||'V0'}). Chat, comandos y escrituras continúan cerrados hasta superar sus gates.`
  :'Esta pantalla reserva la interfaz propia de CEREBRO dentro de Fénix. La comunicación permanece cerrada hasta disponer de una URL HTTPS desplegada y autenticada delante de CEREBRO Gateway. No existe conexión directa desde esta pantalla a ningún modelo.';

 return <main className="cerebro-console">
  <header className="cerebro-header"><button className="cerebro-back" onClick={()=>navigate('/perfil')}><ChevronLeft size={18}/> Mi perfil</button><div><small>CEREBRO OS · CONSOLE V0</small><h1><BrainCircuit size={25}/> CEREBRO</h1></div><span className="cerebro-lab"><ShieldCheck size={16}/> LAB</span></header>
  <section className="cerebro-panel cerebro-locked">
   <h2>{title}</h2>
   <p>{detail}</p>
   <div className="cerebro-fields"><label>Empresa<select disabled><option>Se cargará desde Company Registry</option></select></label><label>Contexto<select disabled>{CONTEXTS.map(item=><option key={item}>{item}</option>)}</select></label></div>
   <textarea disabled rows={8} placeholder={ready?'Chat y ejecución permanecen bloqueados hasta completar Company Registry, políticas, auditoría y gates de promoción.':'Chat y ejecución se habilitarán cuando CEREBRO Gateway tenga superficie desplegada y autenticada.'}/>
   <div className="cerebro-audit-note"><strong>Historial y auditoría</strong><span>Se mostrarán únicamente desde el registro canónico de CEREBRO; esta pantalla no crea persistencia paralela.</span></div>
   <button onClick={()=>navigate('/perfil')}>Volver a mi perfil</button>
  </section>
 </main>;
}
