import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import './direction-home-ana-correction.css';

export default function DirectionHomeAnaCorrection(){
  const location=useLocation(),navigate=useNavigate();
  const active=location.pathname.replace(/\/+$/,'')==='/inicio';
  const[host,setHost]=useState<HTMLElement|null>(null);
  const[correction,setCorrection]=useState('');
  const[reason,setReason]=useState('');

  useEffect(()=>{
    if(!active){setHost(null);return;}
    let mount:HTMLElement|null=null;
    const find=()=>{
      const target=document.querySelector('.dir-right-top');
      if(!target)return;
      if(!mount){
        mount=document.createElement('div');
        mount.className='dir-home-ana-correction-host';
        target.insertBefore(mount,target.firstChild);
        setHost(mount);
      }
    };
    find();
    const obs=new MutationObserver(find);
    obs.observe(document.body,{childList:true,subtree:true});
    return()=>{obs.disconnect();mount?.remove();setHost(null)};
  },[active]);

  if(!active||!host)return null;
  function prepare(){
    if(!correction.trim()||!reason.trim())return;
    const q=new URLSearchParams({mode:'help',resource:'inicio-direccion',correction:correction.trim(),reason:reason.trim()});
    navigate(`/ana?${q.toString()}`);
  }
  return createPortal(
    <article className="dir-home-ana-correction" data-testid="direction-home-ana-correction">
      <div className="dir-home-ana-correction-copy">
        <span>CORREGIR A ANA</span>
        <h3>Ana, ¿en qué me equivoco?</h3>
        <p>Corrige aquí cualquier lectura del Inicio. Ana llevará el dato y el motivo con el contexto de este panel para revisarlo.</p>
      </div>
      <div className="dir-home-ana-correction-fields">
        <textarea rows={2} value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Qué cambiarías..."/>
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo de la corrección"/>
        <button type="button" disabled={!correction.trim()||!reason.trim()} onClick={prepare}>Revisar con Ana</button>
      </div>
    </article>,host
  );
}
