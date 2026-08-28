import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import './ana-top-correction.css';

const TARGET_SELECTOR='[class*="-ana-hero"], .ops-ana-card, .dir-priority-copy';

function resourceFromPath(pathname:string){
 const clean=pathname.replace(/^\/+|\/+$/g,'');
 return clean||'inicio';
}

export default function AnaTopCorrectionGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[target,setTarget]=useState<Element|null>(null);
 const[correction,setCorrection]=useState('');
 const[reason,setReason]=useState('');

 useEffect(()=>{
  setCorrection('');setReason('');
  const find=()=>{
   const candidates=[...document.querySelectorAll(TARGET_SELECTOR)];
   const visible=candidates.find(el=>{
    const r=(el as HTMLElement).getBoundingClientRect();
    const style=getComputedStyle(el as HTMLElement);
    return r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden';
   })??null;
   setTarget(visible);
  };
  find();
  const obs=new MutationObserver(find);
  obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  return()=>obs.disconnect();
 },[location.pathname]);

 if(!target)return null;
 function prepare(){
  if(!correction.trim())return;
  const q=new URLSearchParams({
   mode:'help',
   resource:resourceFromPath(location.pathname),
   correction:correction.trim(),
   ...(reason.trim()?{reason:reason.trim()}:{})
  });
  navigate(`/ana?${q.toString()}`);
 }
 return createPortal(
  <article className="ana-top-correction" data-testid="ana-top-correction">
   <div className="ana-top-correction-copy">
    <span>CORREGIR A ANA</span>
    <h3>Ana, ¿en qué me equivoco?</h3>
    <p>Dime qué dato, criterio o recomendación está mal. Lo revisaré con el contexto de esta pantalla antes de incorporar la corrección.</p>
   </div>
   <div className="ana-top-correction-fields">
    <textarea rows={3} value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Ej.: aquí no es así; lo correcto es..." aria-label="Corrección para Ana"/>
    <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo o contexto adicional (opcional)" aria-label="Motivo de la corrección"/>
    <button type="button" disabled={!correction.trim()} onClick={prepare}>Revisar corrección con Ana</button>
   </div>
  </article>,target
 );
}
