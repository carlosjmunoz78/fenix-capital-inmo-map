import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {ArchiveRestore,PauseCircle,Power,RotateCcw,X} from 'lucide-react';
import {fetchAppApi,IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';
import legacyMap from '../data/legacy-expediente-destination-map.json';
import './expediente-lifecycle.css';

type Mode='pause'|'close'|'reactivate'|null;
type ExpRow={expediente_code?:string;stage?:string;version?:number};
type StageResponse={ok?:boolean;status?:number;error?:string;stage?:string;version?:number;current_version?:number;current_stage?:string};
type LegacyMapEntry={dedupe_key?:string;destination_page_id?:string};
const CLOSE_REASONS=['Cliente no compra','Cliente desiste','Operación aplazada','No viable','Perdido frente a competencia','Duplicado / error','Otro'];
function text(v:unknown){if(Array.isArray(v))return v.map(String).join(', ');return String(v??'');}
function norm(v:string){return v.replaceAll('-','').trim().toLowerCase()}
function resolveCanonicalCode(routeCode:string){
 const entries=((legacyMap as {expedientes?:LegacyMapEntry[]}).expedientes??[]);
 const wanted=norm(routeCode);
 const hit=entries.find(x=>norm(String(x.destination_page_id??''))===wanted||norm(String(x.dedupe_key??''))===wanted);
 return String(hit?.dedupe_key||routeCode);
}
async function stageApi(body:Record<string,unknown>){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as StageResponse|null};
 try{
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-stage`,{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)});
  let data:StageResponse|null=null;try{data=await r.json()}catch{}
  return{status:r.status,data};
 }catch{return{status:0,data:null as StageResponse|null}}
}

export default function ExpedienteLifecycleGuard(){
  const {pathname}=useLocation();
  const match=pathname.match(/^\/expedientes\/([^/]+)$/);
  const expedienteCode=match?.[1]?decodeURIComponent(match[1]):'';
  const canonicalCode=useMemo(()=>resolveCanonicalCode(expedienteCode),[expedienteCode]);
  const [canonical,setCanonical]=useState(false);
  const [currentState,setCurrentState]=useState<unknown>(null);
  const [version,setVersion]=useState<number|null>(null);
  const [mode,setMode]=useState<Mode>(null);
  const [pauseUntil,setPauseUntil]=useState('');
  const [indefinite,setIndefinite]=useState(false);
  const [reason,setReason]=useState('Cliente no compra');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');
  const [prepared,setPrepared]=useState(false);
  const [saving,setSaving]=useState(false);
  const [host,setHost]=useState<HTMLElement|null>(null);
  const pauseSummary=useMemo(()=>indefinite?'Pausa sin fecha de reactivación':pauseUntil?`Pausa hasta ${pauseUntil}`:'Selecciona una fecha o marca pausa indefinida',[indefinite,pauseUntil]);

  async function load(){
    if(!canonicalCode)return;
    const r=await fetchAppApi<any>(`/expedientes/${encodeURIComponent(canonicalCode)}`);
    if(r.status!==200){setCanonical(false);setVersion(null);return;}
    const item=(r.data?.expediente??r.data?.item??null) as ExpRow|null;
    setCanonical(Boolean(item));
    setCurrentState(item?.stage??null);
    setVersion(Number.isFinite(Number(item?.version))?Number(item?.version):null);
  }
  useEffect(()=>{let alive=true;(async()=>{if(!canonicalCode)return;await load();if(!alive)return;})();return()=>{alive=false}},[canonicalCode]);
  useEffect(()=>{
    if(!expedienteCode||pathname==='/expedientes/nuevo'){setHost(null);return;}
    const mount=()=>{
      const content=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-content')||document.querySelector<HTMLElement>('.ops-content');
      const evidence=content?.querySelector<HTMLElement>(':scope > .context-evidence-inline-host');
      const ana=content?.querySelector<HTMLElement>(':scope > .detail-ana-hero');
      if(!content)return;
      let node=content.querySelector<HTMLElement>(':scope > .exp-life-inline-host');
      if(!node){
        node=document.createElement('div');node.className='exp-life-inline-host';node.dataset.testid='expediente-lifecycle-inline-host';
        const host=node;
        if(evidence)content.insertBefore(host,evidence);else if(ana)content.insertBefore(node,ana);else content.appendChild(node);
      }
      setHost(current=>current===node?current:node);
    };
    mount();const observer=new MutationObserver(mount);observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();document.querySelectorAll('.exp-life-inline-host').forEach(x=>x.remove());setHost(null);};
  },[expedienteCode,pathname]);

  if(!expedienteCode||pathname==='/expedientes/nuevo'||!host)return null;
  const normalized=text(currentState).toLowerCase();
  const isPaused=normalized.includes('paus');
  const isClosed=normalized.includes('baja')||normalized.includes('perdido')||normalized.includes('cerrad');
  const canReactivate=isPaused||isClosed;
  function open(next:Mode){setMode(next);setMessage('');setPrepared(false);}
  function closeModal(){setMode(null);setMessage('');setPrepared(false);setSaving(false);}
  function prepare(){
    if(!canonical||version===null){setMessage('No se ha podido validar el expediente canónico asociado. No se ejecutará ningún cambio.');return;}
    if(mode==='pause'&&!indefinite&&!pauseUntil){setMessage('Indica hasta cuándo se pausa o marca pausa indefinida.');return;}
    if(mode==='close'&&!reason){setMessage('Selecciona un motivo de baja.');return;}
    if(mode==='reactivate'){setMessage('La reactivación queda pendiente de recuperar de forma canónica el estado anterior. No se inventará un estado de retorno.');setPrepared(false);return;}
    setPrepared(true);
    setMessage(`Vista previa lista: ${mode==='pause'?pauseSummary:`Dar de baja · ${reason}`}. Confirma para ejecutar el cambio auditado.`);
  }
  async function confirm(){
    if(!prepared||saving||version===null||!mode||mode==='reactivate')return;
    if(!IS_PRODUCTION){setMessage('PRE-PROD: comprobación preparada sin escribir en producción.');return;}
    setSaving(true);setMessage('Guardando cambio auditado…');
    const stage=mode==='close'?'Baja':'Pausado';
    const r=await stageApi({expediente_code:canonicalCode,expected_version:version,stage});
    if(r.status===200&&r.data?.ok){setCurrentState(r.data.stage??stage);setVersion(Number(r.data.version??version+1));setPrepared(false);setMessage(mode==='close'?`Expediente dado de baja correctamente. Motivo: ${reason}${note.trim()?` · ${note.trim()}`:''}`:`Expediente pausado correctamente${indefinite?' sin fecha':pauseUntil?` hasta ${pauseUntil}`:''}.`);setSaving(false);return;}
    if(r.status===409){setVersion(Number(r.data?.current_version??version));setCurrentState(r.data?.current_stage??currentState);setPrepared(false);setMessage('El expediente cambió mientras lo tenías abierto. He actualizado su versión; revisa y vuelve a confirmar.');}
    else if(r.status===403)setMessage('Tu perfil no tiene permiso para ejecutar este cambio.');
    else setMessage('No se pudo ejecutar el cambio. El expediente no se ha modificado.');
    setSaving(false);
  }

  return createPortal(<section className="exp-life" data-testid="expediente-lifecycle-inline" aria-label="Ciclo de vida del expediente">
    <div className="exp-life-head"><div><span>CICLO DE VIDA</span><strong>Pausar, dar de baja o retomar</strong></div><small>Nunca borra el expediente ni su histórico</small></div>
    <div className="exp-life-actions">
      {!canReactivate&&<button type="button" onClick={()=>open('pause')}><PauseCircle size={17}/><span><b>Pausar</b><small>Hasta una fecha o sin fecha</small></span></button>}
      {!isClosed&&<button type="button" onClick={()=>open('close')}><Power size={17}/><span><b>Dar de baja</b><small>Sale del pipeline, conserva todo</small></span></button>}
      {canReactivate&&<button type="button" className="primary-life" onClick={()=>open('reactivate')}><RotateCcw size={17}/><span><b>Reactivar expediente</b><small>Recupera el circuito anterior</small></span></button>}
    </div>
    {mode&&<div className="exp-life-modal" role="dialog" aria-modal="true" aria-label={mode==='pause'?'Pausar expediente':mode==='close'?'Dar de baja expediente':'Reactivar expediente'}><div className="exp-life-card">
      <div className="exp-life-modal-head"><div><span>ACCIÓN CON CONFIRMACIÓN</span><h3>{mode==='pause'?'Pausar expediente':mode==='close'?'Dar de baja expediente':'Reactivar expediente'}</h3></div><button type="button" aria-label="Cerrar" onClick={closeModal}><X size={18}/></button></div>
      {mode==='pause'&&<div className="exp-life-form"><p>El expediente queda fuera del pipeline activo durante la pausa, pero conserva todos sus datos.</p><label>Reactivar a partir de<input type="date" value={pauseUntil} disabled={indefinite} onChange={e=>{setPauseUntil(e.target.value);setPrepared(false)}}/></label><label className="exp-life-check"><input type="checkbox" checked={indefinite} onChange={e=>{setIndefinite(e.target.checked);setPrepared(false)}}/> Pausa indefinida</label><div className="exp-life-preview"><b>Vista previa</b><span>{pauseSummary}</span></div></div>}
      {mode==='close'&&<div className="exp-life-form"><p>Dar de baja no elimina nada. El expediente deja de contar como activo y conserva su histórico.</p><label>Motivo<select value={reason} onChange={e=>{setReason(e.target.value);setPrepared(false)}}>{CLOSE_REASONS.map(x=><option key={x}>{x}</option>)}</select></label><label>Observación opcional<textarea rows={3} value={note} onChange={e=>{setNote(e.target.value);setPrepared(false)}} placeholder="Contexto útil para una futura reactivación"/></label></div>}
      {mode==='reactivate'&&<div className="exp-life-form"><p>La reactivación debe restaurar el estado previo real, no inventar uno.</p><div className="exp-life-preview"><ArchiveRestore size={18}/><span>Se habilitará cuando el backend pueda recuperar de forma auditada el estado anterior.</span></div></div>}
      {message&&<div className="exp-life-message">{message}</div>}
      <div className="exp-life-confirm"><button type="button" onClick={closeModal}>Cancelar</button>{!prepared?<button type="button" className="primary-life" onClick={prepare}>Preparar cambio</button>:<button type="button" className="primary-life" disabled={saving} onClick={confirm}>{saving?'Guardando…':'Confirmar cambio'}</button>}</div>
      <small className="exp-life-contract">Expediente abierto: {expedienteCode}{canonicalCode!==expedienteCode?` · canónico: ${canonicalCode}`:''} · versión {version??'sin validar'} · {IS_PRODUCTION?'PROD con escritura auditada':'PRE-PROD sin escritura PROD'}.</small>
    </div></div>}
  </section>,host);
}
