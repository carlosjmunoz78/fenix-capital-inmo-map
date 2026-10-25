import {spawnSync} from 'node:child_process';

const SAFE_REF=/^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
function ref(value,label){const out=String(value??'').trim();if(!SAFE_REF.test(out))throw new Error(`${label}_INVALID`);return out;}

export function detectCudaRuntime({exec=spawnSync}={}){
  const probe=exec('nvidia-smi',['--query-gpu=name,memory.total,driver_version','--format=csv,noheader,nounits'],{encoding:'utf8',timeout:10000});
  if(probe?.error||Number(probe?.status)!==0||!String(probe?.stdout??'').trim()){
    return Object.freeze({cuda_available:false,nvidia_smi:false,gpus:Object.freeze([]),probe_error:String(probe?.error?.message??probe?.stderr??'').slice(0,500)});
  }
  const gpus=String(probe.stdout).trim().split(/\r?\n/).filter(Boolean).map((line)=>{
    const [name,memory_total_mb,driver_version]=line.split(',').map((x)=>x.trim());
    return Object.freeze({name,memory_total_mb:Number(memory_total_mb),driver_version});
  });
  return Object.freeze({cuda_available:gpus.length>0,nvidia_smi:true,gpus:Object.freeze(gpus),probe_error:null});
}

export function evaluateMuseTalkPreprodCapability(input={},deps={}){
  const environment=String(input.environment??'PREPROD').toUpperCase();
  if(environment!=='PREPROD')throw new Error('MUSETALK_CAPABILITY_GATE_PREPROD_ONLY');
  const company_id=ref(input.company_id??'GLOBAL','COMPANY_ID');
  const request_id=ref(input.request_id??'ums:musetalk:capability','REQUEST_ID');
  const runtime=deps.runtime??detectCudaRuntime(deps);
  const licenseVerified=input.license_verified===true;
  const zeroCostVerified=input.zero_cost_verified===true;
  const eligible=runtime.cuda_available===true&&licenseVerified&&zeroCostVerified;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_MUSETALK_CAPABILITY_GATE_V1',company_id,engine_id:'UMS-001',environment,version:'1.0.0',request_id,
    adapter:'MUSETALK-1.5',capability:'LIP_SYNC',upstream_license:'MIT',license_verified:licenseVerified,zero_cost_verified:zeroCostVerified,
    runtime,requires_nvidia_cuda:true,
    status:eligible?'MUSETALK_ELIGIBLE_FOR_PREPROD_PHYSICAL_BINDING':'HOLD_HARDWARE',
    blocker:eligible?null:'GPU_RUNTIME_NOT_PROVEN',human_required:false,
    install_authorized:eligible&&input.preprod_install_requested===true,
    model_download_authorized:eligible&&input.preprod_install_requested===true,
    prod_authorized:false,publish_authorized:false,send_authorized:false,spend_authorized:false,additional_cost_eur:0,
    next_action:eligible?'RUN_ISOLATED_MUSETALK_SMOKE':'DISCOVER_ZERO_COST_OR_OWNED_CUDA_RUNTIME_THEN_RETRY_SAME_GATE'
  });
}
