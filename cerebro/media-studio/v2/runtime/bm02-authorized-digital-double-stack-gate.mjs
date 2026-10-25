const ALLOWED_USES=['DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE'];

export function evaluateBm02AuthorizedDigitalDoubleStack(input={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  if(environment!=='PREPROD') throw new Error('BM02_PREPROD_ONLY');
  const rights=input.rights_record??{};
  const modalities=new Set(rights.allowed_modalities??[]);
  const uses=new Set(rights.allowed_uses??[]);
  const consentOk=['APPROVED','AUTHORIZED','GRANTED'].includes(String(rights.consent_status??'').toUpperCase());
  const scopeOk=['image','video','3d'].every(x=>modalities.has(x))&&ALLOWED_USES.every(x=>uses.has(x));
  const evidenceOk=Array.isArray(rights.evidence_refs)&&rights.evidence_refs.length>0&&Boolean(String(rights.revocation_process??'').trim());
  const sourceOk=input.identity_type==='REAL_AUTHORIZED'&&input.authorized_source_admitted===true&&consentOk&&scopeOk&&evidenceOk;

  const detector=String(input.detector??'UNSET').toUpperCase();
  const insightfaceWeights=detector.includes('INSIGHTFACE');
  const detectorLicenseOk=(
    (detector==='MEDIAPIPE'&&input.detector_code_license==='Apache-2.0'&&input.detector_model_commercial_use_verified===true) ||
    (insightfaceWeights&&input.insightface_commercial_model_license_verified===true) ||
    (input.detector_model_commercial_use_verified===true&&Boolean(input.detector_code_license))
  );
  const livePortraitLicenseOk=input.liveportrait_code_license_verified===true&&input.liveportrait_weights_commercial_use_verified===true;
  const physicalRuntimeOk=input.liveportrait_runtime_proven===true&&input.detector_adapter_runtime_proven===true;

  let status='BM02_HOLD_AUTHORIZED_SOURCE', blocker='AUTHORIZED_REAL_PERSON_MEDIA_AND_CONSENT_REQUIRED', human_required=true, reason='LEGAL_REQUIRED';
  if(sourceOk){
    human_required=false; reason=null;
    if(insightfaceWeights&&!input.insightface_commercial_model_license_verified){
      status='BM02_HOLD_LICENSE'; blocker='INSIGHTFACE_PRETRAINED_MODEL_COMMERCIAL_LICENSE_NOT_VERIFIED';
    }else if(!detectorLicenseOk||!livePortraitLicenseOk){
      status='BM02_HOLD_LICENSE'; blocker='DIGITAL_DOUBLE_LICENSE_CHAIN_NOT_VERIFIED';
    }else if(!physicalRuntimeOk){
      status='BM02_READY_FOR_PHYSICAL_RUNTIME_PROOF'; blocker='DIGITAL_DOUBLE_PHYSICAL_RUNTIME_NOT_PROVEN';
    }else{
      status='BM02_ELIGIBLE_FOR_PHYSICAL_BENCHMARK'; blocker=null;
    }
  }
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_BM02_AUTHORIZED_DIGITAL_DOUBLE_STACK_GATE_V1',benchmark_id:'BM-02',environment,status,blocker,
    source_admission:{identity_type:input.identity_type??null,authorized_source_admitted:input.authorized_source_admitted===true,consent_ok:consentOk,scope_ok:scopeOk,evidence_ok:evidenceOk},
    stack:{engine:'LivePortrait',engine_code_license:'MIT',liveportrait_code_license_verified:input.liveportrait_code_license_verified===true,liveportrait_weights_commercial_use_verified:input.liveportrait_weights_commercial_use_verified===true,detector,detector_code_license:input.detector_code_license??null,detector_model_commercial_use_verified:input.detector_model_commercial_use_verified===true,insightface_commercial_model_license_verified:input.insightface_commercial_model_license_verified===true,liveportrait_runtime_proven:input.liveportrait_runtime_proven===true,detector_adapter_runtime_proven:input.detector_adapter_runtime_proven===true},
    prohibited_default:'Do not use InsightFace pretrained detection/recognition models for commercial PROD unless their commercial model license is explicitly verified.',
    human_required,human_required_reason:reason,benchmark_credit:false,prod_authorized:false,publish_authorized:false,spend_authorized:false,additional_cost_eur:0
  });
}
