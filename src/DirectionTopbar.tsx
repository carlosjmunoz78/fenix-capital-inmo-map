import {Bell,ChevronDown,LogOut,Moon,Search,SlidersHorizontal,Sun} from 'lucide-react';

type Theme='light'|'dark';

type Props={
 theme:Theme;
 search:string;
 profileName:string;
 initials:string;
 onSearchChange:(value:string)=>void;
 onSearch:()=>void;
 onNavigate:(route:string)=>void;
 onToggleTheme:()=>void;
 onLogout:()=>void;
};

export default function DirectionTopbar({theme,search,profileName,initials,onSearchChange,onSearch,onNavigate,onToggleTheme,onLogout}:Props){
 return <header className="dir-topbar">
  <button className="dir-advanced" onClick={()=>onNavigate('/buscar')}><SlidersHorizontal size={17}/>Buscador avanzado</button>
  <div className="dir-search"><Search size={18}/><input value={search} onChange={e=>onSearchChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSearch()}} placeholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."/><button onClick={onSearch} aria-label="Buscar"><Search size={17}/></button></div>
  <div className="dir-top-right">
   <button className="dir-theme-toggle" onClick={onToggleTheme} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
   <button className="dir-bell" aria-label="Notificaciones" onClick={()=>onNavigate('/notificaciones')}><Bell size={20}/></button>
   <button className="dir-profile" onClick={()=>onNavigate('/perfil')} aria-label={`Abrir perfil de ${profileName}`}><div className="dir-avatar">{initials}</div><div className="dir-user-copy"><strong>{profileName}</strong><span>Mi perfil</span></div><ChevronDown size={16}/></button>
   <button className="dir-logout" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17}/></button>
  </div>
 </header>;
}
