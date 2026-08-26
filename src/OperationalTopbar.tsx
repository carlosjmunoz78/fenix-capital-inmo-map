import {LogOut,Moon,Search,Sun} from 'lucide-react';

type Theme='light'|'dark';

type Props={
 theme:Theme;
 onToggleTheme:()=>void;
 query:string;
 onQueryChange:(value:string)=>void;
 placeholder:string;
 name:string;
 role:string;
 avatarUrl?:string;
 initials:string;
 onLogout:()=>void|Promise<void>;
 searchActionLabel?:string;
 onSearchAction?:()=>void;
};

export default function OperationalTopbar({theme,onToggleTheme,query,onQueryChange,placeholder,name,role,avatarUrl='',initials,onLogout,searchActionLabel,onSearchAction}:Props){
 return <header className="ops-top">
  <div className="ops-search"><Search size={17}/><input value={query} onChange={e=>onQueryChange(e.target.value)} placeholder={placeholder}/>{searchActionLabel&&<button type="button" onClick={onSearchAction}>{searchActionLabel}</button>}</div>
  <div className="ops-top-actions">
   <button aria-label="Cambiar tema" onClick={onToggleTheme}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button>
   <div className="ops-profile">{avatarUrl?<img src={avatarUrl} alt="" referrerPolicy="no-referrer"/>:<span className="ops-profile-avatar" aria-hidden="true">{initials}</span>}<span className="ops-profile-copy"><strong>{name}</strong><small>{role}</small></span></div>
   <button onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17}/></button>
  </div>
 </header>;
}
