import {cloneElement,isValidElement,useEffect,useState,type ReactElement,type ReactNode} from 'react';
import type {NavItem} from './masterNavigation';
import OperationalSidebar from './OperationalSidebar';
import OperationalTopbar from './OperationalTopbar';

type Theme='light'|'dark';
const THEME_KEY='fenix-theme';
const LEGACY_GLOBAL_THEME_KEY='fenix-global-theme';

function storedTheme(fallback:Theme):Theme{
 const local=localStorage.getItem(THEME_KEY);
 if(local==='light'||local==='dark')return local;
 const legacyGlobal=localStorage.getItem(LEGACY_GLOBAL_THEME_KEY);
 if(legacyGlobal==='light'||legacyGlobal==='dark')return legacyGlobal;
 const session=sessionStorage.getItem(THEME_KEY);
 return session==='light'||session==='dark'?session:fallback;
}
function persistTheme(theme:Theme){
 localStorage.setItem(THEME_KEY,theme);
 localStorage.setItem(LEGACY_GLOBAL_THEME_KEY,theme);
 sessionStorage.setItem(THEME_KEY,theme);
 document.documentElement.dataset.theme=theme;
}

type Props={
 className?:string;
 theme:Theme;
 navigation:NavItem[];
 activeRoute:string;
 anaSubtitle?:string;
 anaRoute?:string;
 sidebarVariant?:'default'|'direction';
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
 mainClassName?:string;
 contentClassName?:string;
 legacyDirectionTheme?:boolean;
 children:ReactNode;
};

export default function OperationalShellFrame({className='',theme,navigation,activeRoute,anaSubtitle,anaRoute,sidebarVariant='default',query,onQueryChange,searchPlaceholder,searchActionLabel,onSearchAction,name,role,avatarUrl='',initials,onToggleTheme,onLogout,topbar,mainClassName='',contentClassName='',legacyDirectionTheme=false,children}:Props){
 const[effectiveTheme,setEffectiveTheme]=useState<Theme>(()=>storedTheme(theme));
 useEffect(()=>{persistTheme(effectiveTheme)},[effectiveTheme]);
 useEffect(()=>{if(theme!==effectiveTheme)onToggleTheme()},[theme,effectiveTheme,onToggleTheme]);
 function toggleTheme(){setEffectiveTheme(current=>current==='light'?'dark':'light');}
 const renderedTopbar=topbar&&isValidElement(topbar)
  ?cloneElement(topbar as ReactElement<any>,{theme:effectiveTheme,onToggleTheme:toggleTheme})
  :topbar??<OperationalTopbar theme={effectiveTheme} onToggleTheme={toggleTheme} query={query} onQueryChange={onQueryChange} placeholder={searchPlaceholder} searchActionLabel={searchActionLabel} onSearchAction={onSearchAction} name={name} role={role} avatarUrl={avatarUrl} initials={initials} onLogout={onLogout}/>;
 return <div className={`ops-root ${className}`.trim()} data-theme={effectiveTheme} data-dir-theme={legacyDirectionTheme?effectiveTheme:undefined}>
  <OperationalSidebar navigation={navigation} activeRoute={activeRoute} anaSubtitle={anaSubtitle} anaRoute={anaRoute} variant={sidebarVariant}/>
  <main className={`ops-main ${mainClassName}`.trim()}>
   {renderedTopbar}
   <section className={`ops-content ${contentClassName}`.trim()}>{children}</section>
  </main>
 </div>;
}
