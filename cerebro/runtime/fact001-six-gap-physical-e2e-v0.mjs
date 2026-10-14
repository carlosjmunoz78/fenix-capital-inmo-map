#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PersistentJobQueue } from './persistent-runtime.mjs';
import {
  learnProcedureV0,
  replayProcedureV0,
  buildAndroidDeviceWorkerShellV0,
  authorizeAndroidWorkerCommandV0,
  runCompetContinuousV0,
  runCapDiscoveryV0,
  FirstPartyEventCaptureV0,
  buildAppTemplatePackV0
} from './fact001-gap-capabilities-v0.mjs';

const PREPROD='PREPROD';
const VERSION='physical-e2e-v0';
function ctx(engine_id){return {company_id:'fenix',engine_id,environment:PREPROD,version:'v0'};}
function sha(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
function listen(server){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address()));});}
function close(server){return new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
function readBody(req){return new Promise((resolve,reject)=>{let data='';req.setEncoding('utf8');req.on('data',chunk=>{data+=chunk;if(data.length>1024*1024){reject(new Error('request body too large'));req.destroy();}});req.on('end',()=>resolve(data));req.on('error',reject);});}
function writeArtifacts(root,artifacts){for(const [rel,content] of Object.entries(artifacts)){const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,String(content),'utf8');}}
function safeResult(item,state,evidence,remaining_gate){return Object.freeze({item,state,evidence,remaining_gate,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});}

async function runWatchLearn(){
  const procedure=learnProcedureV0({context:ctx('LRN-001'),procedure_id:'physical-e2e-watch-learn-v0',steps:[
    {step_id:'observe',action:'READ_FIXTURE',target:'local://fixture/company',input:{fixture_ref:'company-a'},expected_result:{company_id:'company-a',status:'OBSERVED'},side_effect_class:'READ_ONLY'},
    {step_id:'compare',action:'COMPARE_FIXTURE',target:'local://fixture/baseline',input:{baseline_ref:'base-a'},expected_result:{decision:'MATCH'},side_effect_class:'SIMULATION'}
  ]});
  const adapter={mode:'SAFE_PREPROD_SIMULATION',execute(step){if(step.step_id==='observe')return {company_id:'company-a',status:'OBSERVED'};if(step.step_id==='compare')return {decision:'MATCH'};throw new Error('unexpected step');}};
  const replay=replayProcedureV0({procedure,adapter});
  if(replay.status!=='REPLAY_MATCH')throw new Error('Watch & Learn E2E mismatch');
  return safeResult(47,'LOCAL_E2E_GREEN',{procedure_checksum:procedure.checksum,replay_status:replay.status,steps:replay.results.length},'AUTHORIZED_REAL_OBSERVATION_ADAPTER_E2E');
}

async function runAndroidShell(){
  const worker=buildAndroidDeviceWorkerShellV0({context:ctx('AUTO-001'),capabilities:['PING','STATUS','SCREENSHOT_PREVIEW','REPLAY_SIMULATION']});
  const blocked=authorizeAndroidWorkerCommandV0({worker,command:{type:'PING',company_id:'fenix',idempotency_key:'physical-e2e-ping-1'}});
  if(blocked.accepted!==false||blocked.reason!=='KILL_SWITCH_ENABLED')throw new Error('Android worker must fail closed before device binding');
  return safeResult(48,'GOVERNED_SHELL_GREEN_PHYSICAL_DEVICE_PENDING',{checksum:worker.checksum,kill_switch_enabled:worker.kill_switch_enabled,physical_binding_required:worker.physical_binding_required,blocked_reason:blocked.reason,artifact_count:Object.keys(worker.files).length},'AUTHORIZED_DEVICE_ATTESTATION_AND_PHYSICAL_BINDING');
}

