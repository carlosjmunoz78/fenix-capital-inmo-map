import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {CalendarPlus,Check,Mail,MessageCircle,Phone,RefreshCw,Sparkles} from 'lucide-react';
import {fetchAnaApi,fetchAnaCanonicalApi,fetchAppApi,IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';

type Scope={type:string;code:string;label:string;domain:string};
type Rule={id?:string;rule?:string;approved?:boolean;state?:string};
type RulesEnvelope={items?:Rule[]};
type PrepareEnvelope={ok?:boolean;draft?:string;message?:string;text?:string};
type Ctx={actor_code?:string;role?:string};
type CreateResponse={ok?:boolean;id?:string;destino?:string;error?:string};
type Channel='whatsapp'|'email'|'llamada'|'tarea';

const routeMap:Record<string,{type:string;label:string;domain:string}>={
 expedientes:{type:'expediente',label:'Expediente',domain:'Hipotecas'},
 herencias:{type:'herencia',label:'Herencia',domain:'Operaciones'},
 'obras-nuevas':{type:'obra_nueva',label:'Obra nueva',domain:'Operaciones'},
 bancos:{type:'banco',label:'Banco',domain:'Hipotecas'},
 contactos:{type:'contacto',label:'Contacto',domain:'Hipotecas'},
 'contactos-b2b':{type:'contacto_b2b',label:'Contacto de inmobiliaria',domain:'Inmobiliarias B2B'},
 'contactos-bancarios':{type:'contacto_bancario',label:'Contacto bancario',domain:'Hipotecas'},
 inmobiliarias:{type:'inmobiliaria',label:'Inmobiliaria',domain:'Inmobiliarias B2B'},
 tasaciones:{type:'tasacion',label:'Tasación / tasador',domain:'Hipotecas'},
 tasadores:{type:'tasador',label:'Tasador',domain:'Hipotecas'},
 notarias:{type:'notaria',label:'Notaría',domain:'Hipotecas'},
 'registros-propiedad':{type:'registro_propiedad',label:'Registro de la Propiedad',domain:'Hipotecas'},
 tareas:{type:'tarea',label:'Tarea',domain:'Operaciones'},
 firmas:{type:'firma',label:'Firma',domain:'Hipotecas'},
 comunicaciones:{type:'comunicacion',label:'Comunicación',domain:'Comunicaciones'},
 documentos:{type:'documento',label:'Documento',domain:'Documentación'},
 financieros:{type:'financiero',label:'Financiero',domain:'Operaciones'},
 visitadores:{type:'visitador',label:'Visitador',domain:'Inmobiliarias B2B'},
 visitas:{type:'visita',label:'Visita',domain:'Inmobiliarias B2B'}
};

function scopeFromPath(path:string):Scope|null{
 const parts=path.split('/').filter(Boolean);
 if(parts.length===3&&parts[0]==='bancos'&&parts[1]==='contactos'){
  const code=decodeURIComponent(parts[2]||'');
  return code?{type:'contacto_bancario',code,label:'Contacto bancario',domain:'Hipotecas'}:null;
 }
 if(parts.length!==2)return null;
 const cfg=routeMap[parts[0]];if(!cfg)return null;
 const code=decodeURIComponent(parts[1]);if(!code||['nuevo','nueva','new','contactos'].includes(code.toLowerCase()))return null;
 return{...cfg,code};
}
function channelLabel(c:Channel){return c==='whatsapp'?'WhatsApp':c==='email'?'Email':c==='llamada'?'Llamada':'Tarea interna';}
function channelIcon(c:Channel){return c==='whatsapp'?<MessageCircle size={16}/>:c==='email'?<Mail size={16}/>:c==='llamada'?<Phone size={16}/>:<CalendarPlus size={16}/>;}
function localDraft(channel:Channel,scope:Scope,title:string,happened:string,action:string,rules:Rule[]){
 const subject=title||`${scope.label} ${scope.code}`;const rule=rules.map(r=>r.rule||'').find(Boolean);
 if(channel==='llamada')return `Guion de llamada · ${subject}\n\nObjetivo: ${action||'aclarar el siguiente paso'}.\nContexto: ${happened||'sin contexto adicional registrado'}.\n\n1. Identificar el asunto.\n2. Explicar brevemente el motivo.\n3. Confirmar el dato o compromiso necesario.\n4. Cerrar dejando claro el siguiente paso.${rule?`\n\nCriterio de Ana aplicable: ${rule}`:''}`;
 if(channel==='tarea')return `Siguiente tarea para ${subject}: ${action||'hacer seguimiento'}.\n\nContexto: ${happened||'sin contexto adicional registrado'}.${rule?`\nCriterio aplicable: ${rule}`:''}`;
 const body=action?`te contacto para ${action.charAt(0).toLowerCase()+action.slice(1)}.`:'te contacto para hacer seguimiento del siguiente paso.';
 const context=happened?` Como contexto, ${happened.charAt(0).toLowerCase()+happened.slice(1)}.`:'';
 const close=channel==='email'?'Cuando puedas, confírmame y lo dejamos encaminado.\n\nUn saludo,\nFénix Capital':'Cuando puedas me dices y lo dejamos encaminado. Gracias.';
 return `Hola,\n\n${body}${context}\n\n${close}`;
}
async function createTask(payload:Record<string,unknown>){
 const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null as CreateResponse|null};
 const endpoint=IS_PRODUCTION?'fenix-task-api':'fenix-notion-actions-test/tareas/create';
 const r=await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,'idempotency-key':crypto.randomUUID()},body:JSON.stringify(payload)});
 let data:CreateResponse|null=null;try{data=await r.json()}catch{}return{status:r.status,data};
}

