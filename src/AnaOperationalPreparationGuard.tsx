import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {Copy,Mail,MessageCircle,RefreshCw,X} from 'lucide-react';
import {fetchAnaApi,fetchAnaCanonicalApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';

type Row=Record<string,unknown>;
type Rule={id?:string;rule?:string;domain?:string;approved?:boolean;state?:string};
type RulesEnvelope={items?:Rule[]};
type PrepareEnvelope={ok?:boolean;draft?:string;message?:string;text?:string};

function text(row:Row|undefined,keys:string[]){if(!row)return'';for(const key of keys){const value=row[key];if(typeof value==='string'&&value.trim())return value.trim();}return'';}
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const obj=data as Record<string,unknown>;return Array.isArray(obj.items)?obj.items as Row[]:[];}
function itemFrom(data:unknown):Row|null{if(!data||typeof data!=='object')return null;const obj=data as Record<string,unknown>;const item=obj.item;return item&&typeof item==='object'&&!Array.isArray(item)?item as Row:null;}
function idOf(row:Row){return text(row,['id','tarea_id','tarea_code','code']);}
function firstName(name:string){return name.trim().split(/\s+/)[0]||'Hola';}
function channelFrom(params:URLSearchParams,rows:Row[]){const explicit=(params.get('channel')||'').toLowerCase();if(explicit==='email'||explicit==='whatsapp')return explicit as 'email'|'whatsapp';const hay=rows.map(r=>text(r,['tarea','titulo','título','nombre','title'])).join(' ').toLowerCase();return /email|correo/.test(hay)?'email':'whatsapp';}
function cleanAction(value:string){return value.replace(/^(llamar|enviar|preparar|mandar)\s+/i,'').trim();}
function localDraft(channel:'email'|'whatsapp',context:Row[],rules:Rule[]){
 const primary=context[0]||{};
 const name=text(primary,['cliente','nombre','nombre_alias','contacto','title']);
 const next=text(primary,['proxima_accion','próxima_acción','seguimiento','tarea','titulo','título','nombre','title']);
 const state=text(primary,['estado','estado_comercial','status']);
 const action=cleanAction(next||'hacer seguimiento');
 const greeting=name?`Hola ${firstName(name)},`:'Hola,';
 const body=action&&action!=='hacer seguimiento'?`te escribo por ${action.charAt(0).toLowerCase()+action.slice(1)}.`:'te escribo para hacer seguimiento y ayudarte con el siguiente paso.';
 const stateLine=state&&!/pendiente|abierta|hacer/i.test(state)?` Ahora mismo lo tenemos como ${state.toLowerCase()}.`:'';
 const close=channel==='email'?'Cuando puedas, dime si te viene bien y lo dejamos resuelto.\n\nUn saludo,\nFénix Capital':'Cuando puedas me dices y lo dejamos resuelto. Gracias.';
 const safeRule=rules.map(r=>r.rule||'').find(r=>/no prometer|sin prometer|confirmar|verificar/i.test(r));
 const guard=safeRule?' He revisado el criterio vigente antes de prepararte este mensaje.':'';
 return `${greeting}\n\n${body}${stateLine}${guard}\n\n${close}`;
}

