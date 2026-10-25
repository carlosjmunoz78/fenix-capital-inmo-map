import fs from 'node:fs';

function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,installation_authorized:false,network_download_authorized:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function normalizeProbe(raw={}){return {key:String(raw.key??'').trim(),found:raw.found===true,path:raw.path?String(raw.path):null,version:raw.version?String(raw.version).slice(0,500):null};}

export function evaluatePhysicalAdapterEvidence({registry,probe_report}={}){
  if(!registry||registry.state_type!=='CEREBRO_UMS_PHYSICAL_ADAPTER_CANDIDATES_V1')throw new Error('PHYSICAL_ADAPTER_REGISTRY_REQUIRED');
  if(!probe_report||probe_report.state_type!=='CEREBRO_UMS_RUNTIME_PROBE_REPORT_V1')throw new Error('RUNTIME_PROBE_REPORT_REQUIRED');
  const probes=(probe_report.probes??[]).map(normalizeProbe);
  const byKey=new Map(probes.map((p)=>[p.key,p]));
  const adapters=(registry.candidates??[]).map((candidate)=>{
    const matches=(candidate.binary_keys??[]).map((key)=>byKey.get(key)).filter(Boolean);
    const discovered=matches.find((p)=>p.found&&p.path&&p.version)??null;
    return Object.freeze({
      adapter_id:candidate.id,name:candidate.name,capabilities:Object.freeze([...(candidate.capabilities??[])]),
      status:discovered?'PREPROD_DISCOVERED':'UNAVAILABLE_IN_PROBED_RUNTIME',
      discovered_binary:discovered?Object.freeze(discovered):null,
      smoke_test_status:'NOT_RUN',license_status:'REVIEW_REQUIRED',security_status:'REVIEW_REQUIRED',cost_status:'ZERO_INSTALL_COST_NOT_PROVEN_AS_TOTAL_RUNTIME_COST',rollback_status:'NOT_TESTED',prod_binding_status:'NOT_BOUND',
      operational_claim:false,...authority()
    });
  });
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UMS_PHYSICAL_ADAPTER_EVIDENCE_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'1.0.0',runner:probe_report.runner??null,observed_at:probe_report.observed_at??null,adapters:Object.freeze(adapters),discovered:adapters.filter((x)=>x.status==='PREPROD_DISCOVERED').length,unavailable:adapters.filter((x)=>x.status==='UNAVAILABLE_IN_PROBED_RUNTIME').length,prod_bound:0,operational_claims:0,...authority()});
}

export function loadAndEvaluatePhysicalAdapterEvidence({registry_file,probe_file}){
  const registry=JSON.parse(fs.readFileSync(registry_file,'utf8'));const probe_report=JSON.parse(fs.readFileSync(probe_file,'utf8'));return evaluatePhysicalAdapterEvidence({registry,probe_report});
}