const css=`.task-action-strip-host{width:100%}.task-action-strip{margin:18px 0 22px;border:1px solid #eadfd9;background:linear-gradient(135deg,#fff 0%,#fffaf7 100%);border-radius:18px;padding:18px 20px;box-shadow:0 10px 28px rgba(45,25,15,.035);color:#1d1d1f}.task-action-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.task-action-head span{display:block;font-size:10px;font-weight:850;letter-spacing:.085em;color:#f36c21}.task-action-head h3{margin:4px 0;font-size:20px}.task-action-head p{margin:0;color:#707075;font-size:12px;line-height:1.45}.task-action-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:16px}.task-action-grid label,.task-action-full label{display:grid;gap:6px;font-size:10px;font-weight:800;letter-spacing:.055em}.task-action-grid textarea,.task-action-grid input,.task-action-grid select,.task-action-full textarea{width:100%;box-sizing:border-box;border:1px solid #dedede;border-radius:11px;background:#fff;color:inherit;padding:10px 12px;font:inherit;font-size:13px;line-height:1.45}.task-action-grid textarea,.task-action-full textarea{resize:vertical;min-height:82px}.task-action-channels,.task-action-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.task-action-channels button,.task-action-controls button{display:flex;align-items:center;gap:6px;border:1px solid #e2e2e2;border-radius:10px;background:#fff;padding:9px 11px;font-weight:750;color:inherit;cursor:pointer}.task-action-channels button.active{border-color:#f36c21;background:#fff3ed;color:#b84c17}.task-action-controls button.primary{background:#f36c21;border-color:#f36c21;color:#fff}.task-action-controls button:disabled{opacity:.45;cursor:not-allowed}.task-action-ana{margin-top:14px;border:1px solid #ffd9c7;border-radius:13px;background:#fff7f2;padding:13px}.task-action-ana strong{font-size:11px;letter-spacing:.055em}.task-action-ana textarea{margin-top:8px;width:100%;box-sizing:border-box;min-height:130px;border:1px solid #e7c7b7;border-radius:10px;padding:11px;font:inherit;font-size:13px;line-height:1.5;background:#fff;color:inherit}.task-action-rules{margin-top:7px;font-size:10px;color:#777}.task-action-preview{margin-top:14px;border:1px solid #e7e7e7;border-radius:12px;background:#fff;padding:12px;font-size:12px;line-height:1.5}.task-action-status{display:block;margin-top:10px;font-size:11px;color:#777}.task-action-full{margin-top:12px}.task-action-strip[data-theme='dark']{background:#202023;border-color:#3b3b40;color:#f4f4f5}.task-action-strip[data-theme='dark'] textarea,.task-action-strip[data-theme='dark'] input,.task-action-strip[data-theme='dark'] select,.task-action-strip[data-theme='dark'] button,.task-action-strip[data-theme='dark'] .task-action-preview{background:#18181a;color:#f4f4f5;border-color:#45454b}.task-action-strip[data-theme='dark'] .task-action-ana{background:#2d211c;border-color:#65412e}@media(max-width:800px){.task-action-grid{grid-template-columns:1fr}.task-action-head{display:block}.task-action-controls button{flex:1;justify-content:center}}`;

