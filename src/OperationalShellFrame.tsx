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
 anaRoute?:string;
 query:string;
 onQueryChange:(value:string)=>void;
 searchPlaceholder:string;
 searchActionLabel?:string;
 onSearchAction?:()=>void;
 name:string;
 role:string;
 avatarUrl?:string;
 initials:string;
 onToggleTheme:()=>void;
 onLogout:()=>void|Promise<void>;
 topbar?:ReactNode;
 contentClassName?:string;
 children:ReactNode;
};

export default function OperationalShellFrame({className='',theme,navigation,activeRoute,anaSubtitle,anaRoute,query,onQueryChange,searchPlaceholder,searchActionLabel,onSearchAction,name,role,avatarUrl='',initials,onToggleTheme,onLogout,topbar,contentClassName='',children}:Props){
 return <div className={`ops-root ${className}`.trim()} data-theme={theme}>
  <OperationalSidebar navigation={navigation} activeRoute={activeRoute} anaSubtitle={anaSubtitle} anaRoute={anaRoute}/>
  <main className="ops-main">
   {topbar??<OperationalTopbar theme={theme} onToggleTheme={onToggleTheme} query={query} onQueryChange={onQueryChange} placeholder={searchPlaceholder} searchActionLabel={searchActionLabel} onSearchAction={onSearchAction} name={name} role={role} avatarUrl={avatarUrl} initials={initials} onLogout={onLogout}/>} 
   <section className={`ops-content ${contentClassName}`.trim()}>{children}</section>
  </main>
 </div>;
}
