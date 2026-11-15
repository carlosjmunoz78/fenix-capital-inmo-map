import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type FleetRole={id:string;name:string;department:string;company_id:string;environment:string;state:string;reports_to:string|null;runtime_verified:false};
export type FleetRun={run_id:number;name:string;status:string;conclusion:string|null;updated_at:string|null;url:string;engine_id:null;agent_id:null;subagent_id:null};
export type FleetSource={
 platform:string;repo?:string;name?:string;state:'LIVE'|'UNAVAILABLE';reason:string|null;
 observed_at:string|null;observed_sample?:number|null;active_in_sample?:number|null;
 queued_in_sample?:number|null;total_repo_run_count?:number|null;recent?:FleetRun[];
 registered_agents?:number|null;active_agents?:number|null;subagents?:number|null;
};
export type FleetSnapshot={
 status:'OK';source:'OWNER_LAB_FLEET_SOURCES_V1';environment:'LAB';company_id:'fenix';
 observed_at:string;verified_owner:true;read_only:true;execution_enabled:false;additional_cost_eur:0;
 roles:{declared_role_profiles:number;active_agent_count:null;verified_subagent_count:null;
 unknown_agent_count:true;unknown_subagent_count:true;hierarchy_complete:boolean;
 by_department:Record<string,number>;entries:FleetRole[];
 registry_id:string;registry_environment:string;registry_status:string};
 media_studio?:{studio_brain:number;departments:number;specialists:number;supervisors:number;tribunals:number;judges:number;guardians:number;total_roles:number;source:'MEDIA_STUDIO_ROLE_REGISTRY_DESIGN_ONLY';runtime_verified:false};
 engine_registry_count:179;engine_registry_semantics:'DEFINED_NOT_RUNNING';
 sources:FleetSource[];
 control:{pause:'NOT_CONNECTED';resume:'NOT_CONNECTED';prioritize:'NOT_CONNECTED';reason:'NO_VERIFIED_CONTROL_EXECUTOR';staging_status:'SUSPENDED_BY_OWNER'};
};
export type FleetRead={kind:'ready'|'unavailable'|'denied';snapshot:FleetSnapshot|null;reason:string};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const no=(kind:'denied'|'unavailable',reason:string):FleetRead=>({kind,reason,snapshot:null});
function validate(raw:unknown):raw is FleetSnapshot{
 if(!raw||typeof raw!=='object')return false;
 const s=raw as Partial<FleetSnapshot>;
 return s.status==='OK'&&s.source==='OWNER_LAB_FLEET_SOURCES_V1'&&s.environment==='LAB'&&s.company_id==='fenix'&&
  s.verified_owner===true&&s.read_only===true&&s.execution_enabled===false&&s.additional_cost_eur===0&&
  s.engine_registry_count===179&&s.engine_registry_semantics==='DEFINED_NOT_RUNNING'&&
  (!s.media_studio||(s.media_studio.source==='MEDIA_STUDIO_ROLE_REGISTRY_DESIGN_ONLY'&&s.media_studio.runtime_verified===false&&Number.isSafeInteger(s.media_studio.total_roles)&&s.media_studio.total_roles>=0))&&
  typeof s.observed_at==='string'&&Number.isFinite(Date.parse(s.observed_at))&&
  Array.isArray(s.sources)&&s.sources.length>=3&&s.sources.length<=25&&
  !!s.roles&&Array.isArray(s.roles.entries)&&s.roles.declared_role_profiles===s.roles.entries.length&&
  s.roles.entries.length<=200&&s.roles.active_agent_count===null&&s.roles.verified_subagent_count===null&&
  !!s.control&&s.control.pause==='NOT_CONNECTED'&&s.control.resume==='NOT_CONNECTED'&&
  s.control.prioritize==='NOT_CONNECTED'&&s.control.staging_status==='SUSPENDED_BY_OWNER';
}
export async function readFleetLab(signal?:AbortSignal):Promise<FleetRead>{
 if(typeof window==='undefined'||!HOST.test(window.location.hostname)||new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3')
  return no('denied','PREVIEW_ONLY');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return no('denied','OWNER_SESSION_REQUIRED');
 try{
  const r=await fetch('/api/cerebro-fleet-observe?company_id=fenix',{method:'GET',cache:'no-store',signal,
   headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,Accept:'application/json'}});
  if(r.status===401||r.status===403)return no('denied','OWNER_DENIED');
  if(r.status!==200)return no('unavailable','FLEET_UPSTREAM_UNAVAILABLE');
  const data:unknown=await r.json();
  return validate(data)?{kind:'ready',snapshot:data,reason:''}:no('unavailable','FLEET_CONTRACT_INVALID');
 }catch{return no('unavailable','FLEET_NETWORK_UNAVAILABLE')}
}
export type FleetQuestion={kind:'query'}|{kind:'control';action:'PAUSE'|'RESUME'|'PRIORITIZE';engine:string|null};
export function classifyFleetQuestion(input:string):FleetQuestion|null{
 const s=input.trim().toLowerCase();
 if(!s||s.length>4000)return null;
 const m=s.match(/(?:^|\s)(pausar|pausa|detener|reanudar|reactivar|reactiva|activar|acelerar|acelera|priorizar|prioriza|arrancar)(?:\s|$)/);
 if(m){
  const v=m[1],a=/paus|deten/.test(v)?'PAUSE':/reanud|reactiv|activar|arrancar/.test(v)?'RESUME':'PRIORITIZE';
  return{kind:'control',action:a,engine:input.toUpperCase().match(/\b[A-Z]{2,12}-\d{3}\b/)?.[0]||null};
 }
 return /agentes?|subagentes?|motores?|workers?|cloudflare|trabajos?|workflow|ejecuciones?|departamentos?|plataformas?|cu[aá]ntos?|inventario|actividad|qu[eé].*(?:haciendo|trabajando)|(?:estado|situaci[oó]n).*cerebro/i.test(s)?{kind:'query'}:null;
}
export function answerFleetQuestion(result:FleetRead,question:FleetQuestion):string{
 if(question.kind==='control'){
  if(/staging|prod/i.test(question.engine||''))return 'BLOQUEADO: el objetivo protegido no admite órdenes desde LAB.';
  const target=question.engine||'SIN OBJETIVO EXACTO';
  return 'ORDEN NO EJECUTADA: '+question.action+' '+target+'. No hay un adaptador de control propietario acreditado para pausar, reactivar o modificar prioridades. Faltan contrato de control, identidad, snapshot, pruebas, confirmación, auditoría y rollback. Staging sigue suspendida.';
 }
 if(result.kind!=='ready'||!result.snapshot)return 'No puedo consultar el inventario ahora ('+result.reason+'). Ningún dato anterior se presenta como actual.';
 const s=result.snapshot;
 const connected=s.sources.filter(x=>x.state==='LIVE');
 const active=connected.reduce((n,x)=>n+Number(x.active_in_sample||0),0);
 const missing=s.sources.filter(x=>x.state!=='LIVE');
 const studio=s.media_studio?' La productora tiene '+s.media_studio.total_roles+' funciones de rol definidas ('+s.media_studio.departments+' departamentos, '+s.media_studio.specialists+' especialistas), sin evidencia de ejecución.':'';
 return 'Comprobación '+new Date(s.observed_at).toLocaleString('es-ES')+
  ': '+s.roles.declared_role_profiles+' perfiles especializados documentados; agentes vivos y subagentes: SIN CENSO VERIFICADO.'+studio+' '+
  s.engine_registry_count+' motores definidos, no ejecutándose necesariamente. '+
  connected.length+' fuentes de actividad GitHub conectadas; '+active+' ejecuciones de workflow en curso entre las muestras observadas (NO equivale a agentes activos). '+
  missing.length+' fuentes sin lectura acreditada. Consulta la pestaña Control para ver qué servicio falta y las ejecuciones concretas.';
}
