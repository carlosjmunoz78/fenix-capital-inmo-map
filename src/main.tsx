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
import InmobiliariaCreateShell from './InmobiliariaCreateShell';
import InmobiliariaDetailShell from './InmobiliariaDetailShell';
import ExpedienteCreateShell from './ExpedienteCreateShell';
import TasacionesShell from './TasacionesShell';
import AgendaShell from './AgendaShell';
import FirmasShell from './FirmasShell';
import DocumentacionShell from './DocumentacionShell';
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
import VisitasShell from './VisitasShell';
import CommunicationsShell from './CommunicationsShell';
import DetailShellGate from './DetailShellGate';
import TaskCreateShell from './TaskCreateShell';
import OperationalRecordDetail from './OperationalRecordDetail';
import CalculatorLabelGuard from './CalculatorLabelGuard';
import ProfileLauncherGuard from './ProfileLauncherGuard';
import OperationalAdvancedSearchGuard from './OperationalAdvancedSearchGuard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CalculatorLabelGuard />
      <ProfileLauncherGuard />
      <OperationalAdvancedSearchGuard />
      <AnaUniversalGuard />
      <AnaInboxAccessGuard />
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
      <InmobiliariaCreateShell />
      <InmobiliariaDetailShell />
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
