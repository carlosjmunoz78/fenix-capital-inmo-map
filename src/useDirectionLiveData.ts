import {useEffect,useMemo,useState} from 'react';
import {fetchNotionRuntime} from './notionRuntime';

type Row=Record<string,unknown>;
type LoadState={status:number|null;rows:Row[]};
export type DirectionPriority={id:string;title:string;due:string;state:string};

function rowsFrom(data:unknown):Row[]{
 if(!data||typeof data!=='object')return[];
 const d=data as Record<string,unknown>;
 for(const k of ['items','expedientes','firmas','tareas'])if(Array.isArray(d[k]))return d[k] as Row[];
 return[];
}
function text(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function bool(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='boolean')return v;if(typeof v==='string'&&/^(si|sí|true|1)$/i.test(v.trim()))return true;}return false;}
function idOf(r:Row){return text(r,['id','tarea_id','tarea_code','code']);}
function taskTitle(r:Row){return text(r,['tarea','titulo','título','nombre','title'])||'Tarea sin título visible';}
function taskState(r:Row){return text(r,['estado','status'])||'Sin estado';}
function taskDue(r:Row){return text(r,['fecha_limite','fecha_límite','vencimiento','fecha','due_date'])||'Sin fecha visible';}
function taskDone(r:Row){return bool(r,['completada','completado','done'])||/complet|cerrad|hecha/i.test(taskState(r));}
function expState(r:Row){return text(r,['estado','fase','phase','status']);}
function expRisk(r:Row){return text(r,['riesgo','risk','nivel_riesgo']);}
function isOpenExp(r:Row){const s=expState(r);return !/firmad|cerrad|anulad|cancelad|pasado|desistid/i.test(s);}
function isRisk(r:Row){const risk=expRisk(r);const state=expState(r);return /alto|cr[ií]tic|riesgo|bloquead/i.test(`${risk} ${state}`);}
function firmaState(r:Row){return text(r,['estado','estado_firma','status']);}
function firmaDate(r:Row){return text(r,['fecha_hora_firma','fecha_firma','fecha','fecha_fein']);}
function isSigned(r:Row){return /firmad|complet|cerrad/i.test(firmaState(r));}
function isThisMonth(value:string){if(!value)return false;const d=new Date(value.replace(' ','T'));if(Number.isNaN(d.getTime()))return false;const now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}

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
 const data=useMemo(()=>{
  const openExp=exp.rows.filter(isOpenExp).length;
  const riskExp=exp.rows.filter(isRisk).length;
  const firmasMes=fir.rows.filter(r=>isThisMonth(firmaDate(r))).length;
  const signedMes=fir.rows.filter(r=>isSigned(r)&&isThisMonth(firmaDate(r))).length;
  const priorities:DirectionPriority[]=tasks.rows.filter(r=>!taskDone(r)).slice().sort((a,b)=>taskDue(a).localeCompare(taskDue(b),'es')).slice(0,3).map(r=>({id:idOf(r),title:taskTitle(r),due:taskDue(r),state:taskState(r)}));
  return{openExp,riskExp,firmasMes,signedMes,priorities};
 },[exp.rows,fir.rows,tasks.rows]);
 return{
  ...data,
  expedientesReady:exp.status===200,
  firmasReady:fir.status===200,
  tareasReady:tasks.status===200
 };
}
