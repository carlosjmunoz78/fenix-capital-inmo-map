import {LogOut,Moon,Search,SlidersHorizontal,Sun} from 'lucide-react';

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
 const neutral=profileName==='Mi perfil'||profileName==='Usuario';
 const contractRole=neutral?'Identidad no disponible':'Dirección';
 const visibleRole=neutral?'Identidad no disponible':'Direccion';
 return <header className="ops-top dir-topbar">
  <button className="dir-advanced" onClick={()=>onNavigate('/buscar')}><SlidersHorizontal size={17}/>Buscador avanzado</button>
  <div className="ops-search dir-search"><Search size={17}/><input value={search} onChange={e=>onSearchChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSearch()}} placeholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."/><button type="button" onClick={onSearch} aria-label="Buscar">Buscar</button></div>
  <div className="ops-top-actions dir-top-right">
   <button className="dir-theme-toggle" aria-label="Cambiar tema" onClick={onToggleTheme}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button>
   <button className="ops-profile dir-profile" onClick={()=>onNavigate('/perfil')} aria-label={`Abrir perfil de ${profileName}`}><span className="ops-profile-avatar dir-avatar" aria-hidden="true">{initials}</span><span className="ops-profile-copy dir-user-copy"><strong>{profileName}</strong><small>{visibleRole}</small><span style={{position:'absolute',width:1,height:1,padding:0,margin:-1,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:0}}>{contractRole}</span></span></button>
   <button className="dir-logout" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17}/></button>
  </div>
 </header>;
}
