import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {anaVertical} from './assets/visualAssets';
import './inmobiliarias-polish.css';

export default function DocumentDetailAnaGuard(){
 const location=useLocation(),navigate=useNavigate();
 const active=/^\/documentacion\/[^/]+$/.test(location.pathname)&&!location.pathname.endsWith('/nuevo');
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  if(!active){setHost(null);return;}
  let mount:HTMLElement|null=null;
  let hiddenCard:HTMLElement|null=null;
  const find=()=>{
   const content=document.querySelector<HTMLElement>('.ops-content');
   if(!content)return;
   if(!mount){
    mount=document.createElement('div');
    mount.className='document-detail-ana-host';
    content.insertBefore(mount,content.firstChild);
    setHost(mount);
   }
   const cards=[...content.querySelectorAll<HTMLElement>('.ops-ana-card')];
   hiddenCard=cards[0]??null;
   if(hiddenCard)hiddenCard.style.display='none';
  };
  find();
  const obs=new MutationObserver(find);
  obs.observe(document.body,{childList:true,subtree:true});
  return()=>{obs.disconnect();mount?.remove();if(hiddenCard)hiddenCard.style.display='';setHost(null)};
 },[active,location.pathname]);
 if(!active||!host)return null;
 const resource=encodeURIComponent(location.pathname.replace(/^\//,''));
 return createPortal(
  <section className="inmo-ana-hero document-detail-ana-hero" data-testid="document-detail-ana-hero">
   <div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div>
   <div className="inmo-ana-body">
    <span>ANA · DOCUMENTO</span>
    <h2>Vamos a revisar este documento con contexto</h2>
    <p>Te ayudo a comprobar el estado del documento, su calidad, qué puede afectar al expediente y cuál es el siguiente paso antes de guardar cambios.</p>
    <div className="inmo-next">
     <button type="button" onClick={()=>navigate(`/ana?mode=do&resource=${resource}`)}><b>1</b><strong>Que lo haga Ana</strong><small>Preparar revisión →</small></button>
     <button type="button" onClick={()=>navigate(`/ana?mode=help&resource=${resource}`)}><b>2</b><strong>Ayúdame</strong><small>Revisar paso a paso →</small></button>
     <button type="button" onClick={()=>document.querySelector<HTMLElement>('.ops-table-card')?.scrollIntoView({behavior:'smooth',block:'start'})}><b>3</b><strong>Lo hago yo</strong><small>Ir a la ficha ↓</small></button>
    </div>
   </div>
  </section>,host
 );
}
