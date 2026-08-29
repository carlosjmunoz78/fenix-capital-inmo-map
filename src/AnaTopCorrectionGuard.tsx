import {Fragment,useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {anaVertical} from './assets/visualAssets';
import './ana-top-correction.css';

const TARGET_SELECTOR='[class*="-ana-hero"], .ops-ana-card, .dir-priority-copy';

function resourceFromPath(pathname:string){
 const clean=pathname.replace(/^\/+|\/+$/g,'');
 const root=clean.split('/')[0]||'inicio';
 const map:Record<string,string>={
  expedientes:'expediente',
  bancos:'banco',
  contactos:'contacto',
  inmobiliarias:'inmobiliaria',
  tasaciones:'tasacion',
  firmas:'firma',
  documentacion:'documentacion',
  herencias:'herencia',
  'obras-nuevas':'obra-nueva',
  informes:'informe'
 };
 return map[root]||root;
}

function specialCreateCopy(pathname:string){
 if(pathname==='/herencias/nuevo')return{
  label:'ANA · NUEVA HERENCIA',
  title:'Vamos a abrir la herencia con el caso bien ordenado',
  body:'Te ayudo a identificar intervinientes, documentación, situación administrativa y siguiente paso antes de iniciar las gestiones.'
 };
 if(pathname==='/obras-nuevas/nuevo')return{
  label:'ANA · NUEVA OBRA NUEVA',
  title:'Vamos a abrir la obra nueva con todo lo necesario',
  body:'Te ayudo a ordenar promotor, documentación, validaciones, interlocutores y siguiente acción para que la operación empiece en la fase correcta.'
 };
 return null;
}

function standardizeHero(hero:Element){
 if(!hero.matches('[class*="-ana-hero"]')||hero.classList.contains('ana-standardized-hero'))return;
 hero.classList.add('ana-standardized-hero');
 const children=Array.from(hero.children);
 const photo=children.find(el=>Boolean(el.querySelector(':scope > img[alt="Ana"]')));
 if(photo&&!photo.classList.contains('inmo-ana-photo'))photo.classList.add('inmo-ana-photo');
 const body=children.find(el=>Boolean(el.querySelector(':scope > h2')));
 if(body&&!body.classList.contains('inmo-ana-body'))body.classList.add('inmo-ana-body');
 const next=body?Array.from(body.children).find(el=>el.tagName==='DIV'&&Boolean(el.querySelector(':scope > button'))):null;
 if(next&&!next.classList.contains('inmo-next'))next.classList.add('inmo-next');
}

export default function AnaTopCorrectionGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[target,setTarget]=useState<Element|null>(null);
 const[specialHost,setSpecialHost]=useState<HTMLElement|null>(null);
 const[correction,setCorrection]=useState('');
 const[reason,setReason]=useState('');
 const specialCopy=specialCreateCopy(location.pathname);

 useEffect(()=>{
  setCorrection('');setReason('');setTarget(null);setSpecialHost(null);
  let host:HTMLElement|null=null;
  if(specialCreateCopy(location.pathname)){
   const content=document.querySelector('.ops-content');
   if(content){
    host=document.createElement('div');
    host.className='special-create-ana-host';
    content.insertBefore(host,content.firstChild);
    setSpecialHost(host);
   }
  }
  const find=()=>{
   if(location.pathname.replace(/\/+$/,'')==='/inicio'){
    setTarget(current=>current===null?current:null);
    return;
   }
   const candidates=[...document.querySelectorAll(TARGET_SELECTOR)];
   const visible=candidates.find(el=>{
    const r=(el as HTMLElement).getBoundingClientRect();
    const style=getComputedStyle(el as HTMLElement);
    return r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden';
   })??null;
   if(!visible){setTarget(current=>current===null?current:null);return;}
   standardizeHero(visible);
   const obsoleteReportCorrection=visible.querySelector(':scope > .informes-correct');
   if(obsoleteReportCorrection&&!obsoleteReportCorrection.classList.contains('ana-obsolete-correction'))obsoleteReportCorrection.classList.add('ana-obsolete-correction');
   const localHost=visible.querySelector(':scope > .inmo-correct');
   if(localHost){
    if(!localHost.classList.contains('ana-standard-correction-host'))localHost.classList.add('ana-standard-correction-host');
    setTarget(current=>current===localHost?current:localHost);
    return;
   }
   setTarget(current=>current===visible?current:visible);
  };
  find();
  const obs=new MutationObserver(find);
  obs.observe(document.body,{childList:true,subtree:true});
  const raf=requestAnimationFrame(find);
  return()=>{cancelAnimationFrame(raf);obs.disconnect();host?.remove()};
 },[location.pathname]);

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

 return <Fragment>
  {specialCopy&&specialHost&&createPortal(
   <section className="inmo-ana-hero special-create-ana-hero" data-testid="special-create-ana-hero">
    <div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div>
    <div className="inmo-ana-body">
     <span>{specialCopy.label}</span>
     <h2>{specialCopy.title}</h2>
     <p>{specialCopy.body}</p>
     <div className="inmo-next">
      <button type="button" onClick={()=>navigate(`/ana?mode=do&resource=${encodeURIComponent(resourceFromPath(location.pathname))}&intent=nuevo`)}><b>1</b><strong>Que lo haga Ana</strong><small>Preparar alta →</small></button>
      <button type="button" onClick={()=>navigate(`/ana?mode=help&resource=${encodeURIComponent(resourceFromPath(location.pathname))}&intent=nuevo`)}><b>2</b><strong>Ayúdame</strong><small>Guiarme →</small></button>
      <button type="button"><b>3</b><strong>Lo hago yo</strong><small>Continuar abajo ↓</small></button>
     </div>
    </div>
   </section>,specialHost
  )}
  {target&&createPortal(
   <article className="ana-top-correction" data-testid="ana-top-correction">
    <div className="ana-top-correction-copy">
     <span>CORREGIR A ANA</span>
     <h3>¿En qué me equivoco?</h3>
     <p>Dime qué dato, criterio o recomendación está mal. Lo revisaré con el contexto de esta pantalla antes de incorporar la corrección.</p>
    </div>
    <div className="ana-top-correction-fields">
     <textarea rows={3} value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Qué cambiarías..." aria-label="Corrección para Ana"/>
     <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo de la corrección" aria-label="Motivo de la corrección"/>
     <button type="button" disabled={!correction.trim()} onClick={prepare}>Preparar para revisión</button>
    </div>
   </article>,target
  )}
 </Fragment>;
}
