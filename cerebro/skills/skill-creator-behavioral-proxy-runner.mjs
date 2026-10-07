import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {invokeZeroCostProvider} from './skill-zero-cost-provider-client.mjs';
import {quotaDecision} from './skill-free-quota-guard.mjs';
import {compileBehavioralPrompt,evaluateProxyOutput} from './skill-behavioral-proxy-runner.mjs';
import {CEREBRO_SKILL_CREATOR_WRAPPER,applySkillCreatorCerebroWrapper,renderSkillCreatorWrapperPromptContract} from './skill-cerebro-skill-creator-wrapper.mjs';

const MAX_SKILL_BYTES=256*1024;
const DEFAULT_PROVIDER_TIMEOUT_MS=45000;
const MAX_PROVIDER_TIMEOUT_MS=60000;
function sha256(text){return createHash('sha256').update(String(text??'')).digest('hex');}
function providerTimeoutMs(env){const parsed=Number(env?.CEREBRO_SKILL_CREATOR_PROVIDER_TIMEOUT_MS??DEFAULT_PROVIDER_TIMEOUT_MS);if(!Number.isFinite(parsed))return DEFAULT_PROVIDER_TIMEOUT_MS;return Math.min(MAX_PROVIDER_TIMEOUT_MS,Math.max(30000,Math.trunc(parsed)));}

