import {useMemo,useState} from 'react';
import {Cpu,Search,ShieldCheck,Workflow,ChevronRight} from 'lucide-react';
import type {UniverseEngine,FactoryEngine,FactoryDirectory,UniverseCompanyRequest} from './cerebroOperativaLabUniverseApi';
import CerebroUniversalOperativaLabPanel from './CerebroUniversalOperativaLabPanel';
import registry from '../cerebro/registry/engine-registry-detailed-20261113.json';
import bindings from '../cerebro/registry/existing-engine-bindings.json';
import './cerebro-engine-catalog.css';
type Mode='all'|'observed'|'registered'|'factory';
type Props={sourceReady:boolean;factoryReady:boolean;engines:UniverseEngine[];factoryCatalog:FactoryEngine[];
 scaffolded:FactoryDirectory[];observed:{id:string;count:number;running:number}[];scope:UniverseCompanyRequest};
const records=registry.engines;
export default function CerebroEngineCatalog({sourceReady,factoryReady,engines,factoryCatalog,scaffolded,observed,scope}:Props){
 const[mode,setMode]=useState<Mode>('all');
 const[query,setQuery]=useState('');
 const[selected,setSelected]=useState<string|null>(null);
 const byId=useMemo(()=>new Map(engines.map(row=>[row.engine_id,row])),[engines]);
 const designs=useMemo(()=>new Map(factoryCatalog.map(row=>[row.engine_id,row])),[factoryCatalog]);
 const structures=useMemo(()=>new Set(scaffolded.map(row=>row.engine_id)),[scaffolded]);
 const observedById=useMemo(()=>new Map(observed.map(row=>[row.id,row])),[observed]);
 const boundById=useMemo(()=>new Map(bindings.engines.map(row=>[row.engine_id,row])),[]);
 const list=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase('es-ES');
  return records.filter(row=>{
   if(mode==='observed'&&!observedById.has(row.engine_id))return false;
   if(mode==='registered'&&!byId.has(row.engine_id))return false;
   if(mode==='factory'&&!designs.has(row.engine_id)&&!structures.has(row.engine_id))return false;
   return !q||[row.engine_id,row.name,row.purpose,row.tools,row.layer].some(value=>value.toLocaleLowerCase('es-ES').includes(q));
  });
 },[mode,query,observedById,byId,designs,structures]);
 const chosen=selected?records.find(row=>row.engine_id===selected):null;
 const active=chosen?byId.get(chosen.engine_id):undefined;
 const design=chosen?designs.get(chosen.engine_id):undefined;
 const run=chosen?observedById.get(chosen.engine_id):undefined;
 const bound=chosen?boundById.get(chosen.engine_id):undefined;
 const created=Boolean(chosen&&structures.has(chosen.engine_id));
 if(scope!=='fenix'&&scope!=='all')return <p className="op3-source-empty">No hay acceso verificado a esta empresa. Cambiar el selector no concede permisos.</p>;
 return <section className="op3-engine-catalog" aria-label="Catálogo completo de motores">
  <div className="op3-engine-summary">
   <div><small>REGISTRO MAESTRO · HISTÓRICO</small><strong>{records.length}</strong><span>Motores definidos, no todos conectados</span></div>
   <div><small>GATEWAY · LECTURA</small><strong>{sourceReady?engines.length:'—'}</strong><span>Registros visibles, no ejecución probada</span></div>
   <div><small>FACT-001 · DISEÑO</small><strong>{factoryReady?factoryCatalog.length:'—'}</strong><span>Definiciones del diseño</span></div>
   <div><small>GITHUB · CAPTURA</small><strong>{observed.length}</strong><span>IDs con actividad observada</span></div>
  </div>
  <CerebroUniversalOperativaLabPanel company={scope}/>
  <p className="op3-source-note">El diseño histórico de septiembre de 2026 NO certifica el estado actual. Los registros de producción, las dependencias y la capacidad de ejecutar requieren evidencias independientes.</p>
  <div className="op3-engine-tools">
   <label htmlFor="op3-engine-mode">Mostrar</label>
   <select id="op3-engine-mode" value={mode} onChange={event=>{setMode(event.target.value as Mode);setSelected(null)}}>
    <option value="all">Todos los motores ({records.length})</option>
    <option value="observed">Con actividad observada</option>
    <option value="registered">Registrados en Gateway</option>
    <option value="factory">Catálogo / scaffold FACT-001</option>
   </select>
   <label className="op3-engine-search"><Search size={16}/><input type="search" aria-label="Buscar motor por nombre, ID o función" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por motor, función o tecnología…"/></label>
  </div>
  <div className="op3-engine-content">
   <div className="op3-engine-list" aria-label="Listado de motores">
    {list.map(row=>{
     const state=byId.has(row.engine_id)?'Registrado · ejecución no acreditada':
      observedById.has(row.engine_id)?'Ejecución observada · sin control acreditado':
      structures.has(row.engine_id)?'Estructura GitOps · runtime sin verificar':'Definido · no certifica ejecución';
     return <button type="button" key={row.engine_id} className={'op3-engine-row '+(selected===row.engine_id?'is-selected':'')}
      aria-pressed={selected===row.engine_id} onClick={()=>setSelected(row.engine_id)}>
      <Cpu size={17}/><span><strong>{row.engine_id}</strong><small>{row.name}</small></span>
      <em>{state}</em><ChevronRight size={15}/>
     </button>;
    })}
    {mode==='all'?<small className="op3-engine-list-note">Runtime sin verificar para los motores sin evidencia específica.</small>:null}
    {!list.length?<p className="op3-source-empty">Sin coincidencias para este filtro. Puedes volver a «Todos los motores».</p>:null}
   </div>
   <aside className="op3-engine-detail" aria-label="Ficha de motor">
    {chosen?<><div className="op3-engine-detail-title"><Cpu size={24}/><div><small>{chosen.layer} · {chosen.engine_id}</small><h3>{chosen.name}</h3></div></div>
     <div className="op3-engine-fact"><strong>Función definida</strong><p>{chosen.purpose}</p></div>
     <div className="op3-engine-fact"><strong>Tecnología y herramientas previstas</strong><p>{chosen.tools}</p></div>
     <div className="op3-engine-fact"><strong>Situación histórica documentada</strong><p>{chosen.historical_description}</p><small>Septiembre de 2026 · NO es una lectura PROD actual</small></div>
     <div className="op3-engine-fact"><strong>Aspectos pendientes del diseño</strong><p>{chosen.missing}</p></div>
     <div className="op3-engine-fact"><strong>Conexión y uso comprobables ahora</strong>
      <p>{active?'Registro del Gateway: '+active.environment+' · '+(active.version||'sin versión')+' · '+(active.engine_state||'estado sin verificar'):'Sin conexión activa acreditada por este Gateway.'}</p>
      <p>{run?run.count+' ejecuciones observadas en GitHub ('+run.running+' en curso). No implica control autónomo.':'Sin ejecución atribuida a este ID en la última captura visible.'}</p>
      <p>{created?'Estructura GitOps identificada. Runtime sin verificar.':'Sin estructura GitOps verificada desde esta fuente.'}</p>
      {design?<p>FACT-001: {design.declared_state||'Definición visible'} · {design.version||'versión no indicada'}</p>:null}
      <small>Esta pantalla es de consulta; no concede EXECUTE ni nuevos permisos.</small>
     </div>
     <div className="op3-engine-fact"><strong>Binding y evidencias existentes</strong><p>{bound?.binding_state||'No existe binding de este ID en el mapa de enlaces disponible.'}</p>
      {bound?.notes?<p>{bound.notes}</p>:null}
      {(bound?.evidence_refs||[]).length?<ul>{bound!.evidence_refs.map(path=><li key={path}><code>{path}</code></li>)}</ul>:null}
     </div>
     <a href="https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/29dbcc47ae016ee6c86ca018326ffe77b9acbbcc/cerebro/registry/engine-registry.v1.json" target="_blank" rel="noreferrer">Registro maestro <ShieldCheck size={14}/></a>
    </>:<div className="op3-engine-placeholder"><Workflow size={29}/><strong>Selecciona un motor</strong><p>Consulta para qué sirve, herramientas previstas, dependencias documentadas, estado de conexión y evidencias. No inventamos estados operativos.</p></div>}
   </aside>
  </div>
  <p className="op3-source-note">Fuente de fichas: {registry.source}. Los 179 son IDs definidos; NO representan 179 motores operativos.</p>
 </section>;
}
