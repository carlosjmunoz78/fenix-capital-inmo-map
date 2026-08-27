import {useEffect,useState,type ReactNode} from 'react';
import {fetchAppApi} from './supabase';
import {directionSidebarNavigation,normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import DirectionTopbar from './DirectionTopbar';

type Theme='light'|'dark';

type Props={
 theme:Theme;
 navigation:NavItem[];
 search:string;
 profileName:string;
 initials:string;
 onSearchChange:(value:string)=>void;
 onSearch:()=>void;
 onNavigate:(route:string)=>void;
 onToggleTheme:()=>void;
 onLogout:()=>void;
 activeRoute?:string;
 contentClassName?:string;
 anaSubtitle?:string;
 children:ReactNode;
};

const failClosedNavigation:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function DirectionOperationalFrame({theme,navigation,search,profileName,initials,onSearchChange,onSearch,onNavigate,onToggleTheme,onLogout,activeRoute='/inicio',contentClassName='dir-content',anaSubtitle='Habla con Ana, tu asistente inteligente.',children}:Props){
 const[authorizedNavigation,setAuthorizedNavigation]=useState<NavItem[]|null>(null);
 useEffect(()=>{
  let alive=true;
  fetchAppApi<unknown>('/navigation').then(result=>{
   if(!alive)return;
   if(result.status!==200){setAuthorizedNavigation(failClosedNavigation);return;}
   const normalized=normalizeNavigation(result.data);
   const sidebar=directionSidebarNavigation(normalized);
   setAuthorizedNavigation(sidebar.length?sidebar:failClosedNavigation);
  }).catch(()=>{if(alive)setAuthorizedNavigation(failClosedNavigation)});
  return()=>{alive=false};
 },[]);
 const effectiveNavigation=authorizedNavigation??directionSidebarNavigation(navigation);
 const topbar=<DirectionTopbar theme={theme} search={search} profileName={profileName} initials={initials} onSearchChange={onSearchChange} onSearch={onSearch} onNavigate={onNavigate} onToggleTheme={onToggleTheme} onLogout={onLogout}/>;
 return <OperationalShellFrame
  className="dir-shell"
  theme={theme}
  navigation={effectiveNavigation.length?effectiveNavigation:failClosedNavigation}
  activeRoute={activeRoute}
  anaSubtitle={anaSubtitle}
  sidebarVariant="direction"
  query={search}
  onQueryChange={onSearchChange}
  searchPlaceholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."
  name={profileName}
  role="Mi perfil"
  initials={initials}
  onToggleTheme={onToggleTheme}
  onLogout={onLogout}
  topbar={topbar}
  mainClassName="dir-main"
  contentClassName={contentClassName}
  legacyDirectionTheme
 >
  {children}
 </OperationalShellFrame>;
}
