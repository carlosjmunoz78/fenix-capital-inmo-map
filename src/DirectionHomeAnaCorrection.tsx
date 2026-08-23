import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';

export default function DirectionHomeAnaCorrection(){
  const location=useLocation(),navigate=useNavigate();
  const active=location.pathname.replace(/\/+$/,'')==='/inicio';
  const[target,setTarget]=useState<Element|null>(null);
  const[correction,setCorrection]=useState('');
  const[reason,setReason]=useState('');

  useEffect(()=>{
    if(!active){setTarget(null);return;}
    const find=()=>setTarget(document.querySelector('.dir-priority-copy'));
    find();
    const obs=new MutationObserver(find);
    obs.observe(document.body,{childList:true,subtree:true});
    return()=>obs.disconnect();
  },[active]);

  if(!active||!target)return null;
  function prepare(){
    if(!correction.trim()||!reason.trim())return;
    const q=new URLSearchParams({mode:'help',resource:'inicio-direccion',correction:correction.trim(),reason:reason.trim()});
    navigate(`/ana?${q.toString()}`);
  }
  return createPortal(
    <article className="dir-home-ana-correction" data-testid="direction-home-ana-correction">
      <span>CORREGIR A ANA</span>
      <h3>¿En qué me equivoco?</h3>
      <p>Escribe qué cambiarías y por qué. La corrección se lleva a Ana con el contexto de Inicio para revisión; no modifica reglas automáticamente.</p>
      <textarea rows={3} value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Qué cambiarías..."/>
      <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo de la corrección"/>
      <button type="button" disabled={!correction.trim()||!reason.trim()} onClick={prepare}>Preparar para revisión</button>
    </article>,target
  );
}
