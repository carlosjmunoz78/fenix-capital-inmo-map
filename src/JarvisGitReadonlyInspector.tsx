import {useEffect,useState} from 'react';
import {fetchJarvisRepoHead, fetchJarvisWorkJob, inspectJarvisGit, type JarvisGitInspectOperation} from './jarvisWorkApi';
import {IS_PRODUCTION} from './supabase';
const EXPECTED_BRANCH=IS_PRODUCTION?'cerebro/jarvis-core-prod-candidate-20261103':'cerebro/jarvis-work-codex-complete-20261102';
const EXPECTED_ENVIRONMENT=IS_PRODUCTION?'PROD':'PREPROD';
const SUCCESS_PROOFS=new Set(['GIT_SAFE_PROD_CONTROL_GREEN','GIT_SAFE_PREPROD_GREEN']);

const ACTIONS:ReadonlyArray<{operation:JarvisGitInspectOperation;label:string}>=Object.freeze([
  {operation:'STATUS',label:'Estado Git'},
  {operation:'DIFF',label:'Diff Git'},
  {operation:'CI_READ',label:'CI Git'},
  {operation:'COMPARE',label:'vs main'},
]);
type State={status:'idle'|'checking'|'queued'|'failed'|'succeeded';label:string;jobId?:string;operation?:JarvisGitInspectOperation};

export default function JarvisGitReadonlyInspector(){
  const [state,setState]=useState<State>({status:'idle',label:'Consultas Git gobernadas. Ninguna acción escribe en el repositorio.'});

  async function request(operation:JarvisGitInspectOperation){
    if(state.status==='checking')return;
    setState({status:'checking',label:'Comprobando identidad y SHA inmutable…'});
    try{
      const head=await fetchJarvisRepoHead();
      const sha=head.data?.head_sha;
      if(head.status!==200||!sha||!/^[a-f0-9]{40}$/i.test(sha)){
        setState({status:'failed',label:'No se pudo verificar la rama segura. No se ha enviado ninguna operación.'});
        return;
      }
      if(head.data?.branch!==EXPECTED_BRANCH||head.data?.environment!==EXPECTED_ENVIRONMENT){
        setState({status:'failed',label:'Rama o entorno distinto al autorizado. Operación bloqueada.'});
        return;
      }
      const result=await inspectJarvisGit({operation,expected_head_sha:sha});
      const jobId=result.data?.job?.job_id;
      if(result.status===202&&result.data?.status==='QUEUED'&&jobId){
        setState({status:'queued',label:'Solicitud en cola. Aún NO ejecutada ni validada.',jobId,operation});
      }else{
        setState({status:'failed',label:result.status===401||result.status===403?'Acceso denegado por identidad o permisos.':'Solicitud no confirmada. No se asume ejecución.'});
      }
    }catch{
      setState({status:'failed',label:'Conexión fallida. No se asume ejecución.'});
    }
  }

  async function verify(jobId:string,operation?:JarvisGitInspectOperation){
    try{
      const response=await fetchJarvisWorkJob(jobId);
      if(response.status!==200||!response.data?.job||response.data.job.job_id!==jobId){
        setState(old=>old.jobId===jobId?{...old,label:'Resultado no verificable en el Gateway. No se asume éxito.'}:old);
        return false;
      }
      const job=response.data.job;
      if(job.status==='SUCCEEDED'){
        const proof=job.result_summary?.status;
        const evidenceOk=SUCCESS_PROOFS.has(String(proof||''))&&job.result_summary?.prod_touched===false&&job.result_summary?.trading_touched===false;
        setState(old=>old.jobId===jobId?{...old,status:evidenceOk?'succeeded':'failed',label:evidenceOk?('Git '+String(operation||'')+' ejecutado y verificado con evidencia '+proof+'.'):'Trabajo completado sin evidencia de control válida. Revisión necesaria.'}:old);
        return true;
      }
      if(['FAILED','CANCELLED','CANCELED','DEAD_LETTER'].includes(job.status)){
        setState(old=>old.jobId===jobId?{...old,status:'failed',label:'Trabajo finalizado sin éxito ('+job.status+'). No se declara GREEN.'}:old);
        return true;
      }
      setState(old=>old.jobId===jobId?{...old,status:'queued',label:'Git '+String(operation||'')+' · '+job.status+'. En espera; NO es una ejecución completada.'}:old);
      return false;
    }catch{
      setState(old=>old.jobId===jobId?{...old,label:'No se pudo consultar el resultado. Sigue sin verificarse.'}:old);
      return false;
    }
  }

  useEffect(()=>{
    if(state.status!=='queued'||!state.jobId)return;
    let cancelled=false;
    const timers:ReturnType<typeof setTimeout>[]=[];
    const jobId=state.jobId,operation=state.operation;
    const delays=[3000,10000,20000,40000];
    for(let index=0;index<delays.length;index++){
      const t=setTimeout(async()=>{
        if(cancelled)return;
        const terminal=await verify(jobId,operation);
        if(terminal){cancelled=true;for(const timer of timers)clearTimeout(timer)}
      },delays[index]);
      timers.push(t);
    }
    return()=>{cancelled=true;for(const t of timers)clearTimeout(t)};
  // Poll only for a new job, not after each status update. Exactly four bounded GETs.
  },[state.jobId]);

  return <section aria-label="Git · consultas de solo lectura" style={{gridColumn:'1 / -1',display:'grid',gap:8,padding:'12px',border:'1px solid rgba(255,255,255,.14)',borderRadius:10}}>
    <strong>Git · solo lectura</strong>
    <div role="group" aria-label="Operaciones Git de solo lectura" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {ACTIONS.map(item=><button type="button" key={item.operation} disabled={state.status==='checking'} onClick={()=>void request(item.operation)}>{item.label}</button>)}
    </div>
    <div role="status" aria-live="polite">{state.label}</div>
    {state.jobId?<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><small>Trabajo: {state.jobId}</small>{state.status==='queued'?<button type="button" onClick={()=>void verify(state.jobId!,state.operation)}>Comprobar resultado</button>:null}</div>:null}
  </section>;
}
