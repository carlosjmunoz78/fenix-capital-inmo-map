import fs from 'node:fs';

const REQUIRED_ADAPTERS=Object.freeze(['ADAPTER-CHROME','ADAPTER-NODE','ADAPTER-PYTHON']);
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,prod_binding_authorized:false,installation_authorized:false,network_download_authorized:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function sha256(value){return typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);}

export function validateZeroCostSmokeEvidence(report){
  if(!report||report.state_type!=='CEREBRO_UMS_ZERO_COST_SMOKE_REPORT_V1')throw new Error('ZERO_COST_SMOKE_REPORT_REQUIRED');
  if(report.environment!=='PREPROD')throw new Error('PREPROD_REQUIRED');
  if(report.installation_performed!==false||report.network_download_performed!==false||report.external_network_used_by_test!==false)throw new Error('ZERO_INSTALL_ZERO_NETWORK_TEST_REQUIRED');
  const runtimes=report.runtimes??{};
  for(const key of ['chrome','node','python']){
    if(runtimes[key]?.found!==true||typeof runtimes[key]?.version!=='string'||!runtimes[key].version.trim())throw new Error(`RUNTIME_${key.toUpperCase()}_EVIDENCE_REQUIRED`);
  }
  const shot=report.outputs?.browser_screenshot;
  if(!shot||shot.mime!=='image/png'||!sha256(shot.sha256)||Number(shot.bytes)<=0||Number(shot.width)!==640||Number(shot.height)!==360)throw new Error('BROWSER_SCREENSHOT_EVIDENCE_INVALID');
  if(!sha256(report.input_html_sha256))throw new Error('INPUT_HTML_HASH_REQUIRED');
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_ZERO_COST_SMOKE_EVIDENCE_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'1.0.0',
    status:'PREPROD_SMOKE_GREEN',validated_adapters:Object.freeze([...REQUIRED_ADAPTERS]),input_html_sha256:report.input_html_sha256,output_sha256:shot.sha256,output_bytes:Number(shot.bytes),dimensions:Object.freeze({width:640,height:360}),observed_at:report.observed_at??null,
    preprod_smoke_claim:true,prod_operational_claim:false,benchmark_credit:false,readiness_mutation:false,...authority()
  });
}

export function loadAndValidateZeroCostSmokeEvidence(file){return validateZeroCostSmokeEvidence(JSON.parse(fs.readFileSync(file,'utf8')));}
