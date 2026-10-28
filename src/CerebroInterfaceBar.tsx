import {useNavigate} from 'react-router-dom';
import './cerebro-interface-bar.css';

export type CerebroPrimaryView='JARVIS'|'OPERATIVA'|'NEURONAL'|'NAVEGADOR';

type Props={view:CerebroPrimaryView;onViewChange:(view:CerebroPrimaryView)=>void};

const ITEMS:[CerebroPrimaryView,string][]=[
 ['JARVIS','Jarvis'],
 ['OPERATIVA','Operativa'],
 ['NEURONAL','Neuronal'],
 ['NAVEGADOR','Navegador'],
];

export default function CerebroInterfaceBar({view,onViewChange}:Props){
 const navigate=useNavigate();
 return <header className="cerebro-interface-bar" aria-label="Navegación principal de CEREBRO">
  <nav className="cerebro-interface-nav" aria-label="Interfaces de CEREBRO">
   <button type="button" className="cerebro-interface-home" onClick={()=>navigate('/inicio')}>Inicio</button>
   {ITEMS.map(([key,label])=><button key={key} type="button" className={view===key?'is-active':''} aria-pressed={view===key} onClick={()=>onViewChange(key)}>{label}</button>)}
  </nav>
 </header>;
}