async function fetchExactSkillText(pkg,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch,timeoutMs=10000}={}){
  const [owner,repo]=String(pkg?.candidate?.upstream_full_name??'').split('/');
  const commit=pkg?.candidate?.upstream_head_commit;
  const skillPath=pkg?.candidate?.manifest_path;
  const expectedSha=pkg?.candidate?.manifest_sha256;
  if(!owner||!repo||!commit||!skillPath||!expectedSha) throw new Error('SKILL_PROVENANCE_INCOMPLETE');
  if(`${owner}/${repo}`!==CEREBRO_SKILL_CREATOR_WRAPPER.approved_upstream_full_name||skillPath!==CEREBRO_SKILL_CREATOR_WRAPPER.approved_manifest_path) throw new Error('SKILL_CREATOR_TARGET_NOT_APPROVED');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const headers={accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'CEREBRO-OS-SkillCreatorBehavioralProxy/0.1'};
  if(token) headers.authorization=`Bearer ${token}`;
  try{
    const encoded=skillPath.split('/').map(encodeURIComponent).join('/');
    const response=await fetchImpl(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encoded}?ref=${encodeURIComponent(commit)}`,{headers,signal:controller.signal,redirect:'follow'});
    if(!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const body=await response.json();
    if(body.encoding!=='base64'||typeof body.content!=='string') throw new Error('SKILL_CONTENT_ENCODING_UNSUPPORTED');
    const bytes=Buffer.from(body.content.replace(/\n/g,''),'base64');
    if(bytes.length>MAX_SKILL_BYTES) throw new Error('SKILL_CONTENT_TOO_LARGE');
    const skillText=bytes.toString('utf8');
    if(sha256(skillText)!==expectedSha) throw new Error('SKILL_PROVENANCE_HASH_MISMATCH');
    return skillText;
  }finally{clearTimeout(timer);}
}

function compileSkillCreatorPrompt({fixture,skillText,arm}){
  const base=compileBehavioralPrompt({fixture,skillText,arm,domain:CEREBRO_SKILL_CREATOR_WRAPPER.domain});
  return arm==='CANDIDATE_SKILL_PROXY'?`${base}\n\n${renderSkillCreatorWrapperPromptContract(fixture)}`:base;
}

export async function runSkillCreatorBehavioralProxy({oldVsNew,gate,quotaPlan,routeAudit,env=process.env,providerFetch=fetch,githubFetch=fetch,githubToken=process.env.GITHUB_TOKEN,invokeProvider=invokeZeroCostProvider,observedAt=new Date().toISOString()}={}){
  if(typeof invokeProvider!=='function') throw new TypeError('invokeProvider must be a function');
  const timeoutMs=providerTimeoutMs(env);
  const blocked=(status,blockers)=>Object.freeze({schema_version:'0.1.0',execution_mode:'SYNTHETIC_SKILL_CREATOR_BEHAVIORAL_PROXY',status,blockers,calls_executed:0,provider_timeout_ms:timeoutMs,synthetic_only:true,external_skill_code_executed:false,prod_authorized:false,results:[]});
  if(gate?.allowed!==true) return blocked('BLOCKED_BY_EXECUTION_GATE',gate?.blockers??['GATE_CLOSED']);
  if(quotaPlan?.executable!==true||!routeAudit?.selected_route) return blocked('BLOCKED_BY_ROUTE_OR_QUOTA',['ROUTE_OR_QUOTA_NOT_READY']);
  const packages=oldVsNew?.packages??[];
  const pkg=packages[0];
  if(packages.length!==1||pkg?.domain!==CEREBRO_SKILL_CREATOR_WRAPPER.domain||pkg?.admission_basis!=='NORMALIZED_CEREBRO_WRAPPER'||pkg?.candidate?.upstream_full_name!==CEREBRO_SKILL_CREATOR_WRAPPER.approved_upstream_full_name) return blocked('BLOCKED_WRONG_TARGET_PACKAGE',['WRONG_TARGET_PACKAGE']);
  const providerId=routeAudit.selected_route.provider_id;
  let skillText;
  try{skillText=await fetchExactSkillText(pkg,{token:githubToken,fetchImpl:githubFetch});}
  catch(err){return Object.freeze({schema_version:'0.1.0',execution_mode:'SYNTHETIC_SKILL_CREATOR_BEHAVIORAL_PROXY',observed_at:observedAt,status:'BLOCKED_SKILL_FETCH',stop_reason:String(err.message),calls_executed:0,provider_id:providerId,provider_timeout_ms:timeoutMs,synthetic_only:true,external_skill_code_executed:false,prod_authorized:false,results:[{package_id:pkg.package_id,candidate_id:pkg.candidate_id,status:'BLOCKED_SKILL_FETCH',error:String(err.message),fixture_results:[]}]});}

  const fixtureResults=[];let callsUsed=0;let stopReason=null;
  for(const fixture of pkg.fixtures??[]){
    if(stopReason) break;
    const armResults=[];
    for(const [arm,skill] of [['BASELINE_PROXY',null],['CANDIDATE_SKILL_PROXY',skillText]]){
      const q=quotaDecision(quotaPlan,{calls_used:callsUsed});
      if(q.status!=='ALLOW_NEXT_SYNTHETIC_CALL'){stopReason=q.reason;break;}
      const prompt=compileSkillCreatorPrompt({fixture,skillText:skill,arm});
      const response=await invokeProvider({providerId,prompt,gate,quotaDecisionResult:q,env,fetchImpl:providerFetch,timeoutMs});
      callsUsed+=1;
      if(!response.ok){stopReason=response.stop_reason;break;}
      const wrapped=applySkillCreatorCerebroWrapper({rawOutput:response.output_text,fixture,domain:pkg.domain,arm,upstreamFullName:pkg.candidate.upstream_full_name});
      armResults.push({...evaluateProxyOutput({text:wrapped.text,fixture,arm,semanticOverlayText:wrapped.semantic_overlay_text??''}),provider_id:response.provider_id,model:response.model,usage:response.usage,provider_output_sha256:response.output_sha256,wrapper_applied:wrapped.applied,wrapper_id:wrapped.wrapper_id,wrapper_version:wrapped.wrapper_version,wrapper_policy_conflict:wrapped.policy_conflict,upstream_guidance_discarded:wrapped.upstream_guidance_discarded,wrapper_safeguards:wrapped.safeguards??[],wrapper_policy_precedence:wrapped.policy_precedence??null,wrapper_upstream_guidance_trust:wrapped.upstream_guidance_trust??null,wrapper_additional_cost_eur:wrapped.additional_cost_eur??0,wrapper_external_skill_code_execution:wrapped.external_skill_code_execution??false,wrapper_prod_authorized:wrapped.prod_authorized??false,wrapper_trading_access:wrapped.trading_access??false,wrapper_semantic_overlay_sha256:wrapped.semantic_overlay_sha256??null,wrapped_output_sha256:wrapped.output_sha256});
    }
    if(armResults.length===2) fixtureResults.push({fixture_id:fixture.fixture_id,arms:armResults});
  }
  const candidateArms=fixtureResults.map(x=>x.arms.find(a=>a.arm==='CANDIDATE_SKILL_PROXY')).filter(Boolean);
  const baselineArms=fixtureResults.map(x=>x.arms.find(a=>a.arm==='BASELINE_PROXY')).filter(Boolean);
  const avg=(arr,key)=>arr.length?Number((arr.reduce((n,x)=>n+Number(x[key]??0),0)/arr.length).toFixed(2)):null;
  const metricSet=(arms)=>({constraint_compliance:avg(arms,'constraint_compliance'),task_correctness_proxy:avg(arms,'task_correctness_proxy'),evidence_quality_proxy:avg(arms,'evidence_quality_proxy'),human_exception_correctness:avg(arms,'human_exception_correctness')});
  const result={package_id:pkg.package_id,candidate_id:pkg.candidate_id,domain:pkg.domain,status:stopReason?'PARTIAL_STOPPED':'PROXY_COMPLETE',baseline_metrics:metricSet(baselineArms),candidate_metrics:metricSet(candidateArms),fixture_results:fixtureResults,actual_current_engine_baseline_executed:false,independent_judge_executed:false,rollback_proof:false,promotion_authorized:false};
  return Object.freeze({schema_version:'0.1.0',execution_mode:'SYNTHETIC_SKILL_CREATOR_BEHAVIORAL_PROXY',observed_at:observedAt,status:stopReason?'STOPPED_FAIL_CLOSED':'PROXY_COMPLETE',stop_reason:stopReason,calls_executed:callsUsed,provider_id:providerId,provider_timeout_ms:timeoutMs,synthetic_only:true,external_skill_code_executed:false,actual_current_engine_baseline_executed:false,independent_judge_executed:false,prod_authorized:false,promotion_authorized:false,results:[result]});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
if(import.meta.url===`file://${process.argv[1]}`){
  const report=await runSkillCreatorBehavioralProxy({oldVsNew:load(argValue('--oldnew')??'artifacts/cerebro-skill-creator-old-vs-new.json'),gate:load(argValue('--gate')??'artifacts/cerebro-skill-creator-behavioral-gate.json'),quotaPlan:load(argValue('--quota')??'artifacts/cerebro-skill-creator-quota.json'),routeAudit:load(argValue('--route')??'artifacts/cerebro-skill-creator-route.json')});
  const output=argValue('--output')??'artifacts/cerebro-skill-creator-behavioral-proxy.json';
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.status,stop_reason:report.stop_reason??null,calls_executed:report.calls_executed,provider_id:report.provider_id??null,target:'skill-creator',synthetic_only:true,external_skill_code_executed:false,prod_authorized:false}));
}
