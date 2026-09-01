// PRE-PROD CI retrigger marker; no runtime behavior change.
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
import './operational-chrome-premium.css';
import './directory-create.css';
import './direction-master-sizing.css';
import './navigation-readability.css';
import './direction-ana-live.css';
import './direction-ana-half.css';
import './login-layout-fix.css';
import './global-interactions.css';
import App from './App';
import RoleHomeShell from './RoleHomeShell';
import ProfileShell from './ProfileShell';
import OperationalShellGate from './OperationalShellGate';
import BancosShell from './BancosShell';
import BankCreateShell from './BankCreateShell';
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
import ExpedienteCreateAnaGuard from './ExpedienteCreateAnaGuard';
import TasacionesShell from './TasacionesShell';
import AgendaShell from './AgendaShell';
import FirmasShell from './FirmasShell';
import DocumentacionShell from './DocumentacionShell';
import DocumentViewerShell from './DocumentViewerShell';
import ExpedienteDocumentsGuard from './ExpedienteDocumentsGuard';
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
import RegistrosPropiedadShell from './RegistrosPropiedadShell';
import RegistroPropiedadDetailShell from './RegistroPropiedadDetailShell';
import DirectoryCreateShell from './DirectoryCreateShell';
import SpecialCasesShell from './SpecialCasesShell';
import SpecialCaseDetailExperience from './SpecialCaseDetailExperience';
import SpecialCaseLifecycleGuard from './SpecialCaseLifecycleGuard';
import SpecialCaseIntervenientContactGuard from './SpecialCaseIntervenientContactGuard';
import TaskDetailExperienceGuard from './TaskDetailExperienceGuard';
import AnaGovernance from './AnaGovernance';
import AnaUniversalGuard from './AnaUniversalGuard';
import AnaInboxAccessGuard from './AnaInboxAccessGuard';
import AnaKnowledgeReviewGuard from './AnaKnowledgeReviewGuard';
import AnaTopCorrectionGuard from './AnaTopCorrectionGuard';
import DirectionHomeAnaCorrection from './DirectionHomeAnaCorrection';
import DocumentDetailAnaGuard from './DocumentDetailAnaGuard';
import DirectoryRowOpenGuard from './DirectoryRowOpenGuard';
import ExpedienteAnaRuntimeGuard from './ExpedienteAnaRuntimeGuard';
import ExpedienteBelenFinancialGuard from './ExpedienteBelenFinancialGuard';
import ExpedienteBankRankingGuard from './ExpedienteBankRankingGuard';
import FinancialModuleBelenGuard from './FinancialModuleBelenGuard';
import ExpedienteKnowledgeGuard from './ExpedienteKnowledgeGuard';
import ExpedienteCommercialTermsGuard from './ExpedienteCommercialTermsGuard';
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
import DirectionKpiDrilldownGuard from './DirectionKpiDrilldownGuard';
import DirectionPriorityActionGuard from './DirectionPriorityActionGuard';
import DirectionKpiLabelGuard from './DirectionKpiLabelGuard';
import DirectionAnaInsight from './DirectionAnaInsight';
import DirectionExecutiveOverviewGuard from './DirectionExecutiveOverviewGuard';
import DirectionAnaUrgentGuard from './DirectionAnaUrgentGuard';
import AnaKnowledgeBlock from './AnaKnowledgeBlock';
import AnaKnowledgePlacementGuard from './AnaKnowledgePlacementGuard';
import OperationalUniformityGuard from './OperationalUniformityGuard';
import ProductionWriteSafetyGuard from './ProductionWriteSafetyGuard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteAccessGuard />
      <OperationalRouteScrollReset />
      <OperationalUniformityGuard />
      <CreateRouteAuthorizedNav />
      <ProductionWriteSafetyGuard />
      <ExpedienteFollowupConfirmationGuard />
      <CalculatorLabelGuard />
      <ProfileLauncherGuard />
      <OperationalAdvancedSearchGuard />
      <DirectionIdentityGuard />
      <OperationalIdentityGuard />
      <OperationalLogoutGuard />
      <DirectionKpiDrilldownGuard />
      <DirectionPriorityActionGuard />
      <DirectionKpiLabelGuard />
      <DirectionAnaInsight />
      <DirectionExecutiveOverviewGuard />
      <DirectionAnaUrgentGuard />
      <DirectionHomeAnaCorrection />
      <DocumentDetailAnaGuard />
      <DirectoryRowOpenGuard />
      <AnaKnowledgeBlock />
      <AnaKnowledgePlacementGuard />
      <AnaUniversalGuard />
      <AnaInboxAccessGuard />
      <AnaKnowledgeReviewGuard />
      <AnaTopCorrectionGuard />
      <ContextEvidenceUpload />
      <ExpedienteDocumentsGuard />
      <ExpedienteAnaRuntimeGuard />
      <ExpedienteBelenFinancialGuard />
      <ExpedienteBankRankingGuard />
      <FinancialModuleBelenGuard />
      <ExpedienteKnowledgeGuard />
      <ExpedienteCommercialTermsGuard />
      <ExpedienteCreateAnaGuard />
      <B2BContactCreateLauncher />
      <SpecialCaseDetailExperience />
      <SpecialCaseLifecycleGuard />
      <SpecialCaseIntervenientContactGuard />
      <TaskDetailExperienceGuard />
      <App />
      <RoleHomeShell />
      <ProfileShell />
      <OperationalShellGate />
      <BancosShell />
      <BankCreateShell />
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
      <DocumentViewerShell />
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
      <RegistrosPropiedadShell />
      <RegistroPropiedadDetailShell />
      <DirectoryCreateShell />
      <SpecialCasesShell />
      <AnaGovernance />
      <VisitasShell />
      <CommunicationsShell />
      <DetailShellGate />
      <TaskCreateShell />
      <OperationalRecordDetail />
    </BrowserRouter>
  </React.StrictMode>
);