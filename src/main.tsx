import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import './logo.css';
import './direction-viewport.css';
import './direction-polish.css';
import './direction-final.css';
import './direction-closure.css';
import './direction-profile-polish.css';
import './ana-vertical-size.css';
import './calculator-no-pro.css';
import './operational-shell-overlay.css';
import './operational-mobile-nav.css';
import './operational-fixed-topbar.css';
import './operational-route-isolation.css';
import './brand-name-theme.css';
import './theme-consistency.css';
import './direction-master-sizing.css';
import './navigation-readability.css';
import App from './App';
import RoleHomeShell from './RoleHomeShell';
import ProfileShell from './ProfileShell';
import OperationalShellGate from './OperationalShellGate';
import BancosShell from './BancosShell';
import BancoDetailShell from './BancoDetailShell';
import BankContactsShell from './BankContactsShell';
import BankContactDetailShell from './BankContactDetailShell';
import ContactosShell from './ContactosShell';
import ContactCreateShell from './ContactCreateShell';
import ContactDetailShell from './ContactDetailShell';
import InmobiliariasShell from './InmobiliariasShell';
import InmobiliariaCreateAccess from './InmobiliariaCreateAccess';
import InmobiliariaCreateShell from './InmobiliariaCreateShell';
import InmobiliariaDetailShell from './InmobiliariaDetailShell';
import B2BContactCreateLauncher from './B2BContactCreateLauncher';
import B2BContactCreateShell from './B2BContactCreateShell';
import B2BContactDetailShell from './B2BContactDetailShell';
import ExpedienteCreateShell from './ExpedienteCreateShell';
import TasacionesShell from './TasacionesShell';
import AgendaShell from './AgendaShell';
import FirmasShell from './FirmasShell';
import DocumentacionShell from './DocumentacionShell';
import ContextEvidenceUpload from './ContextEvidenceUpload';
import FinancierosShell from './FinancierosShell';
import FinancieroDetailShell from './FinancieroDetailShell';
import VisitadoresShell from './VisitadoresShell';
import VisitadorDetailShell from './VisitadorDetailShell';
import EconomiaShell from './EconomiaShell';
import InformesShell from './InformesShell';
import SearchShell from './SearchShell';
import NotificationsShell from './NotificationsShell';
import NotariasShell from './NotariasShell';
import NotariaDetailShell from './NotariaDetailShell';
import AnaGovernance from './AnaGovernance';
import AnaUniversalGuard from './AnaUniversalGuard';
import AnaInboxAccessGuard from './AnaInboxAccessGuard';
import ExpedienteAnaRuntimeGuard from './ExpedienteAnaRuntimeGuard';
import VisitasShell from './VisitasShell';
import CommunicationsShell from './CommunicationsShell';
import DetailShellGate from './DetailShellGate';
import TaskCreateShell from './TaskCreateShell';
import OperationalRecordDetail from './OperationalRecordDetail';
import CalculatorLabelGuard from './CalculatorLabelGuard';
import ProfileLauncherGuard from './ProfileLauncherGuard';
import OperationalAdvancedSearchGuard from './OperationalAdvancedSearchGuard';
import DirectionIdentityGuard from './DirectionIdentityGuard';
import OperationalIdentityGuard from './OperationalIdentityGuard';
import OperationalLogoutGuard from './OperationalLogoutGuard';
import RouteAccessGuard from './RouteAccessGuard';
import CreateRouteAuthorizedNav from './CreateRouteAuthorizedNav';
import ExpedienteFollowupConfirmationGuard from './ExpedienteFollowupConfirmationGuard';
import OperationalRouteScrollReset from './OperationalRouteScrollReset';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteAccessGuard />
      <OperationalRouteScrollReset />
      <CreateRouteAuthorizedNav />
      <ExpedienteFollowupConfirmationGuard />
      <CalculatorLabelGuard />
      <ProfileLauncherGuard />
      <OperationalAdvancedSearchGuard />
      <DirectionIdentityGuard />
      <OperationalIdentityGuard />
      <OperationalLogoutGuard />
      <AnaUniversalGuard />
      <AnaInboxAccessGuard />
      <ContextEvidenceUpload />
      <ExpedienteAnaRuntimeGuard />
      <B2BContactCreateLauncher />
      <App />
      <RoleHomeShell />
      <ProfileShell />
      <OperationalShellGate />
      <BancosShell />
      <BancoDetailShell />
      <BankContactsShell />
      <BankContactDetailShell />
      <ContactosShell />
      <ContactCreateShell />
      <ContactDetailShell />
      <InmobiliariasShell />
      <InmobiliariaCreateAccess />
      <InmobiliariaCreateShell />
      <InmobiliariaDetailShell />
      <B2BContactCreateShell />
      <B2BContactDetailShell />
      <ExpedienteCreateShell />
      <TasacionesShell />
      <AgendaShell />
      <FirmasShell />
      <DocumentacionShell />
      <FinancierosShell />
      <FinancieroDetailShell />
      <VisitadoresShell />
      <VisitadorDetailShell />
      <EconomiaShell />
      <InformesShell />
      <SearchShell />
      <NotificationsShell />
      <NotariasShell />
      <NotariaDetailShell />
      <AnaGovernance />
      <VisitasShell />
      <CommunicationsShell />
      <DetailShellGate />
      <TaskCreateShell />
      <OperationalRecordDetail />
    </BrowserRouter>
  </React.StrictMode>
);