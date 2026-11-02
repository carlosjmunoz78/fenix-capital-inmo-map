import {foundationContext,foundationManifest,humanRequired} from './foundation-context-v1.mjs';

export const manifest=foundationManifest({engine_id:'CMP-001',name:'Complaints / Reclamaciones · Foundation Runtime'});

export function triageComplaint(input={}){
  const context=foundationContext(manifest.engine_id,input);
  if(input.customer_human_request===true) return humanRequired('CUSTOMER_HUMAN_REQUEST','Customer explicitly requested a human',context);
  if(input.legal_claim===true||input.regulator_involved===true) return humanRequired('LEGAL_REQUIRED','Complaint may require legal/regulatory handling',context);
  if(input.security_incident===true) return humanRequired('SECURITY_INCIDENT','Complaint reports a security incident',context);
  const severity=input.financial_harm===true||input.service_blocked===true?'HIGH':(input.repeat===true?'MEDIUM':'NORMAL');
  return {status:'FOUNDATION_OK',context,severity,next_action:severity==='HIGH'?'PRIORITY_REVIEW':'ACKNOWLEDGE_AND_ROUTE',autonomous_external_response:false,prod_write:false,cost_eur:0};
}