async function runCompetDurable(workdir){
  const queuePath=path.join(workdir,'compet-jobs.v8journal');
  const queue=new PersistentJobQueue({file_path:queuePath,environment:PREPROD});
  const context=ctx('COMPET-001');
  const payload={previous:[{competitor_id:'comp-a',dimension:'offer',value:'A',source_url:'https://example.com/old',source_access:'PUBLIC',observed_at:'2026-10-14T10:00:00Z',confidence:0.9}],current:[{competitor_id:'comp-a',dimension:'offer',value:'B',source_url:'https://example.com/new',source_access:'PUBLIC',observed_at:'2026-10-14T11:00:00Z',confidence:0.95}],cycle_anchor:'2026-10-14T12:00:00Z',cadence_hours:24};
  const enqueued=queue.enqueue({name:'COMPET-001_CONTINUOUS_SCAN',context,payload,idempotency_key:'compet-e2e-1'});
  if(!enqueued.accepted)throw new Error('COMPET job enqueue failed');
  const claimed=queue.claimContext(context);if(!claimed)throw new Error('COMPET job claim failed');
  const result=runCompetContinuousV0({context,...claimed.payload});
  const completed=queue.completeContext(claimed.job_id,context,result);
  if(completed.status!=='SUCCEEDED'||result.change_count!==1)throw new Error('COMPET durable E2E failed');
  const reopened=new PersistentJobQueue({file_path:queuePath,environment:PREPROD});
  const duplicate=reopened.enqueue({name:'COMPET-001_CONTINUOUS_SCAN',context,payload,idempotency_key:'compet-e2e-1'});
  if(!duplicate.duplicate)throw new Error('COMPET durable idempotency failed');
  return safeResult(57,'DURABLE_SCHEDULER_E2E_GREEN_SOURCE_ADAPTER_PENDING',{job_id:claimed.job_id,job_status:completed.status,change_count:result.change_count,next_scheduled_for:result.next_job.scheduled_for,journal_sha256:sha(fs.readFileSync(queuePath))},'PHYSICAL_PUBLIC_OR_AUTHORIZED_SOURCE_ADAPTER_E2E');
}

async function runCapDurable(workdir){
  const queuePath=path.join(workdir,'cap-jobs.v8journal');
  const queue=new PersistentJobQueue({file_path:queuePath,environment:PREPROD});
  const context=ctx('CAP-001');
  const payload={source_records:[{company_name:'Acme',domain:'acme.test',sector:'inmobiliaria',geography:'cordoba',employee_count:5,signals:['partner'],source_url:'https://example.com/acme',source_access:'PUBLIC',evidence_at:'2026-10-14T11:00:00Z'}],icp:{sectors:['inmobiliaria'],geographies:['cordoba'],min_employees:1,max_employees:20,signals:['partner']}};
  const enqueued=queue.enqueue({name:'CAP-001_AUTONOMOUS_DISCOVERY',context,payload,idempotency_key:'cap-e2e-1'});
  if(!enqueued.accepted)throw new Error('CAP job enqueue failed');
  const claimed=queue.claimContext(context);if(!claimed)throw new Error('CAP job claim failed');
  const result=runCapDiscoveryV0({context,...claimed.payload});
  const completed=queue.completeContext(claimed.job_id,context,result);
  if(completed.status!=='SUCCEEDED'||result.company_count!==1||result.companies[0].fit_score!==100)throw new Error('CAP durable E2E failed');
  if(result.personal_contacts_generated!==0||result.outreach_actions!==0||result.crm_writes!==0)throw new Error('CAP side effect boundary violated');
  return safeResult(62,'DURABLE_SCHEDULER_E2E_GREEN_SOURCE_ADAPTER_PENDING',{job_id:claimed.job_id,job_status:completed.status,company_count:result.company_count,top_fit_score:result.companies[0].fit_score,journal_sha256:sha(fs.readFileSync(queuePath))},'PHYSICAL_ZERO_COST_PUBLIC_OR_AUTHORIZED_SOURCE_ADAPTER_E2E');
}

async function runEventCaptureHttp(workdir){
  const journalPath=path.join(workdir,'first-party-events.v8journal');
  const capture=new FirstPartyEventCaptureV0({file_path:journalPath,company_id:'fenix'});
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.method!=='POST'||req.url!=='/events'){res.writeHead(404);res.end('not found');return;}
      const body=JSON.parse(await readBody(req));
      const result=capture.capture(body);
      res.writeHead(result.accepted?201:200,{'content-type':'application/json'});res.end(JSON.stringify(result));
    }catch(error){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:String(error?.message??error)}));}
  });
  const address=await listen(server);
  try{
    const response=await fetch(`http://127.0.0.1:${address.port}/events`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event_type:'PAGE_VIEW',occurred_at:'2026-10-14T12:00:00Z',page_path:'/preprod/landing?utm_source=e2e#hero',account_ref:'acct-e2e',properties:{page_category:'SERVICE',campaign_ref:'e2e'},consent:{analytics:true},idempotency_key:'evt-http-e2e-1'})});
    const payload=await response.json();
    if(response.status!==201||payload.accepted!==true)throw new Error('first-party emitter HTTP capture failed');
    const reopened=new FirstPartyEventCaptureV0({file_path:journalPath,company_id:'fenix'});
    if(reopened.operation_count!==1||reopened.list()[0].page_path!=='/preprod/landing')throw new Error('first-party persistence reopen failed');
    return safeResult(74,'LOCAL_HTTP_EMITTER_CAPTURE_E2E_GREEN_STAGING_BINDING_PENDING',{http_status:response.status,event_id:payload.event.event_id,persisted_events:reopened.operation_count,journal_sha256:sha(fs.readFileSync(journalPath))},'CONSENTED_REAL_PREPROD_WEBSITE_EMITTER_BINDING_AND_REMOTE_E2E');
  }finally{await close(server);}
}

