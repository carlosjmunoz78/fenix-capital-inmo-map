import {useEffect,useMemo,useState} from 'react';
import {fetchNotionRuntime} from './notionRuntime';

type Row=Record<string,unknown>;
type LoadState={status:number|null;rows:Row[]};
export type DirectionPriority={id:string;title:string;reason:string;due:string;state:string;route:string;action:string;severity:'critical'|'high'|'normal'};
export type DirectionLiveStatus={expedientes:number|null;firmas:number|null;tareas:number|null};
export type DirectionLiveSnapshot={openExp:number;riskExp:number;riskSupported:boolean;firmasMes:number;signedMes:number;priorities:DirectionPriority[];expedientesReady:boolean;firmasReady:boolean;tareasReady:boolean;statuses:DirectionLiveStatus};

function rowsFrom(data:unknown):Row[]{
 if(!data||typeof data!=='object')return[];
 const d=data as Record<string,unknown>;
 for(const k of ['items','expedientes','firmas','tareas'])if(Array.isArray(d[k]))return d[k] as Row[];
 return[];
}
function text(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function bool(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='boolean')return v;if(typeof v==='string'&&/^(si|sí|true|1)$/i.test(v.trim()))return true;}return false;}
function hasAny(r:Row,keys:string[]){return keys.some(k=>Object.prototype.hasOwnProperty.call(r,k));}
function taskId(r:Row){return text(r,['id','tarea_id','tarea_code','code']);}
function taskTitle(r:Row){return text(r,['tarea','titulo','título','nombre','title']);}
function taskState(r:Row){return text(r,['estado','status'])||'Pendiente';}
function taskDueRaw(r:Row){return text(r,['fecha_limite','fecha_límite','vencimiento','fecha','due_date']);}
function taskDone(r:Row){return bool(r,['completada','completado','done'])||/complet|cerrad|hecha/i.test(taskState(r));}
function expState(r:Row){return text(r,['estado','fase','phase','stage','status']);}
function expRisk(r:Row){return text(r,['riesgo','risk','nivel_riesgo']);}
export function isOpenDirectionExpediente(r:Row){const s=expState(r);return !/firmad|cerrad|anulad|cancelad|pasado|desistid/i.test(s);}
export function isExplicitRiskDirectionExpediente(r:Row){const risk=expRisk(r);return /alto|cr[ií]tic|riesgo|bloquead/i.test(risk);}
function firmaId(r:Row){return text(r,['id','firma_id','firma_code','code']);}
function firmaExp(r:Row){return text(r,['expediente_code','expediente','operacion','operación']);}
function firmaState(r:Row){return text(r,['estado','estado_firma','status']);}
function firmaDate(r:Row){return text(r,['fecha_hora_firma','fecha_firma','fecha','fecha_fein']);}
export function isSignedDirectionFirma(r:Row){return /firmad|complet|cerrad/i.test(firmaState(r));}
export function isThisMonthDirectionDate(value:string){if(!value)return false;const d=new Date(value.replace(' ','T'));if(Number.isNaN(d.getTime()))return false;const now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}
export function isPlannedThisMonthDirectionFirma(r:Row){return !isSignedDirectionFirma(r)&&isThisMonthDirectionDate(firmaDate(r));}
function dateLabel(value:string){if(!value)return'Sin fecha visible';const d=new Date(value.replace(' ','T'));return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);}
function taskScope(r:Row){const type=text(r,['scope_type']);const code=text(r,['scope_code']);return{type,code};}
function taskRoute(r:Row){const id=taskId(r);return id?`/tareas/${encodeURIComponent(id)}`:'/agenda';}
function taskPriority(r:Row):DirectionPriority{
 const {type,code}=taskScope(r),state=taskState(r),rawDue=taskDueRaw(r),visibleTitle=taskTitle(r);
 const scoped=type==='expediente'&&code?`Expediente ${code}`:type==='inmobiliaria'&&code?`Inmobiliaria ${code}`:code||'Tarea pendiente';
 const title=visibleTitle||`Revisar ${scoped}`;
 const dueTime=rawDue?new Date(rawDue.replace(' ','T')).getTime():Number.NaN;
 const overdue=rawDue&&!Number.isNaN(dueTime)&&dueTime<Date.now();
 const reason=rawDue?`${overdue?'Vencida':'Pendiente'} · ${dateLabel(rawDue)} · ${state}`:`${state}. La fuente no expone una fecha límite.`;
 return{id:taskId(r),title,reason,due:dateLabel(rawDue),state,route:taskRoute(r),action:'Abrir tarea',severity:overdue?'high':'normal'};
}
function firmaBlockingReasons(r:Row){const flags:[string,string][]=[['documentacion_preparada','documentación'],['banco_confirmado','confirmación del banco'],['cliente_confirmado','confirmación del cliente'],['forma_pago_preparada','forma de pago'],['acta_transparencia','acta de transparencia']];return flags.filter(([k])=>Object.prototype.hasOwnProperty.call(r,k)&&r[k]===false).map(([,label])=>label);}
function firmaPriority(r:Row):DirectionPriority{
 const id=firmaId(r),exp=firmaExp(r)||id||'sin código',when=dateLabel(firmaDate(r)),missing=firmaBlockingReasons(r);
 return{id,title:`Preparar firma ${exp}`,reason:missing.length?`Firma prevista ${when}. Falta ${missing.join(', ')}.`:`Firma prevista ${when}. Requiere revisión antes del cierre.`,due:when,state:firmaState(r)||'Prevista',route:id?`/firmas/${encodeURIComponent(id)}`:'/firmas?firma=mes-actual&estado=prevista',action:'Revisar firma',severity:missing.length?'critical':'high'};
}
function riskPriority(r:Row):DirectionPriority{
 const code=text(r,['expediente_code','code','codigo','id']),risk=expRisk(r)||'Riesgo explícito';
 return{id:code,title:`Revisar expediente ${code||'en riesgo'}`,reason:`La fuente marca ${risk}.`,due:'Atención inmediata',state:risk,route:code?`/expedientes/${encodeURIComponent(code)}`:'/expedientes?riesgo=si',action:'Abrir expediente',severity:'critical'};
}

