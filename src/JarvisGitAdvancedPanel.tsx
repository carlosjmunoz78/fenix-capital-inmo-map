import {useEffect,useMemo,useState} from 'react';
import {Activity,Diff,GitCompare,GitCommitHorizontal,LoaderCircle,RefreshCw,ShieldCheck} from 'lucide-react';
import {fetchJarvisRepoHead,type JarvisRepoHead} from './jarvisWorkApi';
import {gitActions,inspectJarvisGit,waitJarvisGitJob,type JarvisGitActionResult,type JarvisGitInspectJob,type JarvisGitInspectOperation} from './jarvisGitInspectApi';

const TERMINAL=new Set(['SUCCEEDED','DEAD_LETTER','CANCELLED']);

function firstAction(job:JarvisGitInspectJob|null){return gitActions(job)[0]||null;}
function lineCount(value:string|undefined){return value?value.split('\n').filter(Boolean).length:0;}

export default function JarvisGitAdvancedPanel(){
 const[head,setHead]=useState<JarvisRepoHead|null>(null);
 const[job,setJob]=useState<JarvisGitInspectJob|null>(null);
 const[operation,setOperation]=useState<JarvisGitInspectOperation|null>(null);
 const[error,setError]=useState('');
 const busy=Boolean(job&&!TERMINAL.has(job.status));
 const action=firstAction(job);
 const statusText=typeof action?.porcelain==='string'?action.porcelain:'';
 const diffText=typeof action?.diff==='string'?action.diff:'';
 const checks=Array.isArray(action?.checks)?action.checks:[];
 const files=Array.isArray(action?.files)?action.files:[];
 const summary=useMemo(()=>{
  if(!action)return'';
  if(operation==='STATUS')return statusText.trim()?`${lineCount(statusText)} cambios detectados`:'Árbol de trabajo limpio';
  if(operation==='DIFF')return diffText.trim()?`${lineCount(diffText)} líneas de diff`:'Sin diff pendiente';
  if(operation==='CI_READ')return`${checks.length} comprobaciones encontradas`;
  if(operation==='COMPARE')return`${files.length} archivos comparados`;
  return'';
 },[action,operation,statusText,diffText,checks.length,files.length]);

 async function refreshHead(){const{status,data}=await fetchJarvisRepoHead();if(status===200&&data?.head_sha&&data.branch&&data.repo&&data.environment)setHead(data as JarvisRepoHead);else setError('No se pudo verificar el HEAD de la rama aislada.');}
 useEffect(()=>{void refreshHead()},[]);
 async function run(next:JarvisGitInspectOperation){
  setError('');setOperation(next);
  const current=head?.head_sha||'';
  if(!current){setError('HEAD no verificado.');return}
  const payload={operation:next,expected_head_sha:current,...(next==='COMPARE'?{base:'main',head:head?.branch||''}:{})};
  const{status,data}=await inspectJarvisGit(payload);
  if(status!==202||!data?.job){setError(data?.reason||'No se pudo encolar la inspección Git.');return}
  setJob(data.job);
  const done=await waitJarvisGitJob(data.job.job_id,setJob);
  if(!done){setError('La inspección no devolvió resultado verificable.');return}
  if(done.status!=='SUCCEEDED')setError(done.error_detail||done.error_code||'La inspección Git no terminó en verde.');
  await refreshHead();
 }

 return <section className="jarvis-git-advanced" aria-label="Git avanzado">
  <header><div><small>RAMA AISLADA</small><strong>{head?.branch||'Verificando…'}</strong><code>{head?.head_sha?.slice(0,12)||'------------'}</code></div><span><ShieldCheck size={14}/> main y emergency-pages bloqueadas</span></header>
  <div className="jarvis-git-actions">
   <button type="button" onClick={()=>void run('STATUS')} disabled={busy}><Activity size={15}/> Estado</button>
   <button type="button" onClick={()=>void run('DIFF')} disabled={busy}><Diff size={15}/> Diff</button>
   <button type="button" onClick={()=>void run('CI_READ')} disabled={busy}><GitCommitHorizontal size={15}/> CI</button>
   <button type="button" onClick={()=>void run('COMPARE')} disabled={busy}><GitCompare size={15}/> vs main</button>
   <button type="button" onClick={()=>void refreshHead()} disabled={busy} title="Actualizar HEAD"><RefreshCw size={15}/></button>
  </div>
  {job?<div className="jarvis-git-job"><span>{busy?<LoaderCircle className="is-spin" size={14}/>:<ShieldCheck size={14}/>}<b>{job.status}</b></span><small>{summary||job.job_id.slice(0,8)}</small></div>:null}
  {error?<p className="jarvis-git-error">{error}</p>:null}
  <div className="jarvis-git-result">
   {operation==='STATUS'&&action?<pre>{statusText||'Árbol de trabajo limpio.'}</pre>:null}
   {operation==='DIFF'&&action?<pre>{diffText||'Sin diferencias pendientes.'}</pre>:null}
   {operation==='CI_READ'&&action?<div className="jarvis-git-checks">{checks.length?checks.map((check,index)=><article key={`${check.name}-${index}`}><strong>{check.name}</strong><span>{check.status} · {check.conclusion||'pendiente'}</span>{check.html_url?<a href={check.html_url} target="_blank" rel="noreferrer">Abrir</a>:null}</article>):<p>Sin checks publicados para este HEAD.</p>}</div>:null}
   {operation==='COMPARE'&&action?<div className="jarvis-git-files">{files.length?files.map(file=><article key={file.filename}><strong>{file.filename}</strong><span>{file.status} · +{file.additions} −{file.deletions}</span></article>):<p>Sin diferencias publicadas frente a main.</p>}</div>:null}
   {!action?<div className="jarvis-git-empty">Consulta estado, diff, CI o comparación sin escribir en el repositorio.</div>:null}
  </div>
  <footer>Las escrituras siguen pasando por Guardar / OLD vs NEW / rollback del editor. Este panel es de inspección y evidencia.</footer>
 </section>;
}
