import {useState} from 'react';
import {Database,ShieldCheck,ShieldAlert,GitPullRequest,RefreshCw} from 'lucide-react';
import evidence from '../cerebro/universal/v0/provider-social/social-private-meta-audit-2026-11-15.json';
import './cerebro-social-provider-panel.css';
const datestr=(s:string)=>new Date(s).toLocaleString('es-ES');
export default function CerebroSocialProviderPanel(){
 const[selected,setSelected]=useState<string|null>(null);
 return <section className="op4-social" aria-label="Social · Instagram y Facebook AUTOQUAL auditados">
  <div className="op4-social-header"><h4>Social · Instagram y Facebook AUTOQUAL</h4>
   <span><RefreshCw size={14}/> Auditoría del {evidence.audit_date}. NO EN VIVO</span></div>
  <p>Repositorios privados, Workers y bases D1 comprobados. Tener infraestructura desplegada no significa que haya agentes funcionando ni publicaciones.</p>
  <div className="op4-social-list">
   {evidence.engines.map(engine=><article className="op4-social-item" key={engine.engine_id}>
    <div><strong>{engine.engine_id}</strong>
     <small><GitPullRequest size={13}/> PR #{engine.github_pr} en borrador · Cloudflare Worker desplegado</small>
     <small><Database size={13}/> D1 {engine.d1.jurisdiction.toUpperCase()} · Sin cron · Sin URL pública workers.dev</small>
     <small><ShieldCheck size={13}/> AUTOQUAL OFF · GROQ OFF · Agentes activos: DESCONOCIDO</small></div>
    <button type="button" aria-label={'Comprobar detalles auditados '+engine.engine_id} onClick={()=>setSelected(selected===engine.engine_id?null:engine.engine_id)}>Detalles</button>
    {selected===engine.engine_id?<div className="op4-social-details" role="status">
     <p>Worker: <code>{engine.provider_worker}</code>. Versión desplegada comprobada: <code>{engine.runtime.active_version}</code>.</p>
     <p>Base D1: {engine.d1.name} · jurisdicción UE. Configuración y PR inspeccionadas el 15/11/2026; no equivale a una nueva consulta.</p>
     <p><ShieldAlert size={14}/> Pausa, reanudación, cambio de prioridad y publicaciones desde Operativa: <b>NO CONECTADOS</b>. Ninguna acción activada.</p>
    </div>:null}
   </article>)}
  </div>
  <p className="op4-social-foot">Los roles declarados en títulos de PR o registros internos no se cuentan como procesos vivos. La lectura dinámica del repositorio privado sigue pendiente de conexión autenticada.</p>
 </section>;
}
