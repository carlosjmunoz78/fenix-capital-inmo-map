import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type SharedStateStatus='ACTIVO'|'PERFECTO'|'PARCIAL'|'FALLANDO'|'DEFINIDO'|'POR_VERIFICAR';
export type SharedDepartment={department_key:string;total:number;states:Record<SharedStateStatus,number>};
export type SharedSummary={schema:'CEREBRO_SHARED_STATE_V1';company_id:'fenix';status:'OK';feed_health:'LIVE_EVIDENCE_FEED'|'DEGRADED_EVIDENCE_FEED';source_status:'ACTIVO'|'DEGRADADO';observed_at:string|null;read_only:true;executed:false;
 overview:{total_profiles:number;departments:number;states:Record<SharedStateStatus,number>;verified_running_profiles:number;templates:number;engine_association_is_not_execution:true};
 departments:SharedDepartment[];refresh_interval_seconds:number};
type SharedContext={status:'loading'|'ready'|'denied'|'unavailable';summary:SharedSummary|null;updatedAt:string|null;refresh:()=>void};
const Context=createContext<SharedContext>({status:'loading',summary:null,updatedAt:null,refresh:()=>{}});
export const useCerebroSharedState=()=>useContext(Context);
export function CerebroSharedStateProvider({children}:{children:ReactNode}){
 const [status,setStatus]=useState<SharedContext['status']>('loading');
 const [summary,setSummary]=useState<SharedSummary|null>(null);
 const [updatedAt,setUpdatedAt]=useState<string|null>(null);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true,working=false;
  const refresh=async()=>{
   if(!active||working)return;
   working=true;
   try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!active)return;
    if(!session?.access_token){setStatus('denied');setSummary(null);return}
    const response=await fetch('/api/cerebro-shared-state?mode=summary&company_id=fenix',{
     method:'GET',cache:'no-store',headers:{
      authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'
     }
    });
    if(!active)return;
    if(response.status===401||response.status===403){setStatus('denied');setSummary(null);return}
    if(response.status!==200)throw Error('SOURCE_UNAVAILABLE');
    const data=await response.json() as SharedSummary&{status:string};
    const states=data.overview?.states;
    const total=states?Object.values(states).reduce((a,b)=>a+b,0):NaN;
    if(data.schema!=='CEREBRO_SHARED_STATE_V1'||data.company_id!=='fenix'||data.read_only!==true||
     data.executed!==false||!Array.isArray(data.departments)||data.departments.length<1||
     !Number.isSafeInteger(total)||total!==data.overview.total_profiles||total!==2506)
     throw Error('INVALID_SHARED_STATE_CONTRACT');
    setSummary(data);setStatus('ready');setUpdatedAt(new Date().toISOString());
   }catch{if(active){setStatus('unavailable');setSummary(null)}}
   finally{working=false}
  };
  void refresh();
  const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},30_000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh()};
  const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{
   if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='SIGNED_OUT')setRevision(v=>v+1);
  });
  document.addEventListener('visibilitychange',visible);
  return()=>{active=false;window.clearInterval(interval);document.removeEventListener('visibilitychange',visible);subscription.unsubscribe()};
 },[revision]);
 return <Context.Provider value={{status,summary,updatedAt,refresh:()=>setRevision(v=>v+1)}}>{children}</Context.Provider>;
}
const labels:Record<SharedStateStatus,string>={ACTIVO:'Activos acreditados',PERFECTO:'Excelencia verificada',PARCIAL:'Parcial',FALLANDO:'Fallando',DEFINIDO:'Plantillas',POR_VERIFICAR:'Por verificar'};
export function CerebroSharedStatusBanner(){
 const {status,summary,updatedAt,refresh}=useCerebroSharedState();
 const counts=summary?.overview.states;
 return <section aria-label="Estado universal CEREBRO OS, todas las interfaces" data-cerebro-shared-state="v1"
  style={{padding:'8px 14px',background:'var(--cerebro-panel,#102338)',color:'var(--cerebro-text,#e6f2ff)',fontSize:12,borderBottom:'1px solid #31516c'}}>
  <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
   <strong>ESTADO COMPARTIDO · CEREBRO</strong>
   {status==='ready'&&summary&&counts?<>
    <span>{summary.overview.total_profiles.toLocaleString('es-ES')} perfiles · {summary.overview.departments} áreas registradas</span>
    {(['ACTIVO','PERFECTO','PARCIAL','FALLANDO','POR_VERIFICAR'] as const).map(key=>
     <span key={key}>{labels[key]}: <strong>{counts[key]}</strong></span>)}
    <span>Fuente: {summary.source_status} · {summary.observed_at?new Date(summary.observed_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'sin datos'}</span>
   </>:<span role="status">{status==='loading'?'Consultando estados…':status==='denied'?'Acceso no autorizado':'Fuente compartida no disponible · sin estados inventados'}</span>}
   <button type="button" onClick={refresh} style={{padding:'4px 8px',background:'transparent',color:'inherit',border:'1px solid currentColor',borderRadius:6}}>Actualizar</button>
  </div>
  {status==='ready'&&summary?<details style={{marginTop:3}}>
    <summary style={{cursor:'pointer'}}>Ver estado de todos los departamentos · sincronización automática cada 30 s</summary>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',paddingTop:8}}>
     {summary.departments.map(dep=><span key={dep.department_key} style={{padding:'6px 9px',border:'1px solid #31516c',borderRadius:6}}>
      <strong>{dep.department_key}</strong> · {dep.total} · activos {dep.states.ACTIVO} · excelencia {dep.states.PERFECTO} · parciales {dep.states.PARCIAL} · fallos {dep.states.FALLANDO}
     </span>)}
    </div>
    <small>Los motores compartidos y los perfiles lógicos no se consideran activos sin evidencia exacta. Última consulta local: {updatedAt?new Date(updatedAt).toLocaleTimeString('es-ES'):'—'}.</small>
   </details>:null}
 </section>;
}
