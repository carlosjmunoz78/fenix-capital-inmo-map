const REQ_USES=['VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL'];

export function evaluateBm03AuthorizedVoiceStack(input={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  if(environment!=='PREPROD') throw new Error('BM03_PREPROD_ONLY');
  const rights=input.rights_record??{};
  const modalities=new Set(rights.allowed_modalities??[]);
  const uses=new Set(rights.allowed_uses??[]);
  const consentOk=['APPROVED','AUTHORIZED','GRANTED'].includes(String(rights.consent_status??'').toUpperCase());
  const scopeOk=modalities.has('voice')&&REQ_USES.every(x=>uses.has(x));
  const evidenceOk=Array.isArray(rights.evidence_refs)&&rights.evidence_refs.length>0&&Boolean(String(rights.revocation_process??'').trim());
  const sourceOk=input.identity_type==='REAL_AUTHORIZED'&&input.authorized_source_admitted===true&&consentOk&&scopeOk&&evidenceOk;
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
  let status='BM03_HOLD_AUTHORIZED_SOURCE'; let blocker='AUTHORIZED_REAL_PERSON_VOICE_AND_CONSENT_REQUIRED'; let human_required=true; let reason='LEGAL_REQUIRED';
  if(sourceOk){
    human_required=false; reason=null;
    if(!stackLicense){status='BM03_HOLD_LICENSE';blocker='VOICE_STACK_LICENSE_CHAIN_NOT_VERIFIED';}
    else if(!stackRuntime){status='BM03_READY_FOR_PHYSICAL_RUNTIME_PROOF';blocker='OPENVOICE_OR_QWEN_PHYSICAL_RUNTIME_NOT_PROVEN';}
    else{status='BM03_ELIGIBLE_FOR_PHYSICAL_BENCHMARK';blocker=null;}
  }
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_BM03_AUTHORIZED_VOICE_STACK_GATE_V1',benchmark_id:'BM-03',environment,status,blocker,
    source_admission:{identity_type:input.identity_type??null,authorized_source_admitted:input.authorized_source_admitted===true,consent_ok:consentOk,scope_ok:scopeOk,evidence_ok:evidenceOk},
    qwen,openvoice,required_uses:REQ_USES,human_required,human_required_reason:reason,
    benchmark_credit:false,prod_authorized:false,publish_authorized:false,spend_authorized:false,additional_cost_eur:0,
    notes:'Capability readiness is not benchmark credit. Real-person voice media must pass the separate authorization admission gate before clone or conversion inference.'
  });
}
