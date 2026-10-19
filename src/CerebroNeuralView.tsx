import {useEffect,useState} from 'react';
import {Maximize2,Minimize2,ShieldCheck} from 'lucide-react';
import './cerebro-neural-view.css';

export default function CerebroNeuralView(){
 const[fullscreen,setFullscreen]=useState(false);

 useEffect(()=>{
  const sync=()=>setFullscreen(Boolean(document.fullscreenElement?.classList.contains('cerebro-console-host')));
  document.addEventListener('fullscreenchange',sync);
  sync();
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[]);

 async function toggleFullscreen(){
  const host=document.querySelector<HTMLElement>('.cerebro-console-host');
  if(!host)return;
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else await host.requestFullscreen({navigationUI:'hide'});
  }catch{/* Browser/OS may deny fullscreen outside a direct user gesture. */}
 }

 return <section className="cerebro-neural-view" aria-label="CEREBRO · Vista Neural V1.4.25">
  <iframe
   className="cerebro-neural-frame"
   src="/cerebro-visual/candidate-v1425.html"
   title="CEREBRO OS · Neural V1.4.25"
   aria-label="Representación Neural recuperada de CEREBRO V1.4.25"
  />
  <div className="cerebro-neural-toolbar" aria-label="Controles de la vista Neural">
   <span className="cerebro-neural-badge"><ShieldCheck size={15}/>NEURAL V1.4.25 · RECUPERADA</span>
   <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen} title={fullscreen?'Salir de pantalla completa':'Pantalla completa'}>
    {fullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}<span>{fullscreen?'Salir':'Pantalla completa'}</span>
   </button>
  </div>
 </section>;
}
