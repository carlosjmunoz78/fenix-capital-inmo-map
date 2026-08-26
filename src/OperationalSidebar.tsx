import {useNavigate} from 'react-router-dom';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import type {NavItem} from './masterNavigation';

type Props={
 navigation:NavItem[];
 activeRoute:string;
 anaSubtitle?:string;
};

export default function OperationalSidebar({navigation,activeRoute,anaSubtitle='Cuando quieras, avanzamos paso a paso.'}:Props){
 const navigate=useNavigate();
 return <aside className="ops-side">
  <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
  <nav>{navigation.map(item=><button key={item.route} className={item.route===activeRoute?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
  <button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>{anaSubtitle}</small></span></button>
 </aside>;
}
