import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

type BackfillResponse={ok?:boolean;processed?:number;succeeded?:number;failed?:number;remaining?:number;skipped?:Array<{file?:string;error?:string}>;items?:Array<{file?:string;ok?:boolean;error?:string}>;error?:string};

const sleep=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));

function rawExpediente(pathname:string){
 const match=pathname.match(/^\/expedientes\/([^/?#]+)\/?$/i);
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

async function authenticatedHeaders(){
 for(let attempt=0;attempt<10;attempt++){
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.access_token)return{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'};
  await sleep(250+attempt*100);
 }
 return null;
}

export default function ExistingDocumentAutoBackfillGuard(){
 const location=useLocation();
 const running=useRef('');

 useEffect(()=>{
  if(!IS_PRODUCTION)return;
  const raw=rawExpediente(location.pathname);
  if(!raw||running.current===raw)return;
  let cancelled=false;

  const run=async()=>{
   try{
    const headers=await authenticatedHeaders();
    if(cancelled||!headers)return;
    const detail=await fetch(`${SUPABASE_URL}/functions/v1/fenix-app-gateway/expedientes/${encodeURIComponent(raw)}`,{method:'GET',headers});
    const detailData=await detail.json().catch(()=>null) as Record<string,unknown>|null;
    const row=(detailData?.expediente&&typeof detailData.expediente==='object'?detailData.expediente:detailData?.item&&typeof detailData.item==='object'?detailData.item:null) as Record<string,unknown>|null;
    const expCode=String(row?.expediente_code??row?.expediente??raw).trim();
    if(cancelled||!detail.ok||!expCode)return;
    running.current=raw;

    let totalProcessed=0,totalSucceeded=0,lastSkipped=0;
    for(let pass=0;pass<8&&!cancelled;pass++){
     const response=await fetch(`${SUPABASE_URL}/functions/v1/fenix-document-existing-backfill`,{method:'POST',headers,body:JSON.stringify({expediente_code:expCode})});
     const data=await response.json().catch(()=>null) as BackfillResponse|null;
     if(!response.ok||data?.ok!==true){
      if(response.status>=500||response.status===429){await sleep(900*(pass+1));continue;}
      running.current='';
      return;
     }
     const processed=Number(data.processed)||0,succeeded=Number(data.succeeded)||0,failed=Number(data.failed)||0,remaining=Number(data.remaining)||0;
     lastSkipped=Array.isArray(data.skipped)?data.skipped.length:0;
     totalProcessed+=processed;totalSucceeded+=succeeded;
     if(processed>0)statusBox(`Organizando y leyendo documentos automáticamente · ${totalSucceeded}/${totalProcessed} correctos…`);
     if(remaining<=0&&failed<=0)break;
     if(processed===0&&remaining<=0)break;
     await sleep(failed>0?1200:350);
    }
    if(cancelled||totalProcessed===0)return;
    window.dispatchEvent(new CustomEvent('fenix:document-backfill-finished',{detail:{expedienteCode:expCode,processed:totalProcessed,succeeded:totalSucceeded,skipped:lastSkipped}}));
    if(totalSucceeded===totalProcessed&&lastSkipped===0){
     statusBox(`${totalSucceeded} documento${totalSucceeded===1?'':'s'} leído${totalSucceeded===1?'':'s'} y colocado${totalSucceeded===1?'':'s'} automáticamente.`,'ok');
     await sleep(650);
     if(!cancelled)window.location.reload();
    }else{
     running.current='';
     statusBox(`Documentos automáticos: ${totalSucceeded}/${totalProcessed} correctos${lastSkipped?` · ${lastSkipped} por revisar`:''}.`,'error');
    }
   }catch{running.current='';}
  };
  void run();
  return()=>{cancelled=true;};
 },[location.pathname]);

 return null;
}
