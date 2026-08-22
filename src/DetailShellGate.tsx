import {useLocation} from 'react-router-dom';
import DetailShell from './DetailShell';

export default function DetailShellGate(){
 const {pathname}=useLocation();
 if(/^\/contactos\/[^/]+$/.test(pathname)||/^\/inmobiliarias\/[^/]+$/.test(pathname))return null;
 return <DetailShell/>;
}
