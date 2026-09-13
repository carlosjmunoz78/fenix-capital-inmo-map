import {useLocation,useNavigate} from 'react-router-dom';
import {BrainCircuit,ChevronLeft,ShieldCheck} from 'lucide-react';
import {cerebroConsoleLinkEnabled} from './cerebroConsoleAccess';
import './cerebro-console.css';

const CONTEXTS=['GENERAL','EMPRESA','ENGINE','CRM','APP','SEO','MARKETING','TRAINING','AUTOMATION'];

export default function CerebroConsoleShell(){
 const location=useLocation(),navigate=useNavigate();
 if(location.pathname!=='/cerebro')return null;
 const configured=cerebroConsoleLinkEnabled();
 return <main className="cerebro-console">
  <header className="cerebro-header"><button className="cerebro-back" onClick={()=>navigate('/perfil')}><ChevronLeft size={18}/> Mi perfil</button><div><small>CEREBRO OS · CONSOLE V0</small><h1><BrainCircuit size={25}/> CEREBRO</h1></div><span className="cerebro-lab"><ShieldCheck size={16}/> LAB</span></header>
  <section className="cerebro-panel cerebro-locked">
   <h2>{configured?'Superficie preparada para conectar':'Superficie preparada, conexión cerrada'}</h2>
   <p>Esta pantalla reserva la interfaz propia de CEREBRO dentro de Fénix. La comunicación permanece cerrada hasta disponer de una URL HTTPS desplegada y autenticada delante de CEREBRO Gateway. No existe conexión directa desde esta pantalla a ningún modelo.</p>
   <div className="cerebro-fields"><label>Empresa<select disabled><option>Se cargará desde Company Registry</option></select></label><label>Contexto<select disabled>{CONTEXTS.map(item=><option key={item}>{item}</option>)}</select></label></div>
   <textarea disabled rows={8} placeholder="Chat y ejecución se habilitarán cuando CEREBRO Gateway tenga superficie desplegada y autenticada."/>
   <div className="cerebro-audit-note"><strong>Historial y auditoría</strong><span>Se mostrarán únicamente desde el registro canónico de CEREBRO; esta pantalla no crea persistencia paralela.</span></div>
   <button onClick={()=>navigate('/perfil')}>Volver a mi perfil</button>
  </section>
 </main>;
}
