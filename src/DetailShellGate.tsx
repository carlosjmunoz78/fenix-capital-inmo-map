import {useLocation} from 'react-router-dom';
import DetailShell from './DetailShell';
import ExpedienteLifecycleGuard from './ExpedienteLifecycleGuard';

export default function DetailShellGate(){
 const {pathname}=useLocation();
 const isExpedienteDetail=/^\/expedientes\/[^/]+$/.test(pathname)&&pathname!=='/expedientes/nuevo';
 if(!isExpedienteDetail)return null;
 return <><DetailShell/><ExpedienteLifecycleGuard/></>;
}
