import {useNavigate} from 'react-router-dom';
import {fenixLogo} from './assets/visualAssets';
import type {NavItem} from './masterNavigation';

type Props={
 navigation:NavItem[];
 activeRoute:string;
 anaSubtitle?:string;
 anaRoute?:string;
 variant?:'default'|'direction';
 className?:string;
 theme?:string;
 ariaLabel?:string;
 onNavigate?:()=>void;
};

export default function OperationalSidebar({navigation,activeRoute,variant='default',className='',theme,ariaLabel,onNavigate}:Props){
 const navigate=useNavigate();
 function go(route:string){navigate(route);onNavigate?.();}
 if(variant==='direction')return <aside className={`ops-side dir-sidebar ${className}`.trim()} data-theme={theme} aria-label={ariaLabel}>
  <button className="ops-brand dir-brand" onClick={()=>go('/inicio')} aria-label="Inicio Fénix Capital"><img className="dir-brand-logo" src={fenixLogo} alt=""/><span><strong>FÉNIX CAPITAL</strong></span></button>
  <nav className="dir-nav">{navigation.map(item=><button key={item.route} className={item.route===activeRoute?'dir-nav-item active':'dir-nav-item'} onClick={()=>go(item.route)}><span>{item.label}</span></button>)}</nav>
 </aside>;
 return <aside className={`ops-side ${className}`.trim()} data-theme={theme} aria-label={ariaLabel}>
  <button className="ops-brand" onClick={()=>go('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
  <nav>{navigation.map(item=><button key={item.route} className={item.route===activeRoute?'active':''} onClick={()=>go(item.route)}>{item.label}</button>)}</nav>
 </aside>;
}
