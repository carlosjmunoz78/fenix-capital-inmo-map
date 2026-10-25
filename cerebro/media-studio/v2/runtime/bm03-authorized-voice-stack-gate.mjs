const REQ_USES=['VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL'];
const SUPPORTED_ENVIRONMENTS=new Set(['PREPROD','PROD']);
const APPROVED_CONSENT=new Set(['APPROVED','AUTHORIZED','GRANTED']);

export function evaluateBm03AuthorizedVoiceStack(input={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  const environmentSupported=SUPPORTED_ENVIRONMENTS.has(environment);
  const rights=input.rights_record??{};
  const owner=rights.owner_authorization??{};
  const modalities=new Set(rights.allowed_modalities??[]);
  const uses=new Set(rights.allowed_uses??[]);
  const ownerModalities=new Set(owner.modalities??[]);
  const ownerActions=new Set(owner.actions??[]);
  const ownerEnvironments=new Set((owner.environments??[]).map(x=>String(x).toUpperCase()));
  const ownerDecision=String(owner.decision??'PENDING').toUpperCase();

  const consentOk=APPROVED_CONSENT.has(String(rights.consent_status??'').toUpperCase());
  const scopeOk=modalities.has('voice')&&REQ_USES.every(x=>uses.has(x));
  const evidenceOk=Array.isArray(rights.evidence_refs)&&rights.evidence_refs.length>0&&Boolean(String(rights.revocation_process??'').trim());
  const ownerApproved=ownerDecision==='APPROVED';
  const ownerScopeOk=ownerApproved
    &&Boolean(String(owner.authorization_id??'').trim())
    &&Boolean(String(owner.decided_by??'').trim())
    &&Boolean(String(owner.decided_at??'').trim())
    &&owner.attests_rights_or_permission===true
    &&ownerModalities.has('voice')
    &&REQ_USES.every(x=>ownerActions.has(x))
    &&ownerEnvironments.has(environment)
    &&Array.isArray(owner.evidence_refs)&&owner.evidence_refs.length>0;
  const sourceOk=environmentSupported
    &&input.identity_type==='REAL_AUTHORIZED'
    &&input.authorized_source_admitted===true
    &&consentOk&&scopeOk&&evidenceOk&&ownerScopeOk;

  const qwen={
    engine:'Qwen3-TTS-12Hz-0.6B-Base',role:['VOICE_CLONE','TTS','MULTILINGUAL'],code_license:'Apache-2.0',checkpoint_license:'Apache-2.0',
    code_license_verified:input.qwen_code_license_verified===true,checkpoint_license_verified:input.qwen_checkpoint_license_verified===true,cpu_runtime_proven:input.qwen_cpu_runtime_proven===true
  };
  const openvoice={
    engine:'OpenVoice-V2',role:['VOICE_CONVERSION','TONE_COLOR','MULTILINGUAL','STYLE_CONTROL'],code_license:'MIT',checkpoint_license:'MIT',
    code_license_verified:input.openvoice_code_license_verified===true,checkpoint_license_verified:input.openvoice_checkpoint_license_verified===true,runtime_proven:input.openvoice_runtime_proven===true
  };
  const stackLicense=qwen.code_license_verified&&qwen.checkpoint_license_verified&&openvoice.code_license_verified&&openvoice.checkpoint_license_verified;
  const stackRuntime=qwen.cpu_runtime_proven&&openvoice.runtime_proven;

  let status='BM03_HOLD_AUTHORIZED_SOURCE';
  let blocker='AUTHORIZED_REAL_PERSON_VOICE_AND_OWNER_DECISION_REQUIRED';
  let human_required=ownerDecision==='PENDING';
  let reason=human_required?'LEGAL_REQUIRED':null;

  if(!environmentSupported){
    status='BM03_HOLD_POLICY'; blocker='ENVIRONMENT_NOT_SUPPORTED'; human_required=false; reason=null;
  }else if(ownerDecision==='DENIED'||ownerDecision==='REVOKED'){
    status='BM03_HOLD_OWNER_DECISION'; blocker=`OWNER_AUTHORIZATION_${ownerDecision}`; human_required=false; reason=null;
  }else if(ownerDecision==='APPROVED'&&!ownerScopeOk){
    status='BM03_HOLD_OWNER_SCOPE'; blocker='OWNER_AUTHORIZATION_SCOPE_MISMATCH'; human_required=false; reason=null;
  }else if(sourceOk){
    human_required=false; reason=null;
    if(!stackLicense){status='BM03_HOLD_LICENSE';blocker='VOICE_STACK_LICENSE_CHAIN_NOT_VERIFIED';}
    else if(!stackRuntime){status='BM03_READY_FOR_PHYSICAL_RUNTIME_PROOF';blocker='OPENVOICE_OR_QWEN_PHYSICAL_RUNTIME_NOT_PROVEN';}
    else{status=environment==='PROD'?'BM03_ELIGIBLE_FOR_PHYSICAL_BENCHMARK_PROD':'BM03_ELIGIBLE_FOR_PHYSICAL_BENCHMARK';blocker=null;}
  }

  const prodSourceUseAuthorized=sourceOk&&environment==='PROD';
  const publishAuthorized=sourceOk&&ownerActions.has('PUBLISH');
  const commercialUseAuthorized=sourceOk&&ownerActions.has('COMMERCIAL_USE');

  return Object.freeze({
    schema_version:'2.0.0',state_type:'CEREBRO_UMS_BM03_AUTHORIZED_VOICE_STACK_GATE_V2',benchmark_id:'BM-03',environment,status,blocker,
    source_admission:{
      identity_type:input.identity_type??null,
      authorized_source_admitted:input.authorized_source_admitted===true,
      consent_ok:consentOk,scope_ok:scopeOk,evidence_ok:evidenceOk,
      owner_decision:ownerDecision,owner_scope_ok:ownerScopeOk
    },
    qwen,openvoice,required_uses:REQ_USES,human_required,human_required_reason:reason,
    benchmark_credit:false,
    prod_source_use_authorized:prodSourceUseAuthorized,
    commercial_use_authorized:commercialUseAuthorized,
    prod_authorized:false,
    publish_authorized:publishAuthorized,
    spend_authorized:false,additional_cost_eur:0,
    notes:'Owner authorization controls identity use. Capability readiness is not benchmark credit and does not bypass the final UMS PROD readiness tribunal.'
  });
}
