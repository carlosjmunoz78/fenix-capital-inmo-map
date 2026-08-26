import {useNavigate} from 'react-router-dom';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import type {NavItem} from './masterNavigation';

type Props={
 navigation:NavItem[];
 activeRoute:string;
 anaSubtitle?:string;
 anaRoute?:string;
 variant?:'default'|'direction';
};

export default function OperationalSidebar({navigation,activeRoute,anaSubtitle='Cuando quieras, avanzamos paso a paso.',anaRoute='/ana',variant='default'}:Props){
 const navigate=useNavigate();
 if(variant==='direction')return <aside className="ops-side dir-sidebar">
  <button className="ops-brand dir-brand" onClick={()=>navigate('/inicio')} aria-label="Inicio Fénix Capital"><img className="dir-brand-logo" src={fenixLogo} alt=""/><span><strong>FÉNIX CAPITAL</strong></span></button>
  <nav className="dir-nav">{navigation.map(item=><button key={item.route} className={item.route===activeRoute?'dir-nav-item active':'dir-nav-item'} onClick={()=>navigate(item.route)}><span>{item.label}</span></button>)}</nav>
  <div className="dir-help-card"><div><strong>¿Necesitas ayuda?</strong><span>{anaSubtitle}</span></div><div className="dir-help-person"><img className="dir-help-avatar" src={anaAvatar} alt="Ana"/></div><button onClick={()=>navigate(anaRoute)}>Hablar con Ana <span>→</span></button></div>
 </aside>;
 return <aside className="ops-side">
  <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
  <nav>{navigation.map(item=><button key={item.route} className={item.route===activeRoute?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
  <button className="ops-ana" onClick={()=>navigate(anaRoute)}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>{anaSubtitle}</small></span></button>
 </aside>;
}
