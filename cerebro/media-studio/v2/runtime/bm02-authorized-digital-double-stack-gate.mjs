const ALLOWED_USES=['DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE'];
const SUPPORTED_ENVIRONMENTS=new Set(['PREPROD','PROD']);
const APPROVED_CONSENT=new Set(['APPROVED','AUTHORIZED','GRANTED']);

export function evaluateBm02AuthorizedDigitalDoubleStack(input={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  const environmentSupported=SUPPORTED_ENVIRONMENTS.has(environment);
  const usageClass=String(input.usage_class??(environment==='PROD'?'PROD_INFERENCE':'INTERNAL_VALIDATION')).toUpperCase();
  const internalValidation=usageClass==='INTERNAL_VALIDATION';
  const productionInference=usageClass==='PROD_INFERENCE';

  const rights=input.rights_record??{};
  const owner=rights.owner_authorization??{};
  const modalities=new Set(rights.allowed_modalities??[]);
  const uses=new Set(rights.allowed_uses??[]);
  const ownerModalities=new Set(owner.modalities??[]);
  const ownerActions=new Set(owner.actions??[]);
  const ownerEnvironments=new Set((owner.environments??[]).map(x=>String(x).toUpperCase()));
  const ownerDecision=String(owner.decision??'PENDING').toUpperCase();

  const consentOk=APPROVED_CONSENT.has(String(rights.consent_status??'').toUpperCase());
  const scopeOk=['image','video','3d'].every(x=>modalities.has(x))&&ALLOWED_USES.every(x=>uses.has(x));
  const evidenceOk=Array.isArray(rights.evidence_refs)&&rights.evidence_refs.length>0&&Boolean(String(rights.revocation_process??'').trim());
  const ownerApproved=ownerDecision==='APPROVED';
  const ownerScopeOk=ownerApproved
    &&Boolean(String(owner.authorization_id??'').trim())
    &&Boolean(String(owner.decided_by??'').trim())
    &&Boolean(String(owner.decided_at??'').trim())
    &&owner.attests_rights_or_permission===true
    &&['image','video'].every(x=>ownerModalities.has(x))
    &&ALLOWED_USES.every(x=>ownerActions.has(x))
    &&ownerEnvironments.has(environment)
    &&Array.isArray(owner.evidence_refs)&&owner.evidence_refs.length>0;
  const sourceOk=environmentSupported
    &&input.identity_type==='REAL_AUTHORIZED'
    &&input.authorized_source_admitted===true
    &&consentOk&&scopeOk&&evidenceOk&&ownerScopeOk;

  const detector=String(input.detector??'UNSET').toUpperCase();
  const insightfaceWeights=detector.includes('INSIGHTFACE');
  const physicalRuntimeOk=input.liveportrait_runtime_proven===true&&input.detector_adapter_runtime_proven===true;
  const livePortraitCodeOk=input.liveportrait_code_license_verified===true;

  const validationLicenseOk=livePortraitCodeOk
    &&input.liveportrait_weights_test_use_verified===true
    &&input.detector_model_test_use_verified===true
    &&(!insightfaceWeights||input.insightface_test_use_verified===true);

  const detectorCommercialLicenseOk=(
    (detector==='MEDIAPIPE'&&input.detector_code_license==='Apache-2.0'&&input.detector_model_commercial_use_verified===true) ||
    (insightfaceWeights&&input.insightface_commercial_model_license_verified===true) ||
    (input.detector_model_commercial_use_verified===true&&Boolean(input.detector_code_license))
  );
  const productionLicenseOk=livePortraitCodeOk
    &&input.liveportrait_weights_commercial_use_verified===true
    &&detectorCommercialLicenseOk;
  const licenseOk=internalValidation?validationLicenseOk:(productionInference?productionLicenseOk:false);

  let status='BM02_HOLD_AUTHORIZED_SOURCE';
  let blocker='AUTHORIZED_REAL_PERSON_MEDIA_AND_OWNER_DECISION_REQUIRED';
  let human_required=ownerDecision==='PENDING';
  let reason=human_required?'LEGAL_REQUIRED':null;

  if(!environmentSupported){
    status='BM02_HOLD_POLICY'; blocker='ENVIRONMENT_NOT_SUPPORTED'; human_required=false; reason=null;
  }else if(!internalValidation&&!productionInference){
    status='BM02_HOLD_POLICY'; blocker='USAGE_CLASS_NOT_SUPPORTED'; human_required=false; reason=null;
  }else if(ownerDecision==='DENIED'||ownerDecision==='REVOKED'){
    status='BM02_HOLD_OWNER_DECISION'; blocker=`OWNER_AUTHORIZATION_${ownerDecision}`; human_required=false; reason=null;
  }else if(ownerDecision==='APPROVED'&&!ownerScopeOk){
    status='BM02_HOLD_OWNER_SCOPE'; blocker='OWNER_AUTHORIZATION_SCOPE_MISMATCH'; human_required=false; reason=null;
  }else if(sourceOk){
    human_required=false; reason=null;
    if(!licenseOk){
      status='BM02_HOLD_LICENSE';
      blocker=internalValidation?'DIGITAL_DOUBLE_TEST_LICENSE_CHAIN_NOT_VERIFIED':'DIGITAL_DOUBLE_COMMERCIAL_LICENSE_CHAIN_NOT_VERIFIED';
    }else if(!physicalRuntimeOk){
      status='BM02_READY_FOR_PHYSICAL_RUNTIME_PROOF'; blocker='DIGITAL_DOUBLE_PHYSICAL_RUNTIME_NOT_PROVEN';
    }else{
      status=productionInference&&environment==='PROD'?'BM02_ELIGIBLE_FOR_PHYSICAL_BENCHMARK_PROD':'BM02_ELIGIBLE_FOR_PHYSICAL_BENCHMARK'; blocker=null;
    }
  }

  const prodSourceUseAuthorized=sourceOk&&environment==='PROD';
  const publishAuthorized=sourceOk&&ownerActions.has('PUBLISH');
  const commercialUseAuthorized=sourceOk&&ownerActions.has('COMMERCIAL_USE')&&productionLicenseOk;

  return Object.freeze({
    schema_version:'2.0.0',state_type:'CEREBRO_UMS_BM02_AUTHORIZED_DIGITAL_DOUBLE_STACK_GATE_V2',benchmark_id:'BM-02',environment,usage_class:usageClass,status,blocker,
    source_admission:{
      identity_type:input.identity_type??null,
      authorized_source_admitted:input.authorized_source_admitted===true,
      consent_ok:consentOk,scope_ok:scopeOk,evidence_ok:evidenceOk,
      owner_decision:ownerDecision,owner_scope_ok:ownerScopeOk
    },
    stack:{
      engine:'LivePortrait',engine_code_license:'MIT',
      liveportrait_code_license_verified:livePortraitCodeOk,
      liveportrait_weights_test_use_verified:input.liveportrait_weights_test_use_verified===true,
      liveportrait_weights_commercial_use_verified:input.liveportrait_weights_commercial_use_verified===true,
      detector,detector_code_license:input.detector_code_license??null,
      detector_model_test_use_verified:input.detector_model_test_use_verified===true,
      detector_model_commercial_use_verified:input.detector_model_commercial_use_verified===true,
      insightface_test_use_verified:input.insightface_test_use_verified===true,
      insightface_commercial_model_license_verified:input.insightface_commercial_model_license_verified===true,
      liveportrait_runtime_proven:input.liveportrait_runtime_proven===true,
      detector_adapter_runtime_proven:input.detector_adapter_runtime_proven===true
    },
    policy:{
      internal_validation_may_use_test_licensed_components:internalValidation,
      prod_inference_requires_commercially_usable_stack:productionInference,
      no_test_license_is_promoted_into_prod_inference:true
    },
    human_required,human_required_reason:reason,benchmark_credit:false,
    prod_source_use_authorized:prodSourceUseAuthorized,
    commercial_use_authorized:commercialUseAuthorized,
    prod_authorized:false,publish_authorized:publishAuthorized,spend_authorized:false,additional_cost_eur:0
  });
}
