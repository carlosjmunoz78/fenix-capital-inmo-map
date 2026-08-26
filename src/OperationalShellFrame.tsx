import type {ReactNode} from 'react';
import type {NavItem} from './masterNavigation';
import OperationalSidebar from './OperationalSidebar';
import OperationalTopbar from './OperationalTopbar';

type Theme='light'|'dark';

type Props={
 className?:string;
 theme:Theme;
 navigation:NavItem[];
 activeRoute:string;
 anaSubtitle?:string;
 query:string;
 onQueryChange:(value:string)=>void;
 searchPlaceholder:string;
 name:string;
 role:string;
 avatarUrl?:string;
 initials:string;
 onToggleTheme:()=>void;
 onLogout:()=>void|Promise<void>;
 contentClassName?:string;
 children:ReactNode;
};

export default function OperationalShellFrame({className='',theme,navigation,activeRoute,anaSubtitle,query,onQueryChange,searchPlaceholder,name,role,avatarUrl='',initials,onToggleTheme,onLogout,contentClassName='',children}:Props){
 return <div className={`ops-root ${className}`.trim()} data-theme={theme}>
  <OperationalSidebar navigation={navigation} activeRoute={activeRoute} anaSubtitle={anaSubtitle}/>
  <main className="ops-main">
   <OperationalTopbar theme={theme} onToggleTheme={onToggleTheme} query={query} onQueryChange={onQueryChange} placeholder={searchPlaceholder} name={name} role={role} avatarUrl={avatarUrl} initials={initials} onLogout={onLogout}/>
   <section className={`ops-content ${contentClassName}`.trim()}>{children}</section>
  </main>
 </div>;
}
