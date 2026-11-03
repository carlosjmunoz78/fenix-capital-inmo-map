const HUMAN=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const clean=s=>String(s??'').trim();
export function assessComplaint(input={}){
 const company_id=clean(input.company_id),environment=clean(input.environment||'PREPROD');
 if(!company_id) throw new Error('company_id required');
 if(environment!=='PREPROD'&&environment!=='PROD') throw new Error('unsupported environment');
 const complaint_id=clean(input.complaint_id); if(!complaint_id) throw new Error('complaint_id required');
 const severity=clean(input.severity||'LOW').toUpperCase();
 const confidence=Number(input.confidence??1);
 const flags={legal:!!input.legal,signature:!!input.signature,security:!!input.security,policy:!!input.policy_conflict,money:!!input.money_limit,customer_human:!!input.customer_human_request};
 let human_exception_code=null;
 if(flags.security) human_exception_code='SECURITY_INCIDENT';
 else if(flags.legal) human_exception_code='LEGAL_REQUIRED';
 else if(flags.signature) human_exception_code='SIGNATURE_REQUIRED';
 else if(flags.policy) human_exception_code='POLICY_CONFLICT';
 else if(flags.money) human_exception_code='MONEY_LIMIT';
 else if(flags.customer_human) human_exception_code='CUSTOMER_HUMAN_REQUEST';
 else if(severity==='HIGH'||severity==='CRITICAL') human_exception_code='HIGH_RISK';
 else if(!Number.isFinite(confidence)||confidence<0.8) human_exception_code='LOW_CONFIDENCE';
 if(human_exception_code&&!HUMAN.has(human_exception_code)) throw new Error('invalid exception');
 const category=clean(input.category||'GENERAL').toUpperCase();
 const plan=human_exception_code?['PRESERVE_EVIDENCE','ROUTE_TO_HUMAN_OWNER','NO_EXTERNAL_ADMISSION_OR_SEND']:['ACKNOWLEDGE_INTERNALLY','CLASSIFY_ROOT_CAUSE','PREPARE_RESPONSE_DRAFT','TRACK_RESOLUTION_SLA'];
 return {engine_id:'CMP-001',company_id,environment,complaint_id,category,severity,confidence,human_required:!!human_exception_code,human_exception_code,plan,external_dispatch_authorized:false,legal_admission_authorized:false,refund_authorized:false,crm_write_authorized:false,prod_write_authorized:false,spend_authorized:false,trading_access:false,additional_cost_eur:0,status:human_exception_code?'HUMAN_REQUIRED':'COMPLAINT_PLAN_READY'};
}
