import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {fetchAnaKnowledgeApi} from './supabase';

type DecisionKind='regla'|'excepcion_precedente'|'contexto_caso'|'descartar';
type KnowledgeItem={id:string;title:string;detail:string;status?:string|null;domain:string;authority:string;source?:string;context?:string;key?:string;date?:string};
type ReviewResponse={ok?:boolean;items?:KnowledgeItem[];blocked_count?:number;actor?:{actor_code?:string;role?:string};capabilities?:{can_review?:boolean}};
type DecisionResponse={ok?:boolean;reused?:boolean;no_op?:boolean;decision_kind?:DecisionKind;canonical?:boolean;authority?:string;domain?:string;error?:string};
type Pending={item:KnowledgeItem;kind:DecisionKind;comment:string;approvedRule:string;idem:string}|null;

const labels:Record<DecisionKind,string>={regla:'Criterio aprobado',excepcion_precedente:'Excepción / precedente',contexto_caso:'Solo contexto',descartar:'Descartar'};

export default function AnaKnowledgeReviewGuard(){
 const location=useLocation();
 const active=location.pathname==='/ana'||location.pathname.startsWith('/ana/');
 const [target,setTarget]=useState<HTMLElement|null>(null),[items,setItems]=useState<KnowledgeItem[]>([]),[blocked,setBlocked]=useState(0),[actor,setActor]=useState(''),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const [comments,setComments]=useState<Record<string,string>>({}),[rules,setRules]=useState<Record<string,string>>({}),[pending,setPending]=useState<Pending>(null),[saving,setSaving]=useState(false);
 const pendingCount=items.length;

 useEffect(()=>{if(!active){setTarget(null);return;}let alive=true;const find=()=>{if(!alive)return;const el=document.querySelector('.ops-content') as HTMLElement|null;if(el)setTarget(el);};find();const obs=new MutationObserver(find);obs.observe(document.body,{childList:true,subtree:true});return()=>{alive=false;obs.disconnect();};},[active]);

 async function load(){setLoading(true);const r=await fetchAnaKnowledgeApi<ReviewResponse>('/review-pending');setLoading(false);if(r.status===200){setItems(r.data?.items??[]);setBlocked(r.data?.blocked_count??0);setActor(r.data?.actor?.actor_code??'');setMessage('');}else if(r.status===401){setItems([]);setBlocked(0);}else if(r.status===403){setItems([]);setMessage('Tu identidad no está habilitada para revisar conocimiento.');}else setMessage('No se pudo cargar la revisión de conocimiento.');}
 useEffect(()=>{if(active)void load();},[active]);

 function prepare(item:KnowledgeItem,kind:DecisionKind){const comment=(comments[item.id]||'').trim();if(kind!=='descartar'&&comment.length<2){setMessage('Añade un comentario antes de clasificar este conocimiento.');return;}const approvedRule=(rules[item.id]||item.detail||'').trim();setPending({item,kind,comment,approvedRule,idem:`knowledge-decision:${item.id}:${kind}:${crypto.randomUUID()}`});setMessage('');}
 async function confirm(){if(!pending||saving)return;setSaving(true);const r=await fetchAnaKnowledgeApi<DecisionResponse>(`/knowledge/${encodeURIComponent(pending.item.id)}/decision`,{method:'POST',body:JSON.stringify({decision_kind:pending.kind,comment:pending.comment,approved_rule:pending.approvedRule,idempotency_key:pending.idem})});setSaving(false);if(r.status===200){setMessage(r.data?.reused?'Esta clasificación ya estaba registrada; no se ha duplicado.':pending.kind==='regla'||pending.kind==='excepcion_precedente'?'Conocimiento revisado y aprobado en CEREBRO.':'Conocimiento revisado y cerrado en CEREBRO.');setComments(v=>{const n={...v};delete n[pending.item.id];return n;});setRules(v=>{const n={...v};delete n[pending.item.id];return n;});setPending(null);await load();}else if(r.status===403){setPending(null);setMessage(`Esta decisión requiere la autoridad ${r.data?.authority||pending.item.authority}.`);}else if(r.status===409){setPending(null);setMessage('Este conocimiento ya fue revisado por otra decisión. He actualizado la bandeja.');await load();}else setMessage('No se pudo registrar la clasificación. No se ha aplicado ninguna decisión.');}

 const content=useMemo(()=>{
  if(!active)return null;
  return <section className="ops-table-card" data-testid="ana-knowledge-review" data-review-actor={actor||undefined} style={{marginTop:18}}>
   <div className="ops-table-head"><strong>Conocimiento pendiente de revisión</strong><span>{loading?'Cargando…':`${pendingCount} pendiente${pendingCount===1?'':'s'}`}</span></div>
   <div style={{padding:'10px 14px 0'}}><small>Solo aparecen aportaciones que puedes revisar. Hipotecas y Finanzas quedan reservadas a Belén; el resto se asigna a la persona responsable de cada ámbito.</small>{blocked>0&&<div className="ops-message" style={{marginTop:10}}>{blocked} aportación{blocked===1?'':'es'} pendiente{blocked===1?'':'s'} queda{blocked===1?'':'n'} reservada{blocked===1?'':'s'} a otra persona responsable.</div>}{message&&<div className="ops-message" style={{marginTop:10}}>{message}</div>}</div>
   {pending&&<div className="ops-message" data-testid="knowledge-decision-preview" style={{margin:'12px 14px'}}><strong>Revisar clasificación antes de aplicar</strong><div>Ámbito: {pending.item.domain}</div><div>Responsable: {pending.item.authority}</div><div>Clasificación: {labels[pending.kind]}</div><div>Comentario: {pending.comment||'Sin comentario'}</div>{(pending.kind==='regla'||pending.kind==='excepcion_precedente')&&<div>Texto aprobado: {pending.approvedRule}</div>}<small>{pending.kind==='regla'||pending.kind==='excepcion_precedente'?'Si confirmas, quedará aprobado para que Ana pueda reutilizarlo cuando corresponda.':'Quedará guardado solo como contexto y no se reutilizará como criterio general.'}</small><div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}><button type="button" onClick={()=>setPending(null)} disabled={saving}>Cancelar</button><button type="button" className="primary" onClick={()=>void confirm()} disabled={saving}>{saving?'Guardando…':'Confirmar clasificación'}</button></div></div>}
   <div className="ops-table-wrap"><table><thead><tr><th>Ámbito</th><th>Conocimiento</th><th>Origen</th><th>Comentario</th><th>Texto aprobado</th><th>Clasificar</th></tr></thead><tbody>{!loading&&items.length===0?<tr><td colSpan={6}>No tienes conocimiento pendiente que revisar.</td></tr>:items.map(item=><tr key={item.id}><td><strong>{item.domain}</strong><br/><small>{item.authority}</small></td><td>{item.detail||'—'}{item.context?<><br/><small>{item.context}</small></>:null}</td><td>{item.source||'—'}{item.date?<><br/><small>{item.date}</small></>:null}</td><td><textarea aria-label={`Comentario revisión ${item.id}`} value={comments[item.id]||''} onChange={e=>setComments(v=>({...v,[item.id]:e.target.value}))} rows={3} style={{minWidth:190}} placeholder="Motivo, matiz o condición"/></td><td><textarea aria-label={`Texto aprobado ${item.id}`} value={rules[item.id]??item.detail} onChange={e=>setRules(v=>({...v,[item.id]:e.target.value}))} rows={3} style={{minWidth:210}}/></td><td><div style={{display:'grid',gap:6,minWidth:180}}>{(Object.keys(labels) as DecisionKind[]).map(kind=><button type="button" key={kind} onClick={()=>prepare(item,kind)} disabled={saving}>{labels[kind]}</button>)}</div></td></tr>)}</tbody></table></div>
  </section>;
 },[active,actor,blocked,comments,items,loading,message,pending,pendingCount,rules,saving]);

 return target&&content?createPortal(content,target):null;
}
