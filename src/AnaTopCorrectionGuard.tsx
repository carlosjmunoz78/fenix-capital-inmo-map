import {Fragment,useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {anaVertical} from './assets/visualAssets';
import './ana-top-correction.css';

const MODULE_HERO_SELECTOR='[class*="-ana-hero"], .vis-ana';
const FALLBACK_ANA_SELECTOR='.ops-ana-card, .dir-priority-copy';
const TITLE_SELECTOR=':scope > .ops-title, :scope > .inmo-title, :scope > .tas-title, :scope > .firmas-title, :scope > .fin-title, :scope > .vis-title, :scope > .informes-title, :scope > .inmo-detail-title';
const KPI_SELECTOR=':scope > .tas-kpis, :scope > .firmas-kpis, :scope > .fin-kpis, :scope > .vis-kpis, :scope > .inmo-kpis, :scope > [class$="-kpis"]';

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
 if(pathname==='/documentacion/nuevo')return{
  label:'ANA · NUEVA DOCUMENTACIÓN',
  title:'Vamos a crear el documento con el mismo criterio del resto de la app',
  body:'Te ayudo a clasificarlo, vincularlo al contexto correcto y dejar preparado el siguiente paso sin inventar datos.'
 };
 return null;
}

function standardizeHero(hero:Element){
 if((!hero.matches('[class*="-ana-hero"]')&&!hero.matches('.vis-ana'))||hero.classList.contains('ana-standardized-hero'))return;
 hero.classList.add('ana-standardized-hero');
 const children=Array.from(hero.children);
 const photo=children.find(el=>Boolean(el.querySelector(':scope > img[alt="Ana"]')));
 if(photo&&!photo.classList.contains('inmo-ana-photo'))photo.classList.add('inmo-ana-photo');
 const body=children.find(el=>Boolean(el.querySelector(':scope > h2')));
 if(body&&!body.classList.contains('inmo-ana-body'))body.classList.add('inmo-ana-body');
 const next=body?Array.from(body.children).find(el=>el.tagName==='DIV'&&Boolean(el.querySelector(':scope > button'))):null;
 if(next&&!next.classList.contains('inmo-next'))next.classList.add('inmo-next');
}

function normalizeHeaderBeforeAna(hero:Element){
 const anchor=(hero.closest('.special-create-ana-host') as Element|null)??hero;
 const parent=anchor.parentElement;
 if(!parent)return;
 const title=parent.querySelector(TITLE_SELECTOR);
 if(title&&title!==anchor&&title.nextElementSibling!==anchor)parent.insertBefore(title,anchor);
}

function normalizeEvidenceLauncher(hero:Element){
 const launcher=document.querySelector<HTMLElement>('[data-testid="context-evidence-open"]');
 if(!launcher)return;
 const content=(hero.closest('.ops-content,.dir-content') as HTMLElement|null)??hero.parentElement;
 if(!content)return;
 const kpis=content.querySelector(KPI_SELECTOR);
 const anchor=kpis??hero;
 if(anchor.parentElement===content&&anchor.nextElementSibling!==launcher)content.insertBefore(launcher,anchor.nextElementSibling);
 launcher.classList.add('context-evidence-inline');
 launcher.style.setProperty('position','static','important');
 launcher.style.setProperty('right','auto','important');
 launcher.style.setProperty('bottom','auto','important');
 launcher.style.setProperty('z-index','1','important');
 launcher.style.setProperty('display','inline-flex','important');
 launcher.style.setProperty('width','100%','important');
 launcher.style.setProperty('justify-content','center','important');
 launcher.style.setProperty('border','1px solid #f4741f','important');
 launcher.style.setProperty('border-radius','12px','important');
 launcher.style.setProperty('padding','12px 16px','important');
 launcher.style.setProperty('background','#f4741f','important');
 launcher.style.setProperty('color','#fff','important');
 launcher.style.setProperty('box-shadow','none','important');
 launcher.style.setProperty('margin','0','important');
 for(const duplicate of document.querySelectorAll<HTMLElement>('.firma-upload-inline,.doc-upload-inline'))duplicate.style.setProperty('display','none','important');
}

function visibleElement(selector:string){
 const candidates=[...document.querySelectorAll(selector)];
 return candidates.find(el=>{
  const r=(el as HTMLElement).getBoundingClientRect();
  const style=getComputedStyle(el as HTMLElement);
  return r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden';
 })??null;
}

function isLegacyCorrectionHost(el:Element){
 const text=(el.textContent||'').toLowerCase();
 return Boolean(
  el.querySelector('textarea[placeholder*="cambiar" i],textarea[placeholder*="correg" i]')||
  text.includes('qué necesita atención')||
  text.includes('en qué me equivoco')||
  text.includes('corregir a ana')||
  text.includes('biblioteca disponible')
 );
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
   const visible=visibleElement(MODULE_HERO_SELECTOR)??visibleElement(FALLBACK_ANA_SELECTOR);
   if(!visible){setTarget(current=>current===null?current:null);return;}
   if(specialCopy&&visible.matches('.ops-ana-card')){
    visible.classList.add('ana-obsolete-correction');
    return;
   }
   standardizeHero(visible);
   normalizeHeaderBeforeAna(visible);
   normalizeEvidenceLauncher(visible);

   for(const child of Array.from(visible.children)){
    if(child.matches('[class$="-correct"], .informes-correct, .comm-correct')&&!child.matches('.inmo-correct')&&!child.classList.contains('ana-obsolete-correction')){
     child.classList.add('ana-obsolete-correction');
    }
   }

   const localHost=visible.querySelector(':scope > .inmo-correct');
   if(localHost&&isLegacyCorrectionHost(localHost)){
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
 },[location.pathname,specialCopy]);

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