async function runTemplateServe(workdir){
  const pwa=buildAppTemplatePackV0({context:ctx('APPBOOT-001'),type:'PWA',name:'CEREBRO E2E PWA',brand_tokens:{primary:'#222222',surface:'#FFFFFF',accent:'#FFB71B',font_family:'Montserrat'}});
  const mobile=buildAppTemplatePackV0({context:ctx('APPBOOT-001'),type:'MOBILE_TEMPLATE',name:'CEREBRO E2E Mobile'});
  const root=path.join(workdir,'pwa');fs.mkdirSync(root,{recursive:true});writeArtifacts(root,pwa.artifacts);
  const server=http.createServer((req,res)=>{const rel=(req.url==='/'?'index.html':String(req.url).replace(/^\//,''));const target=path.resolve(root,rel);if(!target.startsWith(path.resolve(root)+path.sep)&&target!==path.resolve(root,'index.html')){res.writeHead(403);res.end();return;}if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':rel.endsWith('.json')||rel.endsWith('.webmanifest')?'application/json':'text/plain'});res.end(fs.readFileSync(target));});
  const address=await listen(server);
  try{
    const index=await fetch(`http://127.0.0.1:${address.port}/`);const html=await index.text();
    const manifest=await fetch(`http://127.0.0.1:${address.port}/manifest.webmanifest`);const manifestJson=await manifest.json();
    if(index.status!==200||manifest.status!==200||!html.includes('CEREBRO E2E PWA')||manifestJson.display!=='standalone')throw new Error('PWA local serve E2E failed');
    if(!mobile.artifacts['android/app/src/main/AndroidManifest.xml']||!mobile.artifacts['android/app/src/main/java/MainActivity.kt'])throw new Error('mobile template artifacts missing');
    return safeResult(183,'LOCAL_PWA_SERVE_E2E_GREEN_MOBILE_BUILD_DEPLOY_PENDING',{pwa_checksum:pwa.checksum,pwa_http_status:index.status,manifest_http_status:manifest.status,pwa_artifact_count:Object.keys(pwa.artifacts).length,mobile_artifact_count:Object.keys(mobile.artifacts).length},'GOVERNED_PREPROD_DEPLOY_ADAPTER_AND_ANDROID_BUILD_PHYSICAL_ACCEPTANCE');
  }finally{await close(server);}
}

export async function runFact001SixGapPhysicalE2EV0({workdir}={}){
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-six-gap-e2e-'));
  const owns=!workdir;fs.mkdirSync(root,{recursive:true});
  try{
    const results=[];
    results.push(await runWatchLearn());
    results.push(await runAndroidShell());
    results.push(await runCompetDurable(root));
    results.push(await runCapDurable(root));
    results.push(await runEventCaptureHttp(root));
    results.push(await runTemplateServe(root));
    const passed=results.filter(x=>x.state.includes('GREEN')||x.state==='GOVERNED_SHELL_GREEN_PHYSICAL_DEVICE_PENDING').length;
    const report={schema_version:'1.0.0',state_type:'CEREBRO_FACT001_SIX_GAP_PHYSICAL_E2E_V0',environment:PREPROD,version:VERSION,status:passed===6?'LOCAL_E2E_GREEN_PHYSICAL_EXTERNAL_BINDINGS_PENDING':'E2E_RED',results,passed,total:6,human_required:[],prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,next_gate:'EXTERNAL_PREPROD_BINDINGS_48_57_62_74_183_AND_REAL_OBSERVATION_47'};
    report.evidence_sha256=sha(report);return Object.freeze(report);
  }finally{if(owns)fs.rmSync(root,{recursive:true,force:true});}
}

function parseArgs(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i]==='--out')out.out=argv[++i];else if(argv[i]==='--workdir')out.workdir=argv[++i];else throw new Error(`unknown argument: ${argv[i]}`);}return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=parseArgs(process.argv);runFact001SixGapPhysicalE2EV0({workdir:args.workdir}).then(report=>{const text=JSON.stringify(report,null,2)+'\n';if(args.out){fs.mkdirSync(path.dirname(path.resolve(args.out)),{recursive:true});fs.writeFileSync(args.out,text,'utf8');}process.stdout.write(text);}).catch(error=>{process.stderr.write(JSON.stringify({status:'E2E_RED',error:String(error?.stack??error),prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
