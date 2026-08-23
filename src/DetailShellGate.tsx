import {useLocation} from 'react-router-dom';
import DetailShell from './DetailShell';
import ExpedienteDetailAuthorizedNav from './ExpedienteDetailAuthorizedNav';

export default function DetailShellGate(){
 const {pathname}=useLocation();
 if(pathname==='/expedientes/nuevo'||/^\/contactos\/[^/]+$/.test(pathname)||/^\/inmobiliarias\/[^/]+$/.test(pathname))return null;
 return <><DetailShell/><ExpedienteDetailAuthorizedNav/></>;
}
