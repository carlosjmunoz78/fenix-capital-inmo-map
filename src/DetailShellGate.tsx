import {useLocation} from 'react-router-dom';
import DetailShell from './DetailShell';
import ExpedienteLifecycleGuard from './ExpedienteLifecycleGuard';
import ExpedienteTabInterceptor from './ExpedienteTabInterceptor';
import ExpedienteContextShell from './ExpedienteContextShell';
import ExpedienteExistingBackfillGuard from './ExpedienteExistingBackfillGuard';

export default function DetailShellGate(){
 const {pathname}=useLocation();
 const baseMatch=pathname.match(/^\/expedientes\/([^/]+)$/);
 const contextualMatch=pathname.match(/^\/expedientes\/([^/]+)\/(documentacion|analisis|banco|tareas)\/?$/);
 const base=Boolean(baseMatch)&&pathname!=='/expedientes/nuevo';
 const contextual=Boolean(contextualMatch);
 const rawCode=baseMatch?.[1]||contextualMatch?.[1]||'';
 const code=rawCode?decodeURIComponent(rawCode):'';
 if(base)return <><DetailShell/><ExpedienteLifecycleGuard/><ExpedienteTabInterceptor/><ExpedienteExistingBackfillGuard expedienteCode={code}/></>;
 if(contextual)return <><ExpedienteContextShell/><ExpedienteExistingBackfillGuard expedienteCode={code}/></>;
 return null;
}
