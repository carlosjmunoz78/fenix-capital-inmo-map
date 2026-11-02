import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {Ban,ChevronLeft,ChevronRight,File,Folder,GitBranch,LoaderCircle,Play,RotateCcw,Save,Search,SquareTerminal,X} from 'lucide-react';
import {cancelJarvisWorkJob,fetchJarvisRepoHead,fetchJarvisWorkJob,listJarvisRepo,readJarvisRepoFile,runJarvisTerminal,searchJarvisRepo,type JarvisRepoFile,type JarvisRepoHead,type JarvisRepoItem,type JarvisWorkJob} from './jarvisWorkApi';
import './jarvis-repo-workbench.css';

type Tab='files'|'search'|'terminal';
type SearchMatch={path:string;line:number;text:string};
type TerminalEntry={id:string;command:string;job:JarvisWorkJob|null;submittedAt:string};
const TERMINAL_HISTORY_KEY='jarvis_work_terminal_history_v1';
const TERMINAL_STATUSES=new Set(['SUCCEEDED','DEAD_LETTER','CANCELLED']);

function resultText(job:JarvisWorkJob|null,key:'stdout'|'stderr'){const value=job?.result_summary?.[key];return typeof value==='string'?value:''}
function exitCode(job:JarvisWorkJob|null){const value=job?.result_summary?.exit_code;return typeof value==='number'?value:null}
function readHistory(){if(typeof window==='undefined')return[];try{const value=JSON.parse(window.localStorage.getItem(TERMINAL_HISTORY_KEY)||'[]');return Array.isArray(value)?value.filter(item=>typeof item?.command==='string').slice(0,30):[]}catch{return[]}}
function evidenceLabel(job:JarvisWorkJob|null){const evidence=job?.result_summary?.evidence;if(!evidence)return'Pendiente de evidencia';return`${evidence.network||'—'} · ${evidence.workspace_mount||'—'} · secretos ${evidence.secrets_bound?'sí':'no'} · PROD ${evidence.prod_touched?'sí':'no'}`}

