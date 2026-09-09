import {useEffect} from 'react';
import {IS_PRODUCTION,fetchAppApi,fetchEnvironmentApi} from './supabase';

type SessionContext={actor_code?:string;role?:string};
type Workspace={lifecycle?:{effective_stage?:string;recorded_stage?:string};expediente?:Record<string,unknown>};
type BackfillResult={ok?:boolean;processed?:number;succeeded?:number;failed?:number;remaining?:number};

const BLOCKED_STAGES=new Set(['firmado','cerrado','cierre','finalizado','baja','perdido','pausado']);
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const allowedRole=(role:unknown)=>['direccion','financiero'].includes(normalize(role));
const allowedStage=(stage:unknown)=>!BLOCKED_STAGES.has(normalize(stage));

export default function ExpedienteExistingBackfillGuard({expedienteCode}:{expedienteCode:string}){
 useEffect(()=>{
  if(!IS_PRODUCTION||!expedienteCode)return;
  let cancelled=false;
  void (async()=>{
   const [ctx,workspace]=await Promise.all([
    fetchAppApi<SessionContext>('/session/context'),
    fetchAppApi<Workspace>(`/expedientes/${encodeURIComponent(expedienteCode)}/workspace`)
   ]);
   if(cancelled||ctx.status!==200||workspace.status!==200||!allowedRole(ctx.data?.role))return;
   const stage=workspace.data?.lifecycle?.effective_stage||workspace.data?.lifecycle?.recorded_stage||workspace.data?.expediente?.stage;
   if(!allowedStage(stage))return;
   let previousRemaining=Number.POSITIVE_INFINITY;
   for(let batch=0;batch<16&&!cancelled;batch++){
    const result=await fetchEnvironmentApi<BackfillResult>('fenix-document-existing-backfill','',{
     method:'POST',body:JSON.stringify({expediente_code:expedienteCode})
    });
    if(result.status!==200||!result.data?.ok)break;
    const remaining=Math.max(0,Number(result.data.remaining)||0);
    const processed=Math.max(0,Number(result.data.processed)||0);
    if(remaining===0||processed===0||remaining>=previousRemaining)break;
    previousRemaining=remaining;
   }
  })().catch(()=>undefined);
  return()=>{cancelled=true};
 },[expedienteCode]);
 return null;
}
