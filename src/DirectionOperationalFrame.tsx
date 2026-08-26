import type {ReactNode} from 'react';
import type {NavItem} from './masterNavigation';
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
 children:ReactNode;
};

export default function DirectionOperationalFrame({theme,navigation,search,profileName,initials,onSearchChange,onSearch,onNavigate,onToggleTheme,onLogout,children}:Props){
 const topbar=<DirectionTopbar theme={theme} search={search} profileName={profileName} initials={initials} onSearchChange={onSearchChange} onSearch={onSearch} onNavigate={onNavigate} onToggleTheme={onToggleTheme} onLogout={onLogout}/>;
 return <OperationalShellFrame
  className="dir-shell"
  theme={theme}
  navigation={navigation}
  activeRoute="/inicio"
  anaSubtitle="Habla con Ana, tu asistente inteligente."
  query={search}
  onQueryChange={onSearchChange}
  searchPlaceholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."
  name={profileName}
  role="Mi perfil"
  initials={initials}
  onToggleTheme={onToggleTheme}
  onLogout={onLogout}
  topbar={topbar}
  contentClassName="dir-content"
 >
  {children}
 </OperationalShellFrame>;
}
