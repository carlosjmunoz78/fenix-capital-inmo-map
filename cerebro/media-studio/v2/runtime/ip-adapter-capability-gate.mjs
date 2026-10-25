const SAFE_REF=/^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
function ref(value,label){const out=String(value??'').trim();if(!SAFE_REF.test(out))throw new Error(`${label}_INVALID`);return out;}

export function evaluateIpAdapterPreprodCapability(input={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  if(environment!=='PREPROD')throw new Error('IP_ADAPTER_CAPABILITY_GATE_PREPROD_ONLY');
  const company_id=ref(input.company_id??'GLOBAL','COMPANY_ID');
  const request_id=ref(input.request_id??'ums:ipadapter:capability','REQUEST_ID');
  if(input.real_person_face_requested===true||input.faceid_variant_requested===true)throw new Error('IP_ADAPTER_STANDARD_SYNTHETIC_REFERENCE_ONLY_IN_THIS_GATE');
  const codeLicenseVerified=input.code_license_verified===true;
  const checkpointLicenseVerified=input.checkpoint_license_verified===true;
  const baseModelLicenseVerified=input.base_model_license_verified===true;
  const runtime=Object.freeze({device:String(input.device??'cpu').toLowerCase(),cuda_available:input.cuda_available===true,memory_fit_verified:input.memory_fit_verified===true,latency_fit_verified:input.latency_fit_verified===true});
  const resourceFit=runtime.memory_fit_verified&&runtime.latency_fit_verified;
  let status='IP_ADAPTER_HOLD_LICENSE';
  let blocker='LICENSE_CHAIN_NOT_VERIFIED';
  if(codeLicenseVerified&&checkpointLicenseVerified&&baseModelLicenseVerified){
    if(resourceFit){status='IP_ADAPTER_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING';blocker=null;}
    else{status='IP_ADAPTER_HOLD_RESOURCE_BENCHMARK';blocker='BASE_MODEL_RUNTIME_FIT_NOT_PROVEN';}
  }
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_IP_ADAPTER_CAPABILITY_GATE_V1',company_id,engine_id:'UMS-001',environment,version:'1.0.0',request_id,
    adapter:'IP-ADAPTER-STANDARD',capability:'SYNTHETIC_REFERENCE_IMAGE_CONDITIONING',code_license:'Apache-2.0',
    code_license_verified:codeLicenseVerified,checkpoint_license_verified:checkpointLicenseVerified,base_model_license_verified:baseModelLicenseVerified,
    runtime,status,blocker,human_required:false,
    notes:'Diffusers supports IP-Adapter pipelines on cuda/mps/xpu/cpu, but support is not resource-fit evidence. Base model and checkpoint licensing remain separate gates.',
    real_person_face_allowed:false,faceid_variant_allowed:false,prod_authorized:false,publish_authorized:false,spend_authorized:false,additional_cost_eur:0,
    next_action:status==='IP_ADAPTER_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING'?'RUN_SYNTHETIC_NOVA01_REFERENCE_SMOKE':status==='IP_ADAPTER_HOLD_LICENSE'?'VERIFY_CHECKPOINT_AND_BASE_MODEL_LICENSE_CHAIN':'BENCHMARK_ZERO_COST_RUNTIME_FIT'
  });
}
