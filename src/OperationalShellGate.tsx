import {useLocation} from 'react-router-dom';
import OperationalShellV2 from './OperationalShellV2';
import ExpedientesSharedShell from './ExpedientesSharedShell';
import FirmaCreateShell from './FirmaCreateShell';
import DocumentCreateShell from './DocumentCreateShell';

const dedicatedExact=new Set([
 '/contactos','/contactos/nuevo',
 '/inmobiliarias','/inmobiliarias/nueva',
 '/tasaciones','/agenda','/firmas','/documentacion','/documentacion/nuevo','/financieros','/visitadores','/informes','/buscar',
 '/bancos','/bancos/nuevo','/bancos/contactos',
 '/economia','/notificaciones','/notarias','/visitas','/expedientes/nuevo'
]);

export default function OperationalShellGate(){
 const {pathname}=useLocation();
 if(pathname==='/expedientes')return <ExpedientesSharedShell/>;
 if(pathname==='/firmas/nuevo'||pathname==='/firmas/nueva')return <FirmaCreateShell/>;
 if(pathname==='/documentacion/nuevo')return <DocumentCreateShell/>;
 if(
  dedicatedExact.has(pathname)
  || /^\/expedientes\/[^/]+$/.test(pathname)
  || /^\/contactos\/[^/]+$/.test(pathname)
  || /^\/inmobiliarias\/[^/]+$/.test(pathname)
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
