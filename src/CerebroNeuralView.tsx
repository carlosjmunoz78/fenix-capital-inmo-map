import {useEffect,useState} from 'react';
import {Maximize2,Minimize2,ShieldCheck} from 'lucide-react';
import './cerebro-neural-view.css';

export default function CerebroNeuralView(){
 const[fullscreen,setFullscreen]=useState(false);
 useEffect(()=>{const sync=()=>setFullscreen(Boolean(document.fullscreenElement?.classList.contains('cerebro-interface-stage')));document.addEventListener('fullscreenchange',sync);sync();return()=>document.removeEventListener('fullscreenchange',sync)},[]);
 async function toggleFullscreen(){const stage=document.querySelector<HTMLElement>('.cerebro-interface-stage');if(!stage)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen({navigationUI:'hide'})}catch{/* Browser/OS may deny fullscreen outside a direct gesture. */}}
 return <section className="cerebro-neural-view" aria-label="CEREBRO · Interfaz Neuronal V1.4.25">
  <iframe className="cerebro-neural-frame" src="/cerebro-visual/candidate-v1425.html" title="CEREBRO OS · Neuronal V1.4.25" aria-label="Representación Neuronal recuperada de CEREBRO V1.4.25"/>
  <div className="cerebro-neural-toolbar" aria-label="Controles de la interfaz Neuronal">
   <span className="cerebro-neural-badge"><ShieldCheck size={14}/>NEURONAL V1.4.25</span>
   <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen}>{fullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}<span>{fullscreen?'Salir':'Pantalla completa'}</span></button>
  </div>
 </section>;
}
