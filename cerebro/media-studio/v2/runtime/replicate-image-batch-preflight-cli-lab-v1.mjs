import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {planReplicateImageBatch} from './replicate-image-batch-planner-lab-v1.mjs';
const requestFile=resolve(process.argv[2]||'cerebro/media-studio/v2/requests/UMS001_REPLICATE_4_ART_IMAGES_LAB_20261111.json');
const outdir=resolve(process.argv[3]||'.ums001-preflight');
try {
  const request=JSON.parse(await readFile(requestFile,'utf8'));
  const planned=planReplicateImageBatch(request);
  await mkdir(outdir,{recursive:true});
  // No credentials, account identities or prediction URL. Creative prompts are present in source request.
  const receipt={schema_version:1,request_id:planned.request_id,company_id:planned.company_id,
    engine_id:planned.engine_id,environment:planned.environment,provider:planned.provider,
    model_id:planned.model_id,concept_count:planned.concept_count,plan_status:planned.batch_status,
    projected_provider_cost_usd:planned.projected_provider_cost_usd,external_api_calls:0,
    paid_execution_enabled:false,publication_approved:false,
    recorded_outputs:planned.outputs.map(x=>({concept_id:x.concept_id,prompt_sha256:x.prompt_sha256,
      status:x.status,model_id:x.model_id,sha256:null,prediction_id:null,durable_asset_id:null,qa_human_realism:'PENDING'}))};
  await writeFile(join(outdir,'preflight_receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:receipt.plan_status,request_id:receipt.request_id,
    images:receipt.concept_count,model:receipt.model_id,planned_cost_usd:receipt.projected_provider_cost_usd,
    inference_calls:0,files_generated:0,publication_approved:false}));
} catch (error) {
  console.error('UMS001_PREFLIGHT_BLOCKED: '+String(error?.message||'UNKNOWN'));
  process.exitCode=2;
}
