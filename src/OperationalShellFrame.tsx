import {useEffect,useState,type ReactNode} from 'react';
import type {NavItem} from './masterNavigation';
import OperationalSidebar from './OperationalSidebar';
import OperationalTopbar from './OperationalTopbar';

type Theme='light'|'dark';
const GLOBAL_THEME_KEY='fenix-global-theme';

function storedTheme(fallback:Theme):Theme{
 const global=localStorage.getItem(GLOBAL_THEME_KEY);
 if(global==='light'||global==='dark')return global;
 const legacy=sessionStorage.getItem('fenix-theme');
 return legacy==='light'||legacy==='dark'?legacy:fallback;
}
function persistTheme(theme:Theme){
 localStorage.setItem(GLOBAL_THEME_KEY,theme);
 sessionStorage.setItem('fenix-theme',theme);
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

export default function OperationalShellFrame({className='',theme,navigation,activeRoute,anaSubtitle,anaRoute,sidebarVariant='default',query,onQueryChange,searchPlaceholder,searchActionLabel,onSearchAction,name,role,avatarUrl='',initials,onLogout,topbar,mainClassName='',contentClassName='',legacyDirectionTheme=false,children}:Props){
 const[effectiveTheme,setEffectiveTheme]=useState<Theme>(()=>storedTheme(theme));
 useEffect(()=>{
  persistTheme(effectiveTheme);
  const id=window.setTimeout(()=>persistTheme(effectiveTheme),0);
  return()=>window.clearTimeout(id);
 },[effectiveTheme]);
 function toggleTheme(){setEffectiveTheme(current=>current==='light'?'dark':'light');}
 return <div className={`ops-root ${className}`.trim()} data-theme={effectiveTheme} data-dir-theme={legacyDirectionTheme?effectiveTheme:undefined}>
  <OperationalSidebar navigation={navigation} activeRoute={activeRoute} anaSubtitle={anaSubtitle} anaRoute={anaRoute} variant={sidebarVariant}/>
  <main className={`ops-main ${mainClassName}`.trim()}>
   {topbar??<OperationalTopbar theme={effectiveTheme} onToggleTheme={toggleTheme} query={query} onQueryChange={onQueryChange} placeholder={searchPlaceholder} searchActionLabel={searchActionLabel} onSearchAction={onSearchAction} name={name} role={role} avatarUrl={avatarUrl} initials={initials} onLogout={onLogout}/>} 
   <section className={`ops-content ${contentClassName}`.trim()}>{children}</section>
  </main>
 </div>;
}
