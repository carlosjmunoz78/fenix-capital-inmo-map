#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PersistentJobQueue } from './persistent-runtime.mjs';
import { fetchPublicEvidenceV0 } from './public-source-adapter-v0.mjs';
import { runCompetContinuousV0, runCapDiscoveryV0 } from './fact001-gap-capabilities-v0.mjs';

const PREPROD='PREPROD';
function ctx(engine_id){return {company_id:'fenix',engine_id,environment:PREPROD,version:'v0'};}
function sha(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
function text(value,label,max=500){if(typeof value!=='string'||!value.trim())throw new TypeError(`${label} required`);const out=value.trim();if(out.length>max)throw new TypeError(`${label} too long`);return out;}
function host(url){return new URL(url).hostname.toLowerCase().replace(/^www\./,'');}

export async function runRemoteSourceBindings5762V0({target_url,observed_at='2026-10-15T00:00:00Z',workdir}={}){
  const target=text(target_url,'target_url',2048);
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-remote-57-62-'));
  const owns=!workdir;fs.mkdirSync(root,{recursive:true});
  try {
    const evidence=await fetchPublicEvidenceV0({
      ...ctx('RSH-001'),
      target_url:target,
      authorized_public_research:true,
      robots_allowed:true,
      timeout_ms:15000,
      max_bytes:1_500_000
    });
    if(evidence.status!=='REMOTE_READ_GREEN'||evidence.http_status!==200)throw new Error('remote source evidence not green');
    const currentValue=evidence.summary.title??evidence.summary.site_name??evidence.body_sha256;
    const sourceUrl=evidence.final_url;

    const competContext=ctx('COMPET-001');
    const competPayload={
      previous:[{competitor_id:'remote-source-e2e',dimension:'remote_public_title',value:'__CONTROLLED_E2E_BASELINE__',source_url:sourceUrl,source_access:'AUTHORIZED',observed_at:'2026-10-14T00:00:00Z',confidence:1}],
      current:[{competitor_id:'remote-source-e2e',dimension:'remote_public_title',value:currentValue,source_url:sourceUrl,source_access:'AUTHORIZED',observed_at,confidence:1}],
      cycle_anchor:observed_at,
      cadence_hours:24
    };
    const competQueuePath=path.join(root,'compet-remote-jobs.v8journal');
    const competQueue=new PersistentJobQueue({file_path:competQueuePath,environment:PREPROD});
    const competEnqueue=competQueue.enqueue({name:'COMPET-001_REMOTE_SOURCE_SCAN',context:competContext,payload:competPayload,idempotency_key:`compet-remote:${evidence.body_sha256.slice(0,24)}`});
    if(!competEnqueue.accepted)throw new Error('COMPET remote job enqueue failed');
    const competClaim=competQueue.claimContext(competContext);if(!competClaim)throw new Error('COMPET remote job claim failed');
    const competResult=runCompetContinuousV0({context:competContext,...competClaim.payload});
    const competComplete=competQueue.completeContext(competClaim.job_id,competContext,competResult);
    if(competComplete.status!=='SUCCEEDED'||competResult.change_count!==1)throw new Error('COMPET remote source binding failed');

    const capContext=ctx('CAP-001');
    const capPayload={
      source_records:[{
        company_name:'Fénix Capital PREPROD',
        domain:host(sourceUrl),
        sector:'financial_services',
        geography:'andalucia',
        employee_count:null,
        signals:['authorized_preprod_source_verified'],
        source_url:sourceUrl,
        source_access:'AUTHORIZED',
        evidence_at:observed_at
      }],
      icp:{sectors:['financial_services'],geographies:['andalucia'],signals:['authorized_preprod_source_verified']}
    };
    const capQueuePath=path.join(root,'cap-remote-jobs.v8journal');
    const capQueue=new PersistentJobQueue({file_path:capQueuePath,environment:PREPROD});
    const capEnqueue=capQueue.enqueue({name:'CAP-001_REMOTE_SOURCE_DISCOVERY',context:capContext,payload:capPayload,idempotency_key:`cap-remote:${evidence.body_sha256.slice(0,24)}`});
    if(!capEnqueue.accepted)throw new Error('CAP remote job enqueue failed');
    const capClaim=capQueue.claimContext(capContext);if(!capClaim)throw new Error('CAP remote job claim failed');
    const capResult=runCapDiscoveryV0({context:capContext,...capClaim.payload});
    const capComplete=capQueue.completeContext(capClaim.job_id,capContext,capResult);
    if(capComplete.status!=='SUCCEEDED'||capResult.company_count!==1||capResult.companies[0].fit_score<80)throw new Error('CAP remote source binding failed');
    if(capResult.personal_contacts_generated!==0||capResult.outreach_actions!==0||capResult.crm_writes!==0)throw new Error('CAP remote side-effect boundary violated');

    const report={
      schema_version:'1.0.0',
      state_type:'CEREBRO_FACT001_REMOTE_SOURCE_BINDINGS_57_62_V0',
      company_id:'fenix',
      environment:PREPROD,
      status:'REMOTE_SOURCE_BINDINGS_57_62_GREEN',
      source_evidence:{
        requested_url:evidence.requested_url,
        final_url:evidence.final_url,
        selected_route:evidence.selected_route,
        http_status:evidence.http_status,
        content_type:evidence.content_type,
        body_bytes:evidence.body_bytes,
        body_sha256:evidence.body_sha256,
        summary:evidence.summary,
        auth_used:evidence.auth_used,
        cookies_used:evidence.cookies_used,
        read_only:evidence.read_only
      },
      item_57:{state:'REMOTE_READ_PLUS_DURABLE_JOB_E2E_GREEN',job_id:competClaim.job_id,job_status:competComplete.status,change_count:competResult.change_count,next_scheduled_for:competResult.next_job.scheduled_for,remaining_gate:'REAL_COMPETITOR_TARGET_CONFIGURATION_AND_CONTINUOUS_PREPROD_RUN'},
      item_62:{state:'REMOTE_READ_PLUS_DURABLE_JOB_E2E_GREEN',job_id:capClaim.job_id,job_status:capComplete.status,company_count:capResult.company_count,top_fit_score:capResult.companies[0].fit_score,remaining_gate:'REAL_CAP_ACQUISITION_SOURCE_CONFIGURATION_AND_CONTINUOUS_PREPROD_RUN'},
      synthetic_control_baseline_used_for_item_57:true,
      declared_business_semantics_used_for_item_62:true,
      provider_write:false,
      customer_data_used:false,
      prod_authorized:false,
      prod_write_authorized:false,
      trading_access:false,
      additional_cost_eur:0,
      next_gate:'CONTINUOUS_PREPROD_SOURCE_CONFIGURATION_57_62'
    };
    report.evidence_sha256=sha(report);
    return Object.freeze(report);
  } finally {if(owns)fs.rmSync(root,{recursive:true,force:true});}
}

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i]==='--url')out.target_url=argv[++i];else if(argv[i]==='--out')out.out=argv[++i];else if(argv[i]==='--workdir')out.workdir=argv[++i];else if(argv[i]==='--observed-at')out.observed_at=argv[++i];else throw new Error(`unknown argument:${argv[i]}`);}if(!out.target_url)throw new Error('--url required');return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);runRemoteSourceBindings5762V0(a).then(report=>{const json=JSON.stringify(report,null,2)+'\n';if(a.out){fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out,json,'utf8');}process.stdout.write(json);}).catch(error=>{process.stderr.write(JSON.stringify({status:'REMOTE_SOURCE_BINDINGS_RED',error:String(error?.stack??error),prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
