import {useLocation} from 'react-router-dom';
import OperationalShellV2 from './OperationalShellV2';

const dedicatedExact=new Set(['/contactos','/inmobiliarias','/tasaciones','/agenda','/firmas','/documentacion','/financieros','/visitadores','/informes','/buscar','/bancos','/bancos/contactos','/economia']);

export default function OperationalShellGate(){
 const {pathname}=useLocation();
 if(dedicatedExact.has(pathname)||/^\/bancos\/contactos\//.test(pathname)||/^\/bancos\/[^/]+$/.test(pathname)||/^\/financieros\/[^/]+$/.test(pathname)||/^\/visitadores\/[^/]+$/.test(pathname))return null;
 return <OperationalShellV2/>;
}
