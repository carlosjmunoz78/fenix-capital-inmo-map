import {useLocation} from 'react-router-dom';
import OperationalShellV2 from './OperationalShellV2';
import ExpedientesSharedShell from './ExpedientesSharedShell';

const dedicatedExact=new Set(['/contactos','/inmobiliarias','/tasaciones','/agenda','/firmas','/documentacion','/financieros','/visitadores','/informes','/buscar','/bancos','/bancos/contactos','/economia','/notificaciones','/notarias','/visitas','/expedientes/nuevo']);

export default function OperationalShellGate(){
 const {pathname}=useLocation();
 if(pathname==='/expedientes')return <ExpedientesSharedShell/>;
 if(
  dedicatedExact.has(pathname)
  || /^\/expedientes\/[^/]+$/.test(pathname)
  || /^\/tareas\/[^/]+$/.test(pathname)
  || /^\/bancos\/contactos\//.test(pathname)
  || /^\/bancos\/[^/]+$/.test(pathname)
  || /^\/financieros\/[^/]+$/.test(pathname)
  || /^\/visitadores\/[^/]+$/.test(pathname)
  || /^\/notarias\/[^/]+$/.test(pathname)
  || /^\/visitas\/[^/]+$/.test(pathname)
 )return null;
 return <OperationalShellV2/>;
}
