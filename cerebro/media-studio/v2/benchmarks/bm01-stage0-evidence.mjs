import fs from 'node:fs';

const REQUIRED_VIEWS=['FRONT','PROFILE_LEFT','THREE_QUARTER_RIGHT'];
const SHA=/^[a-f0-9]{64}$/i;
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,spend_authorized:false,additional_cost_eur:0};}

export function validateBm01Stage0Evidence(report){
  if(!report||report.state_type!=='CEREBRO_UMS_BM01_STAGE0_REPORT_V1')throw new Error('BM01_STAGE0_REPORT_REQUIRED');
  if(report.environment!=='PREPROD')throw new Error('BM01_STAGE0_PREPROD_REQUIRED');
  if(report.identity_type!=='SYNTHETIC_ORIGINAL'||report.real_person_reference!==false)throw new Error('BM01_STAGE0_SYNTHETIC_ORIGINAL_REQUIRED');
  if(!SHA.test(report.character_bible_sha256??''))throw new Error('BM01_STAGE0_CHARACTER_BIBLE_HASH_REQUIRED');
  if(report.installation_performed!==false||report.network_download_performed!==false||report.external_network_used_by_test!==false)throw new Error('BM01_STAGE0_ZERO_INSTALL_ZERO_NETWORK_REQUIRED');
  const refs=Array.isArray(report.reference_assets)?report.reference_assets:[];
  for(const view of REQUIRED_VIEWS){
    const asset=refs.find((x)=>x.view===view);
    if(!asset||asset.mime!=='image/png'||!SHA.test(asset.sha256??'')||Number(asset.bytes)<=0||Number(asset.width)!==512||Number(asset.height)!==512)throw new Error(`BM01_STAGE0_${view}_REFERENCE_INVALID`);
  }
  if(new Set(refs.map((x)=>x.sha256)).size<3)throw new Error('BM01_STAGE0_REFERENCES_NOT_DISTINCT');
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_BM01_STAGE0_EVIDENCE_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'1.0.0',
    status:'BM01_STAGE0_REFERENCE_GREEN',benchmark_id:'BM-01',benchmark_state:'NOT_RUN',benchmark_credit:false,readiness_mutation:false,
    character_id:report.character_id,character_bible_sha256:report.character_bible_sha256,reference_views:Object.freeze([...REQUIRED_VIEWS]),reference_hashes:Object.freeze(refs.map((x)=>x.sha256)),
    proven:Object.freeze(['SYNTHETIC_ORIGINAL_IDENTITY','CHARACTER_BIBLE','THREE_DISTINCT_2D_REFERENCE_VIEWS','REFERENCE_PROVENANCE']),
    missing_for_bm01_pass:Object.freeze(['VIDEO_IDENTITY_PROOF','THREE_D_REFERENCE_PROOF','CROSS_MODAL_CONSISTENCY_METRICS']),
    observed_at:report.observed_at??null,operational_claim:false,...authority()
  });
}

export function loadAndValidateBm01Stage0Evidence(file){return validateBm01Stage0Evidence(JSON.parse(fs.readFileSync(file,'utf8')));}
