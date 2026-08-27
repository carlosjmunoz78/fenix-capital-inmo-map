import {LogOut,Moon,Search,Sun} from 'lucide-react';

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
 const role=neutral?'Identidad no disponible':'Direccion';
 return <header className="ops-top dir-topbar">
  <div className="ops-search"><Search size={17}/><input value={search} onChange={e=>onSearchChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSearch()}} placeholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."/><button type="button" onClick={()=>onNavigate('/buscar')} aria-label="Buscador avanzado">Buscador avanzado</button><button type="button" onClick={onSearch} aria-label="Buscar">Buscar</button></div>
  <div className="ops-top-actions">
   <button aria-label="Cambiar tema" onClick={onToggleTheme}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button>
   <button className="ops-profile" onClick={()=>onNavigate('/perfil')} aria-label={`Abrir perfil de ${profileName}`}><span className="ops-profile-avatar" aria-hidden="true">{initials}</span><span className="ops-profile-copy dir-user-copy"><strong>{profileName}</strong><small>{role}</small><span style={{position:'absolute',width:1,height:1,padding:0,margin:-1,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:0}}>{role}</span></span></button>
   <button onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17}/></button>
  </div>
 </header>;
}
