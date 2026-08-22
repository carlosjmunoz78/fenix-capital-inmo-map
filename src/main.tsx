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
import OperationalShellV2 from './OperationalShellV2';
import ContactosShell from './ContactosShell';
import ContactDetailShell from './ContactDetailShell';
import InmobiliariasShell from './InmobiliariasShell';
import InmobiliariaDetailShell from './InmobiliariaDetailShell';
import TasacionesShell from './TasacionesShell';
import AgendaShell from './AgendaShell';
import FirmasShell from './FirmasShell';
import DocumentacionShell from './DocumentacionShell';
import FinancierosShell from './FinancierosShell';
import VisitadoresShell from './VisitadoresShell';
import AnaGovernance from './AnaGovernance';
import VisitasShell from './VisitasShell';
import CommunicationsShell from './CommunicationsShell';
import DetailShell from './DetailShell';
import OperationalRecordDetail from './OperationalRecordDetail';
import CalculatorLabelGuard from './CalculatorLabelGuard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CalculatorLabelGuard />
      <App />
      <OperationalShellV2 />
      <ContactosShell />
      <ContactDetailShell />
      <InmobiliariasShell />
      <InmobiliariaDetailShell />
      <TasacionesShell />
      <AgendaShell />
      <FirmasShell />
      <DocumentacionShell />
      <FinancierosShell />
      <VisitadoresShell />
      <AnaGovernance />
      <VisitasShell />
      <CommunicationsShell />
      <DetailShell />
      <OperationalRecordDetail />
    </BrowserRouter>
  </React.StrictMode>
);
