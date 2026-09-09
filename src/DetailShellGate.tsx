import {useLocation} from 'react-router-dom';
import DetailShell from './DetailShell';
import ExpedienteLifecycleGuard from './ExpedienteLifecycleGuard';
import ExpedienteTabInterceptor from './ExpedienteTabInterceptor';
import ExpedienteContextShell from './ExpedienteContextShell';

export default function DetailShellGate(){
 const {pathname}=useLocation();
 const base=/^\/expedientes\/[^/]+$/.test(pathname)&&pathname!=='/expedientes/nuevo';
 const contextual=/^\/expedientes\/[^/]+\/(documentacion|analisis|banco|tareas)\/?$/.test(pathname);
 if(base)return <><DetailShell/><ExpedienteLifecycleGuard/><ExpedienteTabInterceptor/></>;
 if(contextual)return <ExpedienteContextShell/>;
 return null;
}
