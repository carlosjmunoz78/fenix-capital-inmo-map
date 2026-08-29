import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {ArchiveRestore,PauseCircle,Power,RotateCcw,X} from 'lucide-react';
import {fetchSpecialCasesRuntime} from './specialCasesRuntime';
import './expediente-lifecycle.css';

type Row=Record<string,unknown>;
type Envelope={item?:Row};
type Mode='pause'|'close'|'reactivate'|null;

const CLOSE_REASONS=['Cliente desiste','Operación aplazada','No continúa','Duplicado / error','Otro'];
function text(v:unknown){if(Array.isArray(v))return v.map(String).join(', ');return String(v??'');}

export default function SpecialCaseLifecycleGuard(){
  const {pathname}=useLocation();
  const match=pathname.match(/^\/(herencias|obras-nuevas)\/([^/]+)$/);
  const active=Boolean(match)&&match?.[2]!=='nuevo';
  const kind=match?.[1]||'';
  const caseCode=match?.[2]?decodeURIComponent(match[2]):'';
  const label=kind==='herencias'?'Herencia':'Obra Nueva';
  const [target,setTarget]=useState<Element|null>(null);
  const [row,setRow]=useState<Row|null>(null);
  const [mode,setMode]=useState<Mode>(null);
  const [pauseUntil,setPauseUntil]=useState('');
  const [indefinite,setIndefinite]=useState(false);
  const [reason,setReason]=useState('Cliente desiste');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');

  useEffect(()=>{if(!active)return;let alive=true;fetchSpecialCasesRuntime<Envelope>(`/${kind}/${encodeURIComponent(caseCode)}`).then(r=>{if(alive&&r.status===200)setRow(r.data?.item??null)});return()=>{alive=false}},[active,kind,caseCode]);
  useEffect(()=>{
    if(!active){setTarget(null);return;}
    let cancelled=false,frame=0,owned:HTMLElement|null=null;
    const find=()=>{
      if(cancelled)return;
      const experience=document.querySelector('.special-detail-experience-host');
      const parent=experience?.parentElement;
      if(experience&&parent){
        let host=parent.querySelector(':scope > .special-case-lifecycle-host') as HTMLElement|null;
        if(!host){
          host=document.createElement('div');
          host.className='special-case-lifecycle-host';
          experience.insertAdjacentElement('afterend',host);
          owned=host;
        }
        setTarget(host);
        return;
      }
      frame=requestAnimationFrame(find);
    };
    frame=requestAnimationFrame(find);
    return()=>{cancelled=true;cancelAnimationFrame(frame);owned?.remove();setTarget(null)};
  },[active,pathname]);

  if(!active||!target)return null;
  const currentState=row?.estado??row?.fase??'';
  const normalized=text(currentState).toLowerCase();
  const isPaused=normalized.includes('paus');
  const isClosed=normalized.includes('baja')||normalized.includes('cerrad')||normalized.includes('finaliz');
  const canReactivate=isPaused||isClosed;
  const pauseSummary=useMemo(()=>indefinite?'Pausa sin fecha de reactivación':pauseUntil?`Pausa hasta ${pauseUntil}`:'Selecciona una fecha o marca pausa indefinida',[indefinite,pauseUntil]);

  function closeModal(){setMode(null);setMessage('');}
  function prepare(){
    if(mode==='pause'&&!indefinite&&!pauseUntil){setMessage('Indica hasta cuándo se pausa o marca pausa indefinida.');return;}
    if(mode==='close'&&!reason){setMessage('Selecciona un motivo de baja.');return;}
    setMessage(`Preparado para registrar de forma auditada en backend: ${mode==='pause'?pauseSummary:mode==='close'?`Baja · ${reason}`:'Reactivación'}. No se ejecuta todavía porque el contrato canónico de ciclo de vida aún no existe; no se inventan campos ni estados.`);
  }

  return createPortal(<section className="exp-life" aria-label={`Ciclo de vida · ${label}`} data-testid="special-case-lifecycle">
    <div className="exp-life-head"><div><span>CICLO DE VIDA · {label.toUpperCase()}</span><strong>Pausar, dar de baja o retomar</strong></div><small>Nunca borra el caso ni su histórico</small></div>
    <div className="exp-life-actions">
      {!canReactivate&&<button type="button" onClick={()=>setMode('pause')}><PauseCircle size={17}/><span><b>Pausar</b><small>Hasta una fecha o sin fecha</small></span></button>}
      {!isClosed&&<button type="button" onClick={()=>setMode('close')}><Power size={17}/><span><b>Dar de baja</b><small>Sale del circuito activo, conserva todo</small></span></button>}
      {canReactivate&&<button type="button" className="primary-life" onClick={()=>setMode('reactivate')}><RotateCcw size={17}/><span><b>Reactivar {label.toLowerCase()}</b><small>Vuelve al circuito activo</small></span></button>}
    </div>
    {mode&&<div className="exp-life-modal" role="dialog" aria-modal="true" aria-label={mode==='pause'?`Pausar ${label}`:mode==='close'?`Dar de baja ${label}`:`Reactivar ${label}`}>
      <div className="exp-life-card">
        <div className="exp-life-modal-head"><div><span>ACCIÓN CON CONFIRMACIÓN</span><h3>{mode==='pause'?`Pausar ${label}`:mode==='close'?`Dar de baja ${label}`:`Reactivar ${label}`}</h3></div><button type="button" aria-label="Cerrar" onClick={closeModal}><X size={18}/></button></div>
        {mode==='pause'&&<div className="exp-life-form"><p>El caso queda fuera del circuito activo durante la pausa, pero conserva todos sus datos, documentos, relaciones e histórico y puede retomarse en cualquier momento.</p><label>Reactivar a partir de<input type="date" value={pauseUntil} disabled={indefinite} onChange={e=>setPauseUntil(e.target.value)}/></label><label className="exp-life-check"><input type="checkbox" checked={indefinite} onChange={e=>setIndefinite(e.target.checked)}/> Pausa indefinida</label><div className="exp-life-preview"><b>Vista previa</b><span>{pauseSummary}</span></div></div>}
        {mode==='close'&&<div className="exp-life-form"><p>Dar de baja no elimina nada. El caso deja de contar como activo o previsión y podrá reactivarse después.</p><label>Motivo<select value={reason} onChange={e=>setReason(e.target.value)}>{CLOSE_REASONS.map(x=><option key={x}>{x}</option>)}</select></label><label>Observación opcional<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Contexto útil para una futura reactivación"/></label></div>}
        {mode==='reactivate'&&<div className="exp-life-form"><p>La reactivación debe conservar fecha de baja o pausa, motivo, fecha de reactivación y trazabilidad del actor.</p><div className="exp-life-preview"><ArchiveRestore size={18}/><span>Se retomará el mismo caso, sin crear uno nuevo.</span></div></div>}
        {message&&<div className="exp-life-message">{message}</div>}
        <div className="exp-life-confirm"><button type="button" onClick={closeModal}>Cancelar</button><button type="button" className="primary-life" onClick={prepare}>Preparar cambio</button></div>
        <small className="exp-life-contract">{label}: {caseCode}. La ejecución real queda bloqueada hasta disponer del endpoint canónico auditado de ciclo de vida.</small>
      </div>
    </div>}
  </section>,target);
}
