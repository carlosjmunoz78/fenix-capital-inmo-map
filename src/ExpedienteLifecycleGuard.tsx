import {useMemo,useState} from 'react';
import {ArchiveRestore,PauseCircle,Power,RotateCcw,X} from 'lucide-react';
import './expediente-lifecycle.css';

type Mode='pause'|'close'|'reactivate'|null;
type Props={
  canonical:boolean;
  currentState:unknown;
  expedienteCode:string;
};

const CLOSE_REASONS=['Cliente no compra','Cliente desiste','Operación aplazada','No viable','Perdido frente a competencia','Duplicado / error','Otro'];

function text(v:unknown){
  if(Array.isArray(v))return v.map(String).join(', ');
  return String(v??'');
}

export default function ExpedienteLifecycleGuard({canonical,currentState,expedienteCode}:Props){
  const [mode,setMode]=useState<Mode>(null);
  const [pauseUntil,setPauseUntil]=useState('');
  const [indefinite,setIndefinite]=useState(false);
  const [reason,setReason]=useState('Cliente no compra');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');
  const normalized=text(currentState).toLowerCase();
  const isPaused=normalized.includes('paus');
  const isClosed=normalized.includes('baja')||normalized.includes('perdido')||normalized.includes('cerrad');
  const canReactivate=isPaused||isClosed;
  const pauseSummary=useMemo(()=>indefinite?'Pausa sin fecha de reactivación':pauseUntil?`Pausa hasta ${pauseUntil}`:'Selecciona una fecha o marca pausa indefinida',[indefinite,pauseUntil]);

  function closeModal(){setMode(null);setMessage('');}
  function prepare(){
    if(!canonical){setMessage('Esta acción solo estará disponible sobre el expediente canónico.');return;}
    if(mode==='pause'&&!indefinite&&!pauseUntil){setMessage('Indica hasta cuándo se pausa o marca pausa indefinida.');return;}
    if(mode==='close'&&!reason){setMessage('Selecciona un motivo de baja.');return;}
    setMessage(`Preparado para registrar de forma auditada en backend: ${mode==='pause'?pauseSummary:mode==='close'?`Baja · ${reason}`:'Reactivación'}. No se ejecuta todavía porque el contrato canónico de ciclo de vida aún no existe; no se inventan campos ni estados.`);
  }

  return <section className="exp-life" aria-label="Ciclo de vida del expediente">
    <div className="exp-life-head"><div><span>CICLO DE VIDA</span><strong>Pausar, dar de baja o retomar</strong></div><small>Nunca borra el expediente ni su histórico</small></div>
    <div className="exp-life-actions">
      {!canReactivate&&<button type="button" onClick={()=>setMode('pause')}><PauseCircle size={17}/><span><b>Pausar</b><small>Hasta una fecha o sin fecha</small></span></button>}
      {!isClosed&&<button type="button" onClick={()=>setMode('close')}><Power size={17}/><span><b>Dar de baja</b><small>Sale del pipeline, conserva todo</small></span></button>}
      {canReactivate&&<button type="button" className="primary-life" onClick={()=>setMode('reactivate')}><RotateCcw size={17}/><span><b>Reactivar expediente</b><small>Vuelve al circuito activo</small></span></button>}
    </div>
    {mode&&<div className="exp-life-modal" role="dialog" aria-modal="true" aria-label={mode==='pause'?'Pausar expediente':mode==='close'?'Dar de baja expediente':'Reactivar expediente'}>
      <div className="exp-life-card">
        <div className="exp-life-modal-head"><div><span>ACCIÓN CON CONFIRMACIÓN</span><h3>{mode==='pause'?'Pausar expediente':mode==='close'?'Dar de baja expediente':'Reactivar expediente'}</h3></div><button type="button" aria-label="Cerrar" onClick={closeModal}><X size={18}/></button></div>
        {mode==='pause'&&<div className="exp-life-form"><p>El expediente queda fuera del pipeline activo durante la pausa, pero conserva todos sus datos y podrá retomarse en cualquier momento.</p><label>Reactivar a partir de<input type="date" value={pauseUntil} disabled={indefinite} onChange={e=>setPauseUntil(e.target.value)}/></label><label className="exp-life-check"><input type="checkbox" checked={indefinite} onChange={e=>setIndefinite(e.target.checked)}/> Pausa indefinida</label><div className="exp-life-preview"><b>Vista previa</b><span>{pauseSummary}</span></div></div>}
        {mode==='close'&&<div className="exp-life-form"><p>Dar de baja no elimina nada. El expediente deja de contar como activo o previsión y podrá reactivarse después.</p><label>Motivo<select value={reason} onChange={e=>setReason(e.target.value)}>{CLOSE_REASONS.map(x=><option key={x}>{x}</option>)}</select></label><label>Observación opcional<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Contexto útil para una futura reactivación"/></label></div>}
        {mode==='reactivate'&&<div className="exp-life-form"><p>La reactivación debe conservar fecha de baja/pausa, motivo, fecha de reactivación y trazabilidad del actor.</p><div className="exp-life-preview"><ArchiveRestore size={18}/><span>El expediente volverá al circuito activo sin crear uno nuevo.</span></div></div>}
        {message&&<div className="exp-life-message">{message}</div>}
        <div className="exp-life-confirm"><button type="button" onClick={closeModal}>Cancelar</button><button type="button" className="primary-life" onClick={prepare}>Preparar cambio</button></div>
        <small className="exp-life-contract">Expediente: {expedienteCode}. La ejecución real queda bloqueada hasta disponer del endpoint canónico auditado de ciclo de vida.</small>
      </div>
    </div>}
  </section>;
}
