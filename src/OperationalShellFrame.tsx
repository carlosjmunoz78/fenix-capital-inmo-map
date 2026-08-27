import {cloneElement,isValidElement,useEffect,useState,type ReactElement,type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
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
 const navigate=useNavigate();
 const[effectiveTheme,setEffectiveTheme]=useState<Theme>(()=>storedTheme(theme));
 useEffect(()=>{persistTheme(effectiveTheme)},[effectiveTheme]);
 useEffect(()=>{if(theme!==effectiveTheme)onToggleTheme()},[theme,effectiveTheme,onToggleTheme]);
 function toggleTheme(){setEffectiveTheme(current=>current==='light'?'dark':'light');}
 const renderedTopbar=topbar&&isValidElement(topbar)
  ?cloneElement(topbar as ReactElement<any>,{theme:effectiveTheme,onToggleTheme:toggleTheme})
  :topbar??<OperationalTopbar theme={effectiveTheme} onToggleTheme={toggleTheme} query={query} onQueryChange={onQueryChange} placeholder={searchPlaceholder} searchActionLabel={searchActionLabel} onSearchAction={onSearchAction} name={name} role={role} avatarUrl={avatarUrl} initials={initials} onLogout={onLogout}/>;
 const rootClass=`ops-root ${sidebarVariant==='direction'?'ops-direction-frame ':''}${className}`.trim();
 return <div className={rootClass} data-theme={effectiveTheme} data-dir-theme={legacyDirectionTheme?effectiveTheme:undefined}>
  <style>{`.ops-root>.ops-side{grid-column:1!important;visibility:visible!important;opacity:1!important;z-index:7800!important}.ops-root>.ops-main{grid-column:2!important}.ops-root>.ops-shared-footer{position:fixed!important;left:238px;right:0;bottom:0!important;z-index:2147483000!important;height:38px;display:flex!important;align-items:center!important;justify-content:center!important;gap:18px!important;border-top:1px solid var(--border,#e5e7eb)!important;background:var(--panel,#fff)!important;color:var(--muted,#667085)!important;font-size:11px!important;letter-spacing:.05em!important;text-align:center!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}.ops-root>.ops-shared-footer>strong{font-size:10.5px;letter-spacing:.08em;white-space:nowrap}.ops-root>.ops-shared-footer>nav{display:flex;align-items:center;gap:4px}.ops-root>.ops-shared-footer button{border:0;background:transparent;color:inherit;font:inherit;font-weight:700;letter-spacing:0;padding:5px 7px;border-radius:7px;cursor:pointer}.ops-root>.ops-shared-footer button:hover{background:rgba(127,127,127,.10);color:#e95d27}.ops-root.ops-direction-frame{grid-template-columns:238px minmax(0,1fr)!important}.ops-root.ops-direction-frame>.ops-shared-footer{left:238px}.ops-root[data-theme='dark']>.ops-shared-footer{background:#202023!important;border-color:#343438!important;color:#aaaab2!important}.ops-root[data-theme='dark']>.ops-shared-footer button:hover{background:#2b2b2f;color:#ff7a42}@media(max-width:1000px) and (min-width:901px){.ops-root.ops-direction-frame{grid-template-columns:96px minmax(0,1fr)!important}.ops-root.ops-direction-frame>.ops-shared-footer{left:96px}}@media(max-width:900px){.ops-root>.ops-shared-footer{left:96px}.ops-root.ops-direction-frame{grid-template-columns:96px minmax(0,1fr)!important}.ops-root.ops-direction-frame>.ops-shared-footer{left:96px}.ops-root>.ops-shared-footer>strong{display:none}}@media(max-width:760px){.ops-root.ops-direction-frame{display:block!important}.ops-root.ops-direction-frame>.ops-side{display:none!important}.ops-root.ops-direction-frame>.ops-main{grid-column:auto!important}.ops-root.ops-direction-frame>.ops-shared-footer{left:0;bottom:0!important}}@media(max-width:650px){.ops-root>.ops-side{grid-column:auto!important}.ops-root>.ops-main{grid-column:auto!important}.ops-root>.ops-shared-footer{left:0;bottom:58px!important;height:34px;font-size:10px!important;gap:2px!important}.ops-root>.ops-shared-footer button{padding:4px 5px}}`}</style>
  <OperationalSidebar navigation={navigation} activeRoute={activeRoute} anaSubtitle={anaSubtitle} anaRoute={anaRoute} variant={sidebarVariant}/>
  <main className={`ops-main ${mainClassName}`.trim()}>
   {renderedTopbar}
   <section className={`ops-content ${contentClassName}`.trim()}>{children}</section>
  </main>
  <footer className="ops-shared-footer" aria-label="Pie de Fénix Capital"><strong>FÉNIX CAPITAL · CEREBRO</strong><nav aria-label="Enlaces del pie"><button type="button" onClick={()=>navigate('/inicio')}>Inicio</button><button type="button" onClick={()=>navigate('/documentacion')}>Documentación</button><button type="button" onClick={()=>navigate('/ana')}>Ana</button><button type="button" onClick={()=>navigate('/perfil')}>Mi perfil</button></nav></footer>
 </div>;
}
