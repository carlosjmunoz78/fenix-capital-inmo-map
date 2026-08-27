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

const controlStyle={height:37,border:'1px solid #e7e7ea',background:'#fff',borderRadius:9,display:'flex',alignItems:'center',gap:7,padding:'0 11px',color:'#424248'} as const;

export default function DirectionTopbar({theme,search,profileName,initials,onSearchChange,onSearch,onNavigate,onToggleTheme,onLogout}:Props){
 const neutral=profileName==='Mi perfil'||profileName==='Usuario';
 const contractRole=neutral?'Identidad no disponible':'Dirección';
 const visibleRole=neutral?'Identidad no disponible':'Direccion';
 return <header className="ops-top dir-topbar" style={{height:72,display:'flex',alignItems:'center',gap:18,padding:'0 26px'}}>
  <button aria-label="Buscador avanzado" onClick={()=>onNavigate('/buscar')} style={{...controlStyle,cursor:'pointer',whiteSpace:'nowrap'}}><SlidersHorizontal size={17}/>Buscador avanzado</button>
  <div className="ops-search" style={{height:39,flex:1,maxWidth:780}}><Search size={17}/><input value={search} onChange={e=>onSearchChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSearch()}} placeholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."/><button type="button" onClick={onSearch} aria-label="Buscar">Buscar</button></div>
  <div className="ops-top-actions" style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
   <button aria-label="Cambiar tema" onClick={onToggleTheme}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button>
   <button className="ops-profile" onClick={()=>onNavigate('/perfil')} aria-label={`Abrir perfil de ${profileName}`} style={{cursor:'pointer'}}><span className="ops-profile-avatar" aria-hidden="true">{initials}</span><span className="ops-profile-copy dir-user-copy"><strong>{profileName}</strong><small>{visibleRole}</small><span style={{position:'absolute',width:1,height:1,padding:0,margin:-1,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:0}}>{contractRole}</span></span></button>
   <button onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17}/></button>
  </div>
 </header>;
}
