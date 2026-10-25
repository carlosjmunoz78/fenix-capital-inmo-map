const SAFE_REF=/^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
function ref(value,label){const out=String(value??'').trim();if(!SAFE_REF.test(out))throw new Error(`${label}_INVALID`);return out;}

export function evaluateBlender52PreprodCapability(input={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  if(environment!=='PREPROD')throw new Error('BLENDER_52_CAPABILITY_GATE_PREPROD_ONLY');
  const company_id=ref(input.company_id??'GLOBAL','COMPANY_ID');
  const request_id=ref(input.request_id??'ums:blender52:capability','REQUEST_ID');
  const version=String(input.blender_version??'').trim();
  const binaryVerified=input.binary_verified===true;
  const checksumVerified=input.checksum_verified===true;
  const licenseVerified=input.license_verified===true;
  const zeroCostVerified=input.zero_cost_verified===true;
  const headlessVerified=input.headless_verified===true;
  const cpuRenderVerified=input.cpu_render_verified===true;
  const versionOk=/^5\.2\.(?:[3-9]|[1-9]\d+)\b/.test(version)||version==='5.2.3';
  const eligible=binaryVerified&&checksumVerified&&licenseVerified&&zeroCostVerified&&headlessVerified&&cpuRenderVerified&&versionOk;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_BLENDER_52_CAPABILITY_GATE_V1',company_id,engine_id:'UMS-001',environment,version:'1.0.0',request_id,
    adapter:'BLENDER-5.2-LTS',capabilities:Object.freeze(['THREE_D_SCENE','MODELING','ANIMATION','RENDER','GLTF_EXPORT','USD_EXPORT','COMPOSITING']),
    upstream_license:'GPL-3.0-or-later',blender_version:version,binary_verified:binaryVerified,checksum_verified:checksumVerified,license_verified:licenseVerified,zero_cost_verified:zeroCostVerified,headless_verified:headlessVerified,cpu_render_verified:cpuRenderVerified,
    status:eligible?'BLENDER_52_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING':'BLENDER_52_HOLD_PHYSICAL_PROOF',
    blocker:eligible?null:'VERSION_CHECKSUM_HEADLESS_CPU_OR_LICENSE_NOT_PROVEN',human_required:false,
    prod_authorized:false,publish_authorized:false,send_authorized:false,spend_authorized:false,additional_cost_eur:0,
    next_action:eligible?'RUN_NOVA01_THREE_D_REFERENCE_PROOF':'RUN_OFFICIAL_5_2_LTS_HEADLESS_CPU_PROBE'
  });
}