export default function UniversalTaskActionStrip(){
 const location=useLocation();const scope=useMemo(()=>scopeFromPath(location.pathname),[location.pathname]);
 const[host,setHost]=useState<HTMLElement|null>(null),[ctx,setCtx]=useState<Ctx|null>(null),[title,setTitle]=useState('');
 const[happened,setHappened]=useState(''),[action,setAction]=useState(''),[channel,setChannel]=useState<Channel>('whatsapp'),[due,setDue]=useState('');
 const[rules,setRules]=useState<Rule[]>([]),[anaDraft,setAnaDraft]=useState(''),[correction,setCorrection]=useState(''),[preparing,setPreparing]=useState(false),[preview,setPreview]=useState(false),[creating,setCreating]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setHappened('');setAction('');setChannel('whatsapp');setDue('');setRules([]);setAnaDraft('');setCorrection('');setPreview(false);setMessage('');},[location.pathname]);
 useEffect(()=>{if(!scope){setHost(null);return}let alive=true;fetchAppApi<Ctx>('/session/context').then(r=>alive&&setCtx(r.status===200?r.data:null));const place=()=>{const root=document.querySelector('.ops-root .ops-content') as HTMLElement|null;if(!root)return;let node=root.querySelector(':scope > .task-action-strip-host') as HTMLElement|null;if(!node){node=document.createElement('section');node.className='task-action-strip-host'}const quick=root.querySelector(':scope > .ops-shared-quick,:scope > .ops-uniform-footer-host');if(quick)root.insertBefore(node,quick);else if(node.parentElement!==root||node!==root.lastElementChild)root.appendChild(node);setHost(node);setTitle(root.querySelector('h1')?.textContent?.trim()||'')};place();const obs=new MutationObserver(place);obs.observe(document.body,{childList:true,subtree:true});return()=>{alive=false;obs.disconnect();document.querySelectorAll('.task-action-strip-host').forEach(n=>n.remove());setHost(null)}},[scope?.type,scope?.code,location.pathname]);
 if(!scope||!host)return null;
 const s:Scope=scope;const valid=Boolean(action.trim()&&ctx?.actor_code);
 async function prepareAna(){setPreparing(true);setMessage('');const r=await fetchAnaCanonicalApi<RulesEnvelope>(`/rules?domain=${encodeURIComponent(s.domain)}`);const approved=(r.status===200?r.data?.items??[]:[]).filter(x=>x.approved!==false&&x.state!=='Rechazada').slice(0,6);let draft='';const backend=await fetchAnaApi<PrepareEnvelope>('/prepare-message',{method:'POST',body:JSON.stringify({resource:'task_action',scope_type:s.type,scope_code:s.code,channel,happened:happened.trim(),action:action.trim(),canonical_rules:approved.map(x=>x.rule).filter(Boolean)})});if(backend.status===200&&backend.data?.ok)draft=(backend.data.draft||backend.data.message||backend.data.text||'').trim();if(!draft)draft=localDraft(channel,s,title,happened.trim(),action.trim(),approved);setRules(approved);setAnaDraft(draft);setPreparing(false);setPreview(false)}
 function regenerate(){setAnaDraft(localDraft(channel,s,title,happened.trim(),action.trim(),rules));setPreview(false)}
 async function create(){if(!valid)return;if(!preview){setPreview(true);setMessage('');return}setCreating(true);setMessage('');const payload={tarea:`${channelLabel(channel)} · ${action.trim()}`,id_trabajador_operativo:ctx?.actor_code,fecha_limite:due||null,origin_type:s.type,origin_code:s.code,action_channel:channel,happened:happened.trim()||null,planned_action:action.trim(),ana_draft:anaDraft.trim()||null,user_correction:correction.trim()||null};const r=await createTask(payload);setCreating(false);if((r.status===200||r.status===201)&&r.data?.ok){setMessage('Tarea creada y vinculada al contexto.');setHappened('');setAction('');setDue('');setAnaDraft('');setCorrection('');setPreview(false)}else setMessage(`No se pudo crear la tarea (${r.data?.error||r.status}).`)}
 const theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
 return createPortal(<><style>{css}</style><article className="task-action-strip" data-theme={theme} data-testid="universal-task-action-strip"><header className="task-action-head"><div><span>NUEVA TAREA · SIGUIENTE ACCIÓN</span><h3>{s.label}: registrar y actuar sin perder contexto</h3><p>Cuenta qué ha pasado, qué toca hacer y deja que Ana prepare el mensaje o el guion. La tarea conservará su origen.</p></div><CalendarPlus size={22}/></header><div className="task-action-grid"><label>QUÉ HA PASADO<textarea value={happened} onChange={e=>{setHappened(e.target.value);setPreview(false)}} placeholder="Ej.: el banco pide aclarar un documento; la notaría confirma fecha; el tasador no ha respondido…"/></label><label>QUÉ HAY QUE HACER<textarea value={action} onChange={e=>{setAction(e.target.value);setPreview(false)}} placeholder="Ej.: pedir la documentación, confirmar fecha, reclamar respuesta…"/></label></div><div className="task-action-channels" aria-label="Tipo de acción">{(['whatsapp','email','llamada','tarea'] as Channel[]).map(c=><button type="button" key={c} aria-label={`Seleccionar ${channelLabel(c)} como tipo de acción`} className={channel===c?'active':''} onClick={()=>{setChannel(c);setPreview(false);if(anaDraft)setAnaDraft(localDraft(c,s,title,happened.trim(),action.trim(),rules))}}>{channelIcon(c)}{channelLabel(c)}</button>)}</div><div className="task-action-grid"><label>FECHA LÍMITE<input type="date" value={due} onChange={e=>{setDue(e.target.value);setPreview(false)}}/></label><label>RESPONSABLE<input readOnly value={ctx?.actor_code||'Cargando identidad…'}/></label></div><div className="task-action-controls"><button type="button" className="primary" disabled={!action.trim()||preparing} onClick={()=>void prepareAna()}><Sparkles size={16}/>{preparing?'Ana está preparando…':'Que lo prepare Ana'}</button>{anaDraft&&<button type="button" onClick={regenerate}><RefreshCw size={15}/>Rehacer propuesta</button>}</div>{anaDraft&&<div className="task-action-ana" data-testid="task-action-ana-draft"><strong>LO QUE PROPONE ANA · {channelLabel(channel).toUpperCase()}</strong><textarea value={anaDraft} onChange={e=>{setAnaDraft(e.target.value);setPreview(false)}}/><div className="task-action-rules">{rules.length?`Ana ha aplicado ${rules.length} criterio${rules.length===1?'':'s'} aprobado${rules.length===1?'':'s'} de ${s.domain}.`:`No hay criterios aprobados adicionales; la propuesta usa únicamente el contexto introducido.`}</div></div>}<div className="task-action-full"><label>CORRECCIÓN / MATIZ DEL USUARIO<textarea value={correction} onChange={e=>{setCorrection(e.target.value);setPreview(false)}} placeholder="Si Ana no lo ha planteado bien, corrígelo aquí. La corrección queda ligada a esta tarea."/></label></div>{preview&&<div className="task-action-preview" data-testid="task-action-preview"><strong>REVISAR ANTES DE CREAR</strong><div>Origen: {s.label} · {s.code}</div><div>Acción: {channelLabel(channel)} · {action.trim()}</div><div>Qué pasó: {happened.trim()||'Sin detalle adicional'}</div><div>Ana: {anaDraft.trim()?'Propuesta incluida':'Sin propuesta guardada'}</div><div>Corrección humana: {correction.trim()||'Ninguna'}</div><small>No se creará nada hasta confirmar.</small></div>}<div className="task-action-controls"><button type="button" disabled={!valid||creating} onClick={()=>void create()} className={preview?'primary':''}>{preview?<><Check size={16}/>{creating?'Creando…':'Confirmar y crear tarea'}</>:'Revisar tarea'}</button>{preview&&<button type="button" onClick={()=>setPreview(false)}>Volver</button>}</div>{message&&<small className="task-action-status" role="status">{message}</small>}</article></>,host);
}
