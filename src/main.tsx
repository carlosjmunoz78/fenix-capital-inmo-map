import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import './logo.css';
import './direction-viewport.css';
import './direction-polish.css';
import './direction-final.css';
import './direction-closure.css';
import './ana-vertical-size.css';
import App from './App';
import OperationalShellV2 from './OperationalShellV2';
import AnaGovernance from './AnaGovernance';
import VisitasShell from './VisitasShell';
import CommunicationsShell from './CommunicationsShell';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <OperationalShellV2 />
      <AnaGovernance />
      <VisitasShell />
      <CommunicationsShell />
    </BrowserRouter>
  </React.StrictMode>
);
