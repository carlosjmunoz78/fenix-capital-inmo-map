import {useLocation} from 'react-router-dom';
import DetailShell from './DetailShell';
import ExpedienteLifecycleGuard from './ExpedienteLifecycleGuard';
import ExpedienteManualPhaseGuard from './ExpedienteManualPhaseGuard';
import ExpedienteRenameGuard from './ExpedienteRenameGuard';
import ExpedientePeopleProdGuard from './ExpedientePeopleProdGuard';
import ExpedientePeopleAccordionGuard from './ExpedientePeopleAccordionGuard';
import ExpedienteAliasDisplayGuard from './ExpedienteAliasDisplayGuard';

export default function DetailShellGate(){
 const {pathname}=useLocation();
 const isExpedienteDetail=/^\/expedientes\/[^/]+$/.test(pathname)&&pathname!=='/expedientes/nuevo';
 if(!isExpedienteDetail)return null;
 return <><DetailShell/><ExpedienteAliasDisplayGuard/><ExpedienteRenameGuard/><ExpedientePeopleProdGuard/><ExpedientePeopleAccordionGuard/><ExpedienteLifecycleGuard/><ExpedienteManualPhaseGuard/></>;
}
