import {useState} from 'react';
import {fetchJarvisRepoHead,inspectJarvisGitDirectLab,type JarvisDirectGitRead,type JarvisGitInspectOperation} from './jarvisWorkApi';

const BRANCH='cerebro/jarvis-work-codex-complete-20261102';
const OPERATIONS:ReadonlyArray<{operation:JarvisGitInspectOperation;label:string}>=Object.freeze([
  {operation:'STATUS',label:'Estado remoto'},
  {operation:'DIFF',label:'Diferencias'},
  {operation:'CI_READ',label:'Comprobaciones CI'},
  {operation:'COMPARE',label:'Comparar con main'}
]);
type ViewState={phase:'idle'|'checking'|'done'|'blocked';message:string;data?:JarvisDirectGitRead};
export default function JarvisGitDirectReadonlyLab(){
  const [state,setState]=useState<ViewState>({phase:'idle',message:'LAB: consultas directas de GitHub, sin encolar trabajos ni activar consumidores.'});
  async function run(operation:JarvisGitInspectOperation){
    if(state.phase==='checking')return;
    setState({phase:'checking',message:'Validando la sesión, entorno y SHA de la rama segura.'});
    try{
      const head=await fetchJarvisRepoHead();
      const sha=head.data?.head_sha;
      if(head.status!==200||head.data?.environment!=='PREPROD'||head.data?.branch!==BRANCH||
         !sha||!/^[0-9a-f]{40}$/.test(sha)){
        setState({phase:'blocked',message:'Comprobación de rama y entorno fallida. No se ha solicitado la consulta.'});
        return;
      }
      const live=await inspectJarvisGitDirectLab(operation,sha);
      const data=live.data;
      if(live.status===200&&data?.status==='OK'&&data.proof==='JARVIS_GIT_DIRECT_READONLY_LAB'&&
         data.operation===operation&&data.branch===BRANCH&&
         data.head_sha===sha&&data.environment==='LAB'&&
         data.mode==='IMMEDIATE_READONLY'&&data.job_enqueued===false&&
         data.worker_required===false&&data.git_writes===0&&data.db_writes===0&&data.prod_touched===false){
        setState({phase:'done',message:'Consulta directa completada y verificada. Ningún trabajo fue encolado.',data});
        return;
      }
      if(live.status===409) {
        setState({phase:'blocked',message:'La rama ha cambiado durante la consulta. No hay resultado válido.'});
      }else if(live.status===401||live.status===403){
        setState({phase:'blocked',message:'Acceso denegado por identidad, entorno o política. No se ha ejecutado la consulta.'});
      }else{
        setState({phase:'blocked',message:'Respuesta sin evidencia válida o servicio no disponible. No se declara éxito.'});
      }
    }catch{
      setState({phase:'blocked',message:'No ha sido posible completar la lectura. No se declara éxito.'});
    }
  }
  return <section aria-label="Git directo LAB · solo lectura" style={{gridColumn:'1 / -1',display:'grid',gap:8,padding:12,border:'1px solid rgba(255,255,255,.2)',borderRadius:10}}>
    <strong>Git · lectura inmediata (LAB)</strong>
    <small>Consultas directas gobernadas. Sin guardar, revertir, ejecutar tareas ni publicar.</small>
    <div role="group" aria-label="Lecturas directas de GitHub" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {OPERATIONS.map(item=><button type="button" key={item.operation} disabled={state.phase==='checking'} onClick={()=>void run(item.operation)}>{item.label}</button>)}
    </div>
    <div role="status" aria-live="polite">{state.message}</div>
    {state.phase==='done'&&state.data?<div aria-label="Evidencia de consulta Git" style={{display:'grid',gap:5}}>
      <small>Rama: {state.data.branch}</small>
      <small>Commit: {state.data.head_sha}</small>
      {state.data.compare_status?<small>Comparación: {state.data.compare_status} · adelante {state.data.ahead_by} · detrás {state.data.behind_by}</small>:null}
      {typeof state.data.ci_total==='number'?<small>CI observado: {state.data.ci_completed_observed}/{state.data.ci_total} · estado commit {state.data.commit_status||'sin dato'}</small>:null}
      {state.data.working_tree?<small>Árbol local: {state.data.working_tree} (repositorio remoto)</small>:null}
      <small>Trabajo en cola: NO · Escrituras Git: 0</small>
    </div>:null}
  </section>;
}