const css=`
.ana-prep-backdrop{position:fixed;inset:0;z-index:9200;background:rgba(15,15,18,.58);display:grid;place-items:center;padding:24px}.ana-prep-card{width:min(920px,96vw);max-height:92vh;overflow:auto;background:#fff;color:#1d1d1f;border-radius:22px;border:1px solid #ececec;box-shadow:0 30px 80px rgba(0,0,0,.26);padding:24px}.ana-prep-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.ana-prep-title{display:flex;gap:12px;align-items:center}.ana-prep-icon{width:42px;height:42px;border-radius:13px;background:#fff3ed;color:#f36c21;display:grid;place-items:center}.ana-prep-head h2{margin:0 0 4px;font-size:24px}.ana-prep-head p{margin:0;color:#707075;font-size:13px}.ana-prep-close{border:0;background:transparent;color:inherit;padding:7px;border-radius:9px;cursor:pointer}.ana-prep-context,.ana-prep-rules{margin-top:18px;border:1px solid #ececec;border-radius:14px;padding:14px 16px;background:#fafafa}.ana-prep-context strong,.ana-prep-rules strong{font-size:11px;letter-spacing:.07em}.ana-prep-context p,.ana-prep-rules p{margin:7px 0 0;font-size:12px;line-height:1.45}.ana-prep-draft{margin-top:18px}.ana-prep-draft label{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;margin-bottom:8px}.ana-prep-draft textarea{width:100%;min-height:230px;box-sizing:border-box;border:1px solid #ddd;border-radius:14px;padding:15px;font:inherit;font-size:14px;line-height:1.55;resize:vertical;background:#fff;color:inherit}.ana-prep-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.ana-prep-actions button{border:1px solid #e1e1e1;background:#fff;color:inherit;border-radius:11px;padding:11px 14px;font-weight:700;display:flex;align-items:center;gap:7px;cursor:pointer}.ana-prep-actions button.primary{border-color:#f36c21;background:#f36c21;color:#fff}.ana-prep-status{display:block;margin-top:10px;color:#777;font-size:11px}.ana-prep-loading{padding:34px 0;text-align:center;color:#777}.ana-prep-error{margin-top:16px;border:1px solid #ffd3c0;background:#fff7f2;border-radius:12px;padding:12px;color:#9b431a}.ana-prep-card.dark{background:#202023;color:#f4f4f5;border-color:#39393e}.ana-prep-card.dark .ana-prep-context,.ana-prep-card.dark .ana-prep-rules{background:#262629;border-color:#3b3b40}.ana-prep-card.dark .ana-prep-draft textarea,.ana-prep-card.dark .ana-prep-actions button{background:#18181a;color:#f4f4f5;border-color:#45454b}@media(max-width:700px){.ana-prep-backdrop{padding:10px}.ana-prep-card{padding:18px;border-radius:16px}.ana-prep-draft textarea{min-height:280px}.ana-prep-actions button{flex:1;justify-content:center}}
`;

