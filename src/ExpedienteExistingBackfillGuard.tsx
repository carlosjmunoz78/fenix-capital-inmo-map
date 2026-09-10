import {useEffect} from 'react';
import {IS_PRODUCTION,fetchAppApi,fetchEnvironmentApi,supabase} from './supabase';

type SessionContext={actor_code?:string;role?:string};
type Detail={expediente?:Record<string,unknown>;item?:Record<string,unknown>;stage?:string;expediente_code?:string};
type Workspace={lifecycle?:{effective_stage?:string;recorded_stage?:string};expediente?:Record<string,unknown>};
type BackfillResult={ok?:boolean;processed?:number;succeeded?:number;failed?:number;remaining?:number};

const BLOCKED_STAGES=new Set(['firmado','cerrado','cierre','finalizado','baja','perdido','pausado']);
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const allowedRole=(role:unknown)=>['direccion','financiero'].includes(normalize(role));
const allowedStage=(stage:unknown)=>!BLOCKED_STAGES.has(normalize(stage));
const looksCanonicalExpediente=(value:string)=>/^exp-/i.test(value.trim());
const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));

async function waitForAuthenticatedSession(cancelled:()=>boolean){
 for(let attempt=0;attempt<12&&!cancelled();attempt++){
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.access_token)return session;
  await sleep(250);
 }
 return null;
}

function sessionRole(session:Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']){
 const metadata=session?.user?.user_metadata as Record<string,unknown>|undefined;
 const direct=metadata?.role;
 if(typeof direct==='string'&&direct.trim())return direct;
 const actor=typeof metadata?.actor_code==='string'?metadata.actor_code:'';
 if(actor==='CARLOS-ADMIN'||actor==='DIR-TEST')return 'Dirección';
 if(actor.startsWith('FIN-'))return 'Financiero';
 return '';
}

export default function ExpedienteExistingBackfillGuard({expedienteCode}:{expedienteCode:string}){
 useEffect(()=>{
  if(!IS_PRODUCTION||!expedienteCode)return;
  let cancelled=false;
  let inFlight=false;
  const run=async()=>{
   if(cancelled||inFlight)return;
   inFlight=true;
   try{
    const session=await waitForAuthenticatedSession(()=>cancelled);
    if(cancelled||!session)return;

    const ctx=await fetchAppApi<SessionContext>('/session/context');
    const effectiveRole=ctx.status===200?ctx.data?.role:sessionRole(session);
    if(!allowedRole(effectiveRole))return;

    let canonicalCode=expedienteCode.trim();
    let row:Record<string,unknown>|null=null;
    if(!looksCanonicalExpediente(canonicalCode)){
     const detail=await fetchAppApi<Detail>(`/expedientes/${encodeURIComponent(expedienteCode)}`);
     if(cancelled||detail.status!==200)return;
     row=(detail.data?.expediente&&typeof detail.data.expediente==='object'?detail.data.expediente:detail.data?.item&&typeof detail.data.item==='object'?detail.data.item:detail.data) as Record<string,unknown>|null;
     canonicalCode=String(row?.expediente_code??row?.expediente??'').trim();
    }
    if(!canonicalCode)return;

    const workspace=await fetchAppApi<Workspace>(`/expedientes/${encodeURIComponent(canonicalCode)}/workspace`);
    if(cancelled||workspace.status!==200)return;
    const stage=workspace.data?.lifecycle?.effective_stage||workspace.data?.lifecycle?.recorded_stage||workspace.data?.expediente?.stage||row?.stage;
    if(!allowedStage(stage))return;

    let previousRemaining=Number.POSITIVE_INFINITY;
    for(let batch=0;batch<16&&!cancelled;batch++){
     const result=await fetchEnvironmentApi<BackfillResult>('fenix-document-existing-backfill','',{
      method:'POST',body:JSON.stringify({expediente_code:canonicalCode})
     });
     if(result.status!==200||!result.data?.ok)break;
     const remaining=Math.max(0,Number(result.data.remaining)||0);
     const processed=Math.max(0,Number(result.data.processed)||0);
     if(remaining===0||processed===0||remaining>=previousRemaining)break;
     previousRemaining=remaining;
    }
   }finally{
    inFlight=false;
   }
  };
  void run().catch(()=>undefined);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(cancelled||!session?.access_token)return;
   if(event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED')void run().catch(()=>undefined);
  });
  return()=>{cancelled=true;subscription.unsubscribe()};
 },[expedienteCode]);
 return null;
}
