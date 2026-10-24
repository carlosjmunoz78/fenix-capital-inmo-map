import React from 'react';
import ReactDOM from 'react-dom/client';
import CerebroOwnerDecisionGuard from '../../../src/CerebroOwnerDecisionGuard';

const params = new URLSearchParams(window.location.search);
const approvalId = params.get('approval_id') || '';
const intent = params.get('intent') || '';
window.history.replaceState({}, '', `/cerebro/decision?approval_id=${encodeURIComponent(approvalId)}&intent=${encodeURIComponent(intent)}`);

ReactDOM.createRoot(document.getElementById('owner-decision-root')!).render(
  <React.StrictMode>
    <CerebroOwnerDecisionGuard />
  </React.StrictMode>,
);