export default function AnaOperationalPreparationGuard(){
 const location=useLocation(),navigate=useNavigate();
 const params=useMemo(()=>new URLSearchParams(location.search),[location.search]);
 const active=location.pathname==='/ana'&&params.get('mode')==='do'&&['contacto','tareas','tarea'].includes(params.get('resource')||'');
 const resource=params.get('resource')||'';const contactId=params.get('contact_id')||'';const ids=(params.get('ids')||params.get('task_id')||'').split(',').map(x=>x.trim()).filter(Boolean);
 const[ready,setReady]=useState(false),[context,setContext]=useState<Row[]>([]),[rules,setRules]=useState<Rule[]>([]),[draft,setDraft]=useState(''),[channel,setChannel]=useState<'email'|'whatsapp'>('whatsapp'),[error,setError]=useState(''),[copied,setCopied]=useState(false),[theme,setTheme]=useState('light');
 useEffect(()=>{setTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');},[active]);
 useEffect(()=>{if(!active)return;let alive=true;(async()=>{
   setReady(false);setError('');setCopied(false);
   const {data:{session}}=await supabase.auth.getSession();if(!session){if(alive){setError('La sesión no está disponible.');setReady(true)}return;}
   let rows:Row[]=[];
   if(resource==='contacto'&&contactId){const r=await fetchNotionRuntime<unknown>(`/clientes/${encodeURIComponent(contactId)}`);if(r.status===200){const item=itemFrom(r.data);if(item)rows=[item];}else setError('No se pudo cargar el contacto real para preparar el mensaje.');}
   else{const r=await fetchNotionRuntime<unknown>('/tareas');if(r.status===200){const all=rowsFrom(r.data);rows=ids.length?all.filter(x=>ids.includes(idOf(x))):all.slice(0,1);}else setError('No se pudieron cargar las tareas seleccionadas.');}
   const domains=resource==='contacto'?['Hipotecas']:['Operaciones','Hipotecas'];
   const ruleResponses=await Promise.all(domains.map(d=>fetchAnaCanonicalApi<RulesEnvelope>(`/rules?domain=${encodeURIComponent(d)}`)));
   const approved=ruleResponses.flatMap(r=>r.status===200?(r.data?.items??[]):[]).filter(r=>r.approved!==false&&r.state!=='Rechazada').slice(0,6);
   const resolvedChannel=channelFrom(params,rows);let prepared='';
   if(rows.length){
     const backend=await fetchAnaApi<PrepareEnvelope>('/prepare-message',{method:'POST',body:JSON.stringify({resource,contact_id:contactId||null,task_ids:ids,channel:resolvedChannel,context:rows,canonical_rules:approved.map(r=>r.rule).filter(Boolean)})});
     if(backend.status===200&&backend.data?.ok)prepared=(backend.data.draft||backend.data.message||backend.data.text||'').trim();
     if(!prepared)prepared=localDraft(resolvedChannel,rows,approved);
   }
   if(alive){setContext(rows);setRules(approved);setChannel(resolvedChannel);setDraft(prepared);setReady(true);}
 })();return()=>{alive=false}},[active,resource,contactId,location.search]);
 if(!active)return null;
 function regenerate(){setDraft(localDraft(channel,context,rules));setCopied(false);}
 async function copy(){try{await navigator.clipboard.writeText(draft);setCopied(true);}catch{setCopied(false);}}
 const title=channel==='email'?'Correo preparado por Ana':'WhatsApp preparado por Ana';
 const contextLabel=resource==='contacto'?text(context[0],['cliente','nombre','nombre_alias','contacto'])||'Contacto':context.map(r=>text(r,['tarea','titulo','título','nombre','title'])).filter(Boolean).join(' · ')||'Tarea seleccionada';
 return createPortal(<><style>{css}</style><div className="ana-prep-backdrop" role="dialog" aria-modal="true" aria-label="Preparación operativa de Ana"><section className={`ana-prep-card ${theme}`}><header className="ana-prep-head"><div className="ana-prep-title"><div className="ana-prep-icon">{channel==='email'?<Mail size={20}/>:<MessageCircle size={20}/>}</div><div><h2>{title}</h2><p>Ana usa el contexto real del registro y los criterios aprobados. Nada se envía automáticamente.</p></div></div><button className="ana-prep-close" onClick={()=>navigate(-1)} aria-label="Cerrar"><X size={20}/></button></header>{!ready?<div className="ana-prep-loading">Ana está leyendo el contexto y el conocimiento aprobado…</div>:<>{error&&<div className="ana-prep-error">{error}</div>}<div className="ana-prep-context"><strong>CONTEXTO UTILIZADO</strong><p>{contextLabel}</p></div><div className="ana-prep-rules"><strong>CONOCIMIENTO APLICABLE</strong>{rules.length?<>{rules.slice(0,3).map((r,i)=><p key={r.id||i}>• {r.rule}</p>)}</>:<p>No hay criterios aprobados adicionales para este ámbito; Ana usa únicamente el contexto real disponible.</p>}</div><div className="ana-prep-draft"><label>BORRADOR EDITABLE</label><textarea value={draft} onChange={e=>{setDraft(e.target.value);setCopied(false)}} placeholder="No hay suficiente contexto para preparar el mensaje."/></div><div className="ana-prep-actions"><button onClick={()=>setChannel(v=>v==='whatsapp'?'email':'whatsapp')}><RefreshCw size={15}/> Cambiar a {channel==='whatsapp'?'correo':'WhatsApp'}</button><button onClick={regenerate}><RefreshCw size={15}/> Rehacer borrador</button><button className="primary" disabled={!draft.trim()} onClick={()=>void copy()}><Copy size={15}/> {copied?'Copiado':'Copiar borrador'}</button></div><small className="ana-prep-status">Puedes editarlo antes de copiarlo. Esta pantalla no marca tareas como hechas ni envía comunicaciones por sí sola.</small></>}</section></div></>,document.body);
}
