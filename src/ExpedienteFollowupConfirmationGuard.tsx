import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import './expediente-followup-confirm.css';

type Draft={notes:string;nextAction:string}|null;

export default function ExpedienteFollowupConfirmationGuard(){
 const {pathname}=useLocation();
 const active=/^\/expedientes\/[^/]+$/.test(pathname)&&pathname!=='/expedientes/nuevo';
 const[draft,setDraft]=useState<Draft>(null);
 const[target,setTarget]=useState<HTMLButtonElement|null>(null);

 useEffect(()=>{
  if(!active){setDraft(null);setTarget(null);return;}
  let bypass=false;
  const section=()=>document.getElementById('seguimiento-contextual');
  const onClick=(event:MouseEvent)=>{
   if(bypass){bypass=false;return;}
   const button=(event.target as HTMLElement|null)?.closest('button') as HTMLButtonElement|null;
   const root=section();
   if(!button||!root||!root.contains(button))return;
   if(button.textContent?.trim()!=='Guardar seguimiento')return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   const notes=(root.querySelector('textarea') as HTMLTextAreaElement|null)?.value.trim()||'';
   const next=(root.querySelector('input[type="date"]') as HTMLInputElement|null)?.value||'';
   if(!notes&&!next)return;
   setDraft({notes,nextAction:next});setTarget(button);
  };
  const invalidate=(event:Event)=>{const root=section();if(root&&root.contains(event.target as Node)){setDraft(null);setTarget(null);}};
  document.addEventListener('click',onClick,true);
  document.addEventListener('input',invalidate,true);
  document.addEventListener('change',invalidate,true);
  const confirm=()=>{if(!target)return;const btn=target;setDraft(null);setTarget(null);bypass=true;btn.click();};
  (window as any).__fenixConfirmExpedienteFollowup=confirm;
  return()=>{document.removeEventListener('click',onClick,true);document.removeEventListener('input',invalidate,true);document.removeEventListener('change',invalidate,true);delete (window as any).__fenixConfirmExpedienteFollowup;};
 },[active,target]);

 if(!active||!draft)return null;
 return <div className="exp-followup-confirm" role="dialog" aria-modal="true" aria-label="Vista previa del seguimiento">
  <div className="exp-followup-confirm-card">
   <span>VISTA PREVIA OBLIGATORIA</span>
   <h2>Revisar seguimiento antes de guardar</h2>
   <p>No se ha escrito nada todavía. Confirma únicamente estos cambios:</p>
   <dl><div><dt>Notas</dt><dd>{draft.notes||'Sin cambios'}</dd></div><div><dt>Próxima acción</dt><dd>{draft.nextAction||'Sin cambios'}</dd></div></dl>
   <div className="exp-followup-confirm-actions"><button type="button" onClick={()=>{setDraft(null);setTarget(null)}}>Volver</button><button type="button" className="primary" onClick={()=>{const fn=(window as any).__fenixConfirmExpedienteFollowup;if(typeof fn==='function')fn();}}>Confirmar y guardar</button></div>
  </div>
 </div>;
}
