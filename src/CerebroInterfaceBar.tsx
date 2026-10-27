import {ArrowLeft,CircuitBoard,Globe2,Network,Sparkles} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import './cerebro-interface-bar.css';

export type CerebroPrimaryView='JARVIS'|'TECNICA'|'NEURONAL'|'NAVEGADOR';

type Props={view:CerebroPrimaryView;onViewChange:(view:CerebroPrimaryView)=>void};

const ITEMS:[CerebroPrimaryView,string,typeof Sparkles][]=[
 ['JARVIS','JARVIS',Sparkles],
 ['TECNICA','TÉCNICA',CircuitBoard],
 ['NEURONAL','NEURONAL',Network],
 ['NAVEGADOR','NAVEGADOR',Globe2],
];

export default function CerebroInterfaceBar({view,onViewChange}:Props){
 const navigate=useNavigate();
 return <header className="cerebro-interface-bar" aria-label="Interfaces de CEREBRO">
  <nav className="cerebro-interface-nav" aria-label="Cambiar interfaz de CEREBRO">
   <button type="button" className="cerebro-interface-exit" onClick={()=>navigate('/inicio')}><ArrowLeft size={15}/><span>VOLVER A APP</span></button>
   {ITEMS.map(([key,label,Icon])=><button key={key} type="button" className={view===key?'is-active':''} aria-pressed={view===key} onClick={()=>onViewChange(key)}><Icon size={14}/><span>{label}</span></button>)}
  </nav>
 </header>;
}
