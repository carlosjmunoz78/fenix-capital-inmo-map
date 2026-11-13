import {Building2,ChevronRight,Layers3,ShieldCheck} from 'lucide-react';
import CerebroEngineCatalog from './CerebroEngineCatalog';
import type {OwnerUniverseResult,UniverseCompanyRequest} from './cerebroOperativaLabUniverseApi';

type Section='entidades'|'proyectos'|'motores';
type Props={
 section:Section;scope:UniverseCompanyRequest;result:OwnerUniverseResult;
 onCompanyChange:(company:UniverseCompanyRequest)=>void;
 onNavigate:(section:Section|'trabajos')=>void;
 observedEngines:{id:string;count:number;running:number}[];
};
const NAMES:Record<string,string>={fenix:'Fénix',aion:'AION',captacasa:'CAPTACASA'};
const KNOWN=['fenix','aion','captacasa'];
function label(id:string){return NAMES[id]??id.toUpperCase()}
function stateMessage(result:OwnerUniverseResult){
 if(result.kind==='loading')return 'Consultando el Gateway de laboratorio con tu sesión autenticada…';
 if(result.kind==='denied')return 'No hay acceso verificado a este contexto. Cambiar el selector no concede permisos.';
 if(result.kind==='unavailable')return 'No ha sido posible comprobar los registros. No mostraré datos anteriores como si fueran actuales.';
 return '';
}
function Empty({text}:{text:string}){return <p className="op3-source-empty">{text}</p>}
export default function CerebroOperativaUniverseViews({
 section,scope,result,onCompanyChange,onNavigate,observedEngines
}:Props){
 const data=result.data;
 const registry=result.kind==='ready'||result.kind==='partial'?data?.registry:null;
 const factory=result.kind==='ready'||result.kind==='partial'?data?.factory:null;
 const companies=registry?.status==='OK'?registry.companies:[];
 const projects=registry?.status==='OK'?registry.projects:[];
 const engines=registry?.status==='OK'?registry.engines:[];
 const catalog=factory?.status==='OK'?factory.catalog:[];
 const scaffolded=factory?.status==='OK'?factory.scaffolded:[];
 const sourceReady=registry?.status==='OK';
 const factoryReady=factory?.status==='OK';
 const observed=scope==='fenix'||scope==='all'?observedEngines:[];
 const known=new Set(scope==='all'?[...KNOWN,...companies.map(c=>c.company_id)]:[scope]);
 const status=stateMessage(result);
 return <div className="op3-universe">
  <div className="op3-source-identity">
   <span><ShieldCheck size={15}/> REGISTROS DEL GATEWAY LAB</span>
   <strong className={result.kind==='ready'?'is-ok':result.kind==='loading'?'is-blue':'is-amber'}>
    {result.kind==='loading'?'Comprobando':result.kind==='ready'?'Lectura verificada':
     result.kind==='partial'?'Conexión parcial':result.kind==='denied'?'Sin autorización':'Sin datos verificables'}
   </strong>
  </div>
  {status?<Empty text={status}/>:null}
  {section==='entidades'&&<div className="op3-universe-list">
   {[...known].map(id=>{
    const entry=companies.find(c=>c.company_id===id);
    const verified=Boolean(entry&&entry.access_status==='VERIFIED_OWNER_CONTEXT_NOT_REGISTERED');
    const registered=Boolean(entry)&&!verified;
    return <article key={id} className="op3-universe-line">
     <Building2 size={20}/>
     <div><strong>{label(id)}</strong><small>{verified?
      'Contexto del propietario confirmado; registro PREPROD aún sin alta':
      registered?'Fila de registro disponible; pertenencia operativa por verificar':
      'Sin vínculo verificado en esta fuente'}</small></div>
     <span className={verified?'is-ok':registered?'is-amber':'is-muted'}>
      {verified?'Vinculado':'Por verificar'}</span>
     <button type="button" disabled={!verified} aria-label={`Consultar proyectos de ${label(id)}`}
      onClick={()=>{onCompanyChange(id as UniverseCompanyRequest);onNavigate('proyectos')}}>
      Proyectos <ChevronRight size={16}/></button>
    </article>;
   })}
   <p className="op3-source-note">Aparecerán automáticamente otras empresas cuando el registro las devuelva y su acceso esté verificado. No se habilita una empresa por seleccionarla.</p>
  </div>}
  {section==='proyectos'&&<div className="op3-universe-list">
   {sourceReady?<><div className="op3-subheading"><Layers3 size={16}/> PROYECTOS DE LA FUENTE · {projects.length}</div>
    {projects.length?projects.map(p=><article key={p.company_id+'/'+p.project_id} className="op3-universe-line">
     <Layers3 size={20}/>
     <div><strong>{p.project_id}</strong><small>{label(p.company_id)} · {p.environment} · {p.access_status==='PROJECT_RECORD_PRESENT_INTEGRATION_UNVERIFIED'?'Integración operativa no acreditada':'Registro visible'}</small></div>
     <span className="is-amber">{p.project_status||'Sin estado'}</span>
     <button type="button" onClick={()=>onNavigate('trabajos')}>Actividad visible <ChevronRight size={16}/></button>
    </article>):<Empty text="Sin proyectos registrados en esta fuente para el contexto autorizado; pueden existir proyectos en otros sistemas."/ >}</>:
    <Empty text="No se ha podido verificar el registro de proyectos para este contexto."/ >}
   <p className="op3-source-note">Fuente: jarvis_project_overlay_v1. No representa el inventario de todos los proyectos de todas las empresas.</p>
  </div>}
  {section==='motores'&&<CerebroEngineCatalog sourceReady={sourceReady} factoryReady={factoryReady}
   engines={engines} factoryCatalog={catalog} scaffolded={scaffolded} observed={observed} scope={scope}/>}

 </div>;
}
