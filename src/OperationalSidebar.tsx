import {useNavigate} from 'react-router-dom';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
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

export default function OperationalSidebar({navigation,activeRoute,anaSubtitle='Cuando quieras, avanzamos paso a paso.',anaRoute='/ana',variant='default',className='',theme,ariaLabel,onNavigate}:Props){
 const navigate=useNavigate();
 function go(route:string){navigate(route);onNavigate?.();}
 const anaCard=<button className="ops-ana ops-ana-modern" aria-label="Hablar con Ana" onClick={()=>go(anaRoute)}>
  <span className="ops-ana-avatar-wrap" aria-hidden="true"><img className="ops-ana-avatar dir-help-avatar" src={anaAvatar} alt=""/><i/></span>
  <span className="ops-ana-copy"><small className="ops-ana-kicker">ANA · ASISTENTE FÉNIX</small><strong>Ana está contigo</strong><small className="ops-ana-subtitle">{anaSubtitle}</small></span>
  <span className="ops-ana-arrow" aria-hidden="true">→</span>
 </button>;
 if(variant==='direction')return <aside className={`ops-side dir-sidebar ${className}`.trim()} data-theme={theme} aria-label={ariaLabel}>
  <button className="ops-brand dir-brand" onClick={()=>go('/inicio')} aria-label="Inicio Fénix Capital"><img className="dir-brand-logo" src={fenixLogo} alt=""/><span><strong>FÉNIX CAPITAL</strong></span></button>
  <nav className="dir-nav">{navigation.map(item=><button key={item.route} className={item.route===activeRoute?'dir-nav-item active':'dir-nav-item'} onClick={()=>go(item.route)}><span>{item.label}</span></button>)}</nav>
  {anaCard}
 </aside>;
 return <aside className={`ops-side ${className}`.trim()} data-theme={theme} aria-label={ariaLabel}>
  <button className="ops-brand" onClick={()=>go('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
  <nav>{navigation.map(item=><button key={item.route} className={item.route===activeRoute?'active':''} onClick={()=>go(item.route)}>{item.label}</button>)}</nav>
  {anaCard}
 </aside>;
}