export default function JarvisRepoWorkbench(){
 const[tab,setTab]=useState<Tab>('files');
 const[head,setHead]=useState<JarvisRepoHead|null>(null);
 const[path,setPath]=useState('');
 const[items,setItems]=useState<JarvisRepoItem[]>([]);
 const[file,setFile]=useState<JarvisRepoFile|null>(null);
 const[draft,setDraft]=useState('');
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState('');
 const[searchQuery,setSearchQuery]=useState('');
 const[searchJob,setSearchJob]=useState<JarvisWorkJob|null>(null);
 const[searchMatches,setSearchMatches]=useState<SearchMatch[]>([]);
 const[terminalCommand,setTerminalCommand]=useState('printf "JARVIS_OK\\n"; node --version');
 const[terminalEntries,setTerminalEntries]=useState<TerminalEntry[]>(()=>readHistory().map((item:any,index:number)=>({id:`saved-${index}`,command:item.command,job:null,submittedAt:item.submittedAt||''})));
 const[activeTerminalId,setActiveTerminalId]=useState<string|null>(null);
 const pollingRef=useRef<Set<string>>(new Set());
 const dirty=Boolean(file&&draft!==file.content);
 const activeTerminal=terminalEntries.find(entry=>entry.id===activeTerminalId)||terminalEntries[0]||null;
 const breadcrumbs=useMemo(()=>path?path.split('/').filter(Boolean):[],[path]);

 useEffect(()=>{let cancelled=false;void fetchJarvisRepoHead().then(({status,data})=>{if(cancelled)return;if(status===200&&data?.head_sha&&data.branch&&data.repo&&data.environment)setHead(data as JarvisRepoHead);else setError('No se pudo verificar HEAD del repositorio.')});return()=>{cancelled=true}},[]);
 useEffect(()=>{void loadDirectory(path)},[path]);
 useEffect(()=>{const serial=terminalEntries.filter(entry=>entry.command).slice(0,30).map(({command,submittedAt})=>({command,submittedAt}));try{window.localStorage.setItem(TERMINAL_HISTORY_KEY,JSON.stringify(serial))}catch{/* optional */}},[terminalEntries]);

 async function loadDirectory(nextPath:string){setLoading(true);setError('');const{status,data}=await listJarvisRepo(nextPath);setLoading(false);if(status===200&&Array.isArray(data?.items)){setItems(data.items);return}setItems([]);setError('No se pudo abrir esta carpeta.')}
 async function openItem(item:JarvisRepoItem){if(item.type==='dir'){setFile(null);setDraft('');setPath(item.path);return}setLoading(true);setError('');const{status,data}=await readJarvisRepoFile(item.path);setLoading(false);if(status===200&&data?.file){setFile(data.file);setDraft(data.file.content);return}setError('No se pudo leer el archivo o supera el límite seguro.')}
 function goUp(){if(!path)return;const bits=path.split('/');bits.pop();setPath(bits.join('/'));setFile(null);setDraft('')}
 function chooseBreadcrumb(index:number){setPath(breadcrumbs.slice(0,index+1).join('/'));setFile(null);setDraft('')}
 function discardDraft(){if(file)setDraft(file.content)}

 async function pollJob(jobId:string,onDone:(job:JarvisWorkJob)=>void){if(pollingRef.current.has(jobId))return;pollingRef.current.add(jobId);try{for(let attempt=0;attempt<180;attempt+=1){const{status,data}=await fetchJarvisWorkJob(jobId);if(status===200&&data?.job){const job=data.job;onDone(job);if(TERMINAL_STATUSES.has(job.status))return}await new Promise(resolve=>window.setTimeout(resolve,1000))}}finally{pollingRef.current.delete(jobId)}}
 async function submitSearch(event:FormEvent){event.preventDefault();const q=searchQuery.trim();if(!q)return;setError('');setSearchMatches([]);const{status,data}=await searchJarvisRepo(q);if(status!==202||!data?.job){setError('No se pudo encolar la búsqueda gobernada.');return}setSearchJob(data.job);void pollJob(data.job.job_id,job=>{setSearchJob(job);if(job.status==='SUCCEEDED'){try{const parsed=JSON.parse(resultText(job,'stdout'));setSearchMatches(Array.isArray(parsed?.matches)?parsed.matches:[])}catch{setSearchMatches([])}}})}
 async function submitTerminal(event:FormEvent){event.preventDefault();const command=terminalCommand.trim();if(!command)return;setError('');const{status,data}=await runJarvisTerminal(command);if(status!==202||!data?.job){setError('No se pudo encolar el comando en el sandbox.');return}const entry:TerminalEntry={id:data.job.job_id,command,job:data.job,submittedAt:new Date().toISOString()};setTerminalEntries(current=>[entry,...current.filter(item=>item.id!==entry.id)].slice(0,30));setActiveTerminalId(entry.id);void pollJob(entry.id,job=>setTerminalEntries(current=>current.map(item=>item.id===entry.id?{...item,job}:item)))}
 async function cancelActive(){if(!activeTerminal?.job||TERMINAL_STATUSES.has(activeTerminal.job.status))return;const{data}=await cancelJarvisWorkJob(activeTerminal.job.job_id);if(data?.job)setTerminalEntries(current=>current.map(item=>item.id===activeTerminal.id?{...item,job:data.job!}:item))}

 return <section className="jarvis-repo-workbench" aria-label="Código y terminal">
  <header className="jrw-head"><div><small>REPO</small><strong>{head?.repo||'Verificando…'}</strong><span><GitBranch size={11}/>{head?.branch||'—'}</span></div><code>{head?.head_sha?.slice(0,10)||'----------'}</code></header>
  <div className="jrw-tabs" role="tablist"><button type="button" className={tab==='files'?'is-active':''} onClick={()=>setTab('files')}><Folder size={12}/> Archivos</button><button type="button" className={tab==='search'?'is-active':''} onClick={()=>setTab('search')}><Search size={12}/> Buscar</button><button type="button" className={tab==='terminal'?'is-active':''} onClick={()=>setTab('terminal')}><SquareTerminal size={12}/> Terminal</button></div>
  {error?<div className="jrw-error">{error}</div>:null}
  {tab==='files'?<div className="jrw-files"><div className="jrw-path"><button type="button" onClick={goUp} disabled={!path}><ChevronLeft size={13}/></button><button type="button" onClick={()=>{setPath('');setFile(null);setDraft('')}}>/</button>{breadcrumbs.map((part,index)=><span key={`${part}-${index}`}><ChevronRight size={10}/><button type="button" onClick={()=>chooseBreadcrumb(index)}>{part}</button></span>)}</div>{loading?<div className="jrw-loading"><LoaderCircle size={15}/> Cargando…</div>:null}<div className="jrw-files-layout"><div className="jrw-tree">{items.map(item=><button type="button" key={item.path} onClick={()=>void openItem(item)} title={item.path}>{item.type==='dir'?<Folder size={13}/>:<File size={13}/>}<span>{item.name}</span>{item.type==='file'?<small>{item.size} B</small>:null}</button>)}</div><div className="jrw-editor">{file?<><div className="jrw-editor-head"><div><strong>{file.path}</strong><small>{dirty?'MODIFICADO':'SIN CAMBIOS'} · blob {file.sha.slice(0,8)}</small></div><div><button type="button" onClick={discardDraft} disabled={!dirty} title="Descartar cambios locales"><RotateCcw size={13}/></button><button type="button" disabled title="Guardar se habilita cuando el adaptador Git de escritura supere su gate"><Save size={13}/> Guardar</button></div></div><textarea value={draft} onChange={event=>setDraft(event.target.value)} spellCheck={false}/><div className="jrw-policy">Edición local activa. Escritura remota bloqueada hasta validar expected HEAD + rollback + política Git.</div></>:<div className="jrw-empty">Selecciona un archivo para abrirlo.</div>}</div></div></div>:null}
  {tab==='search'?<div className="jrw-search"><form onSubmit={submitSearch}><input value={searchQuery} onChange={event=>setSearchQuery(event.target.value)} placeholder="Buscar texto en el repositorio…"/><button type="submit" disabled={!searchQuery.trim()||Boolean(searchJob&&!TERMINAL_STATUSES.has(searchJob.status))}><Search size={13}/> Buscar</button></form>{searchJob?<div className="jrw-job-state"><span>{searchJob.status}</span><small>{searchJob.job_id.slice(0,8)} · {evidenceLabel(searchJob)}</small></div>:null}<div className="jrw-search-results">{searchMatches.map((match,index)=><button type="button" key={`${match.path}-${match.line}-${index}`} onClick={()=>{setTab('files');const slash=match.path.lastIndexOf('/');setPath(slash>=0?match.path.slice(0,slash):'');void readJarvisRepoFile(match.path).then(({data})=>{if(data?.file){setFile(data.file);setDraft(data.file.content)}})}}><strong>{match.path}:{match.line}</strong><span>{match.text}</span></button>)}{searchJob?.status==='SUCCEEDED'&&!searchMatches.length?<div className="jrw-empty">Sin coincidencias.</div>:null}</div></div>:null}
  {tab==='terminal'?<div className="jrw-terminal"><form onSubmit={submitTerminal}><div className="jrw-terminal-meta"><span>cwd <code>/workspace</code></span><span>env <code>PREPROD</code></span><span>red <code>DENY</code></span></div><textarea value={terminalCommand} onChange={event=>setTerminalCommand(event.target.value)} spellCheck={false}/><div className="jrw-terminal-actions"><button type="submit" disabled={!terminalCommand.trim()}><Play size={13}/> Ejecutar</button><button type="button" onClick={()=>void cancelActive()} disabled={!activeTerminal?.job||TERMINAL_STATUSES.has(activeTerminal.job.status)}><Ban size={13}/> Cancelar</button></div></form><div className="jrw-terminal-body"><aside>{terminalEntries.map(entry=><button type="button" className={activeTerminal?.id===entry.id?'is-active':''} key={entry.id} onClick={()=>setActiveTerminalId(entry.id)}><strong>{entry.job?.status||'HISTORIAL'}</strong><span>{entry.command}</span></button>)}</aside><div className="jrw-terminal-output">{activeTerminal?<><div className="jrw-output-head"><span>{activeTerminal.job?.status||'Historial local'}</span><small>exit {exitCode(activeTerminal.job)??'—'} · {evidenceLabel(activeTerminal.job)}</small></div><pre className="is-stdout">{resultText(activeTerminal.job,'stdout')||'Sin stdout todavía.'}</pre>{resultText(activeTerminal.job,'stderr')?<pre className="is-stderr">{resultText(activeTerminal.job,'stderr')}</pre>:null}</>:<div className="jrw-empty">Ejecuta un comando inocuo en el sandbox gobernado.</div>}</div></div></div>:null}
 </section>;
}
