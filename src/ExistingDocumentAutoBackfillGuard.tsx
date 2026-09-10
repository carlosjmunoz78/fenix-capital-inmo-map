import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

type BackfillResponse={ok?:boolean;processed?:number;succeeded?:number;failed?:number;remaining?:number;skipped?:Array<{file?:string;error?:string}>;items?:Array<{file?:string;ok?:boolean;error?:string}>;error?:string};
type ExpedienteListResponse={ok?:boolean;items?:Array<{expediente_code?:string;stage?:string}>};

const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));
const canonicalExpediente=(value:string)=>/^exp(?:-|_)/i.test(value);
const ROOT_SWEEP='__all_active_expedientes__';
const TERMINAL_STAGES=new Set(['firmado','cerrado','cierre','finalizado','baja','perdido','pausado']);
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

function rawExpediente(pathname:string){
 if(/^\/expedientes\/?$/i.test(pathname))return ROOT_SWEEP;
 const match=pathname.match(/^\/expedientes\/([^/?#]+)(?:\/|$)/i);
 if(!match?.[1])return '';
 const value=decodeURIComponent(match[1]);
 return ['nuevo','nueva'].includes(value.toLowerCase())?'':value;
}

function statusBox(message:string,kind:'working'|'ok'|'error'='working'){
 let box=document.getElementById('fenix-auto-backfill-status');
 if(!box){
  box=document.createElement('div');
  box.id='fenix-auto-backfill-status';
  box.setAttribute('role','status');
  Object.assign(box.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'12040',maxWidth:'430px',padding:'12px 14px',borderRadius:'12px',background:'var(--surface,#202023)',color:'var(--text,#fff)',border:'1px solid var(--border,#444)',boxShadow:'0 16px 46px rgba(0,0,0,.28)',fontWeight:'700'});
  document.body.appendChild(box);
 }
 box.dataset.kind=kind;
 box.textContent=message;
 if(kind==='ok')window.setTimeout(()=>box?.remove(),1800);
}

async function authenticatedHeaders(cancelled:()=>boolean){
 for(let attempt=0;attempt<12&&!cancelled();attempt++){
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.access_token)return{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'};
  await sleep(250+attempt*100);
 }
 return null;
}

async function resolveExpedienteCodes(raw:string,headers:Record<string,string>){
 if(raw===ROOT_SWEEP){
  const response=await fetch(`${SUPABASE_URL}/functions/v1/fenix-app-gateway/expedientes`,{method:'GET',headers});
  const data=await response.json().catch(()=>null) as ExpedienteListResponse|null;
  if(!response.ok||data?.ok!==true||!Array.isArray(data.items))return [];
  return [...new Set(data.items
   .filter(item=>!TERMINAL_STAGES.has(normalize(item?.stage)))
   .map(item=>String(item?.expediente_code??'').trim())
   .filter(code=>canonicalExpediente(code)))];
 }
 if(canonicalExpediente(raw))return [raw];
 const detail=await fetch(`${SUPABASE_URL}/functions/v1/fenix-app-gateway/expedientes/${encodeURIComponent(raw)}`,{method:'GET',headers});
 const detailData=await detail.json().catch(()=>null) as Record<string,unknown>|null;
 const row=(detailData?.expediente&&typeof detailData.expediente==='object'?detailData.expediente:detailData?.item&&typeof detailData.item==='object'?detailData.item:null) as Record<string,unknown>|null;
 if(!detail.ok)return [];
 const code=String(row?.expediente_code??row?.expediente??'').trim();
 return canonicalExpediente(code)?[code]:[];
}

export default function ExistingDocumentAutoBackfillGuard(){
 const location=useLocation();
 const completed=useRef('');

 useEffect(()=>{
  if(!IS_PRODUCTION)return;
  const raw=rawExpediente(location.pathname);
  if(!raw||completed.current===raw)return;
  let cancelled=false;
  let starting=false;
  let retryTimer:number|undefined;
  let attempts=0;
  const maxAttempts=8;

  const scheduleRetry=(delay=1800)=>{
   if(cancelled||completed.current===raw||attempts>=maxAttempts||retryTimer!==undefined)return;
   retryTimer=window.setTimeout(()=>{retryTimer=undefined;void run();},delay);
  };

  const run=async()=>{
   if(cancelled||starting||completed.current===raw||attempts>=maxAttempts)return;
   starting=true;
   attempts+=1;
   try{
    const headers=await authenticatedHeaders(()=>cancelled);
    if(cancelled||!headers){scheduleRetry();return;}
    const expCodes=await resolveExpedienteCodes(raw,headers);
    if(cancelled||!expCodes.length){scheduleRetry();return;}

    let totalProcessed=0,totalSucceeded=0,totalSkipped=0,totalFailed=0,totalRemaining=0;
    for(const expCode of expCodes){
     if(cancelled)break;
     let previousRemaining=Number.POSITIVE_INFINITY;
     for(let pass=0;pass<8&&!cancelled;pass++){
      const response=await fetch(`${SUPABASE_URL}/functions/v1/fenix-document-existing-backfill`,{method:'POST',headers,body:JSON.stringify({expediente_code:expCode})});
      const data=await response.json().catch(()=>null) as BackfillResponse|null;
      if(!response.ok||data?.ok!==true){
       if(response.status>=500||response.status===429){await sleep(900*(pass+1));continue;}
       totalFailed+=1;
       break;
      }
      const processed=Number(data.processed)||0,succeeded=Number(data.succeeded)||0,failed=Number(data.failed)||0,remaining=Number(data.remaining)||0;
      const skipped=Array.isArray(data.skipped)?data.skipped.length:0;
      totalProcessed+=processed;
      totalSucceeded+=succeeded;
      totalFailed+=failed;
      totalSkipped+=skipped;
      totalRemaining+=remaining;
      if(processed>0)statusBox(`Organizando y leyendo documentos automáticamente · ${totalSucceeded}/${totalProcessed} correctos…`);
      if(remaining<=0&&failed<=0)break;
      if(processed===0||remaining>=previousRemaining)break;
      previousRemaining=remaining;
      await sleep(failed>0?1200:350);
     }
    }

    if(cancelled)return;
    if(totalProcessed===0){
     if(totalRemaining===0&&totalFailed===0&&totalSkipped===0)completed.current=raw;
     else scheduleRetry();
     return;
    }

    window.dispatchEvent(new CustomEvent('fenix:document-backfill-finished',{detail:{expedienteCode:raw===ROOT_SWEEP?'all-active':expCodes[0],processed:totalProcessed,succeeded:totalSucceeded,skipped:totalSkipped}}));
    if(totalSucceeded===totalProcessed&&totalFailed===0&&totalSkipped===0){
     completed.current=raw;
     statusBox(`${totalSucceeded} documento${totalSucceeded===1?'':'s'} leído${totalSucceeded===1?'':'s'} y colocado${totalSucceeded===1?'':'s'} automáticamente.`,'ok');
     await sleep(650);
     if(!cancelled)window.location.reload();
    }else{
     statusBox(`Documentos automáticos: ${totalSucceeded}/${totalProcessed} correctos${totalSkipped?` · ${totalSkipped} por revisar`:''}.`,'error');
     scheduleRetry(2200);
    }
   }catch{
    scheduleRetry();
   }finally{
    starting=false;
   }
  };

  void run();
  const trigger=()=>{
   if(cancelled||completed.current===raw)return;
   attempts=0;
   void run();
  };
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(cancelled||!session?.access_token||completed.current===raw)return;
   attempts=0;
   void run();
  });
  window.addEventListener('focus',trigger);
  document.addEventListener('visibilitychange',trigger);

  return()=>{
   cancelled=true;
   if(retryTimer!==undefined)window.clearTimeout(retryTimer);
   subscription.unsubscribe();
   window.removeEventListener('focus',trigger);
   document.removeEventListener('visibilitychange',trigger);
  };
 },[location.pathname]);

 return null;
}
