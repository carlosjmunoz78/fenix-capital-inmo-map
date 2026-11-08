import {useState} from 'react';
import {fetchJarvisRepoHead, inspectJarvisGit, type JarvisGitInspectOperation} from './jarvisWorkApi';

const ACTIONS:ReadonlyArray<{operation:JarvisGitInspectOperation;label:string}>=Object.freeze([
  {operation:'STATUS',label:'Estado Git'},
  {operation:'DIFF',label:'Diff Git'},
  {operation:'CI_READ',label:'CI Git'},
  {operation:'COMPARE',label:'vs main'},
]);
type State={status:'idle'|'checking'|'queued'|'failed';label:string;jobId?:string};

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
      if(head.data?.branch!=='cerebro/jarvis-core-prod-candidate-20261103'){
        setState({status:'failed',label:'Rama distinta a la autorizada. Operación bloqueada.'});
        return;
      }
      const result=await inspectJarvisGit({operation,expected_head_sha:sha});
      const jobId=result.data?.job?.job_id;
      if(result.status===202&&result.data?.status==='QUEUED'&&jobId){
        setState({status:'queued',label:'Solicitud de solo lectura en cola. No significa ejecutada; requiere consumidor autorizado activo.',jobId});
      }else{
        setState({status:'failed',label:result.status===401||result.status===403?'Acceso denegado por identidad o permisos.':'No se ha confirmado la solicitud. No se asume ejecución.'});
      }
    }catch{
      setState({status:'failed',label:'Conexión fallida. No se asume que exista una ejecución.'});
    }
  }
  return <section aria-label="Git · consultas de solo lectura" style={{gridColumn:'1 / -1',display:'grid',gap:8,padding:'12px',border:'1px solid rgba(255,255,255,.14)',borderRadius:10}}>
    <strong>Git · solo lectura</strong>
    <div role="group" aria-label="Operaciones Git de solo lectura" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {ACTIONS.map(item=><button type="button" key={item.operation} disabled={state.status==='checking'} onClick={()=>void request(item.operation)}>{item.label}</button>)}
    </div>
    <div role="status" aria-live="polite">{state.label}</div>
    {state.jobId?<small>Trabajo: {state.jobId} · pendiente de verificación independiente</small>:null}
  </section>;
}
