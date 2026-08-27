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
  <style>{`.ops-root>.ops-side{grid-column:1!important;visibility:visible!important;opacity:1!important;z-index:7800!important}.ops-root>.ops-main{grid-column:2!important}.ops-root .ops-content>.ops-shared-footer{position:relative!important;inset:auto!important;z-index:1!important;min-height:72px;margin:30px 0 0;padding:16px 18px;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;border:1px solid var(--border,#e5e7eb)!important;border-radius:14px;background:var(--panel,#fff)!important;color:var(--muted,#667085)!important;visibility:visible!important;opacity:1!important}.ops-root .ops-content>.ops-shared-footer>div{display:flex;align-items:center;gap:14px;min-width:0}.ops-root .ops-content>.ops-shared-footer strong{font-size:11px;letter-spacing:.08em;white-space:nowrap;color:inherit}.ops-root .ops-content>.ops-shared-footer nav{display:flex;align-items:center;gap:4px;flex-wrap:wrap}.ops-root .ops-content>.ops-shared-footer button{border:0;background:transparent;color:inherit;font:inherit;font-size:11px;font-weight:700;padding:7px 9px;border-radius:8px;cursor:pointer}.ops-root .ops-content>.ops-shared-footer button:hover{background:rgba(127,127,127,.10);color:#e95d27}.ops-root .ops-content>.ops-shared-footer .ops-footer-ana{border:1px solid #ffd7c5;background:#fff7f2;color:#e95d27;padding:9px 12px;white-space:nowrap}.ops-root.ops-direction-frame{grid-template-columns:238px minmax(0,1fr)!important}.ops-root[data-theme='dark'] .ops-content>.ops-shared-footer{background:#202023!important;border-color:#343438!important;color:#aaaab2!important}.ops-root[data-theme='dark'] .ops-content>.ops-shared-footer button:hover{background:#2b2b2f;color:#ff7a42}.ops-root[data-theme='dark'] .ops-content>.ops-shared-footer .ops-footer-ana{background:#2b211d;border-color:#5a382b;color:#ff8a57}@media(max-width:900px){.ops-root .ops-content>.ops-shared-footer{align-items:flex-start;flex-direction:column}.ops-root .ops-content>.ops-shared-footer>div{align-items:flex-start;flex-direction:column;gap:8px}}@media(max-width:760px){.ops-root.ops-direction-frame{display:block!important}.ops-root.ops-direction-frame>.ops-side{display:none!important}.ops-root.ops-direction-frame>.ops-main{grid-column:auto!important}}`}</style>
  <OperationalSidebar navigation={navigation} activeRoute={activeRoute} anaSubtitle={anaSubtitle} anaRoute={anaRoute} variant={sidebarVariant}/>
  <main className={`ops-main ${mainClassName}`.trim()}>
   {renderedTopbar}
   <section className={`ops-content ${contentClassName}`.trim()}>
    {children}
    <footer className="ops-shared-footer" aria-label="Pie de Fénix Capital">
     <div><strong>Accesos rápidos</strong><nav aria-label="Accesos rápidos"><button type="button" onClick={()=>navigate('/inicio')}>Inicio</button><button type="button" onClick={()=>navigate('/expedientes')}>Expedientes</button><button type="button" onClick={()=>navigate('/agenda')}>Agenda</button><button type="button" onClick={()=>navigate('/informes')}>Informes</button></nav></div>
     <button className="ops-footer-ana" type="button" onClick={()=>navigate('/ana')}>Dar conocimiento a Ana</button>
    </footer>
   </section>
  </main>
 </div>;
}