export function useDirectionLiveData(){
 const[exp,setExp]=useState<LoadState>({status:null,rows:[]});
 const[fir,setFir]=useState<LoadState>({status:null,rows:[]});
 const[tasks,setTasks]=useState<LoadState>({status:null,rows:[]});
 useEffect(()=>{let alive=true;(async()=>{
  const[e,f,t]=await Promise.all([
   fetchNotionRuntime<unknown>('/expedientes').catch(()=>({status:0,data:null})),
   fetchNotionRuntime<unknown>('/firmas').catch(()=>({status:0,data:null})),
   fetchNotionRuntime<unknown>('/tareas').catch(()=>({status:0,data:null}))
  ]);
  if(!alive)return;
  setExp({status:e.status,rows:e.status===200?rowsFrom(e.data):[]});
  setFir({status:f.status,rows:f.status===200?rowsFrom(f.data):[]});
  setTasks({status:t.status,rows:t.status===200?rowsFrom(t.data):[]});
 })();return()=>{alive=false};},[]);
 useEffect(()=>{
  const detail:DirectionLiveStatus={expedientes:exp.status,firmas:fir.status,tareas:tasks.status};
  window.dispatchEvent(new CustomEvent<DirectionLiveStatus>('fenix-direction-live-status',{detail}));
 },[exp.status,fir.status,tasks.status]);
 const data=useMemo(()=>{
  const openExp=exp.rows.filter(isOpenDirectionExpediente).length;
  const riskSupported=exp.rows.some(r=>hasAny(r,['riesgo','risk','nivel_riesgo']));
  const riskExp=riskSupported?exp.rows.filter(isExplicitRiskDirectionExpediente).length:0;
  const firmasMes=fir.rows.filter(isPlannedThisMonthDirectionFirma).length;
  const signedMes=fir.rows.filter(r=>isSignedDirectionFirma(r)&&isThisMonthDirectionDate(firmaDate(r))).length;
  const signaturePriorities=fir.rows.filter(isPlannedThisMonthDirectionFirma).map(firmaPriority);
  const riskPriorities=riskSupported?exp.rows.filter(isExplicitRiskDirectionExpediente).map(riskPriority):[];
  const taskPriorities=tasks.rows.filter(r=>!taskDone(r)).map(taskPriority).sort((a,b)=>{const rank={critical:0,high:1,normal:2};const d=rank[a.severity]-rank[b.severity];return d||a.due.localeCompare(b.due,'es');});
  const priorities:DirectionPriority[]=[...signaturePriorities,...riskPriorities,...taskPriorities].sort((a,b)=>{const rank={critical:0,high:1,normal:2};return rank[a.severity]-rank[b.severity];}).slice(0,3);
  return{openExp,riskExp,riskSupported,firmasMes,signedMes,priorities};
 },[exp.rows,fir.rows,tasks.rows]);
 const snapshot:DirectionLiveSnapshot={
  ...data,
  expedientesReady:exp.status===200,
  firmasReady:fir.status===200,
  tareasReady:tasks.status===200,
  statuses:{expedientes:exp.status,firmas:fir.status,tareas:tasks.status}
 };
 useEffect(()=>{window.dispatchEvent(new CustomEvent<DirectionLiveSnapshot>('fenix-direction-live-data',{detail:snapshot}));},[snapshot.openExp,snapshot.riskExp,snapshot.riskSupported,snapshot.firmasMes,snapshot.signedMes,snapshot.priorities,snapshot.expedientesReady,snapshot.firmasReady,snapshot.tareasReady,snapshot.statuses.expedientes,snapshot.statuses.firmas,snapshot.statuses.tareas]);
 return snapshot;
}
