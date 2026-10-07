import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {invokeZeroCostProvider} from './skill-zero-cost-provider-client.mjs';
import {quotaDecision} from './skill-free-quota-guard.mjs';
import {compileBehavioralPrompt,evaluateProxyOutput} from './skill-behavioral-proxy-runner.mjs';
import {applyAgentBrowserCerebroWrapper,renderAgentBrowserWrapperPromptContract} from './skill-cerebro-agent-browser-wrapper.mjs';

const MAX_SKILL_BYTES=256*1024;
function sha256(text){return createHash('sha256').update(String(text??'')).digest('hex');}
function byCandidate(report,key='results'){const m=new Map();for(const x of report?.[key]??[]) if(x?.candidate_id)m.set(x.candidate_id,x);return m;}

async function fetchExactSkillText(candidate,manifest,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch,timeoutMs=10000}={}){
  const [owner,repo]=String(candidate?.candidate?.upstream_full_name??'').split('/');
  const commit=candidate?.candidate?.upstream_head_commit;
  const skillPath=manifest?.manifest_path;
  if(!owner||!repo||!commit||!skillPath) throw new Error('SKILL_PROVENANCE_INCOMPLETE');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const headers={accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'CEREBRO-OS-AgentBrowserBehavioralProxy/0.1'};
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
    if(sha256(skillText)!==manifest.sha256) throw new Error('SKILL_PROVENANCE_HASH_MISMATCH');
    return skillText;
  }finally{clearTimeout(timer);}
}

function compileAgentBrowserPrompt({fixture,skillText,arm}){
  const base=compileBehavioralPrompt({fixture,skillText,arm,domain:'browser-automation-scraping'});
  if(arm!=='CANDIDATE_SKILL_PROXY') return base;
  return `${base}\n\n${renderAgentBrowserWrapperPromptContract(fixture)}`;
}

export async function runAgentBrowserBehavioralProxy({oldVsNew,manifests,gate,quotaPlan,routeAudit,env=process.env,providerFetch=fetch,githubFetch=fetch,githubToken=process.env.GITHUB_TOKEN,invokeProvider=invokeZeroCostProvider,observedAt=new Date().toISOString()}={}){
  if(typeof invokeProvider!=='function') throw new TypeError('invokeProvider must be a function');
  if(gate?.allowed!==true) return Object.freeze({schema_version:'0.1.1',execution_mode:'SYNTHETIC_AGENT_BROWSER_BEHAVIORAL_PROXY',status:'BLOCKED_BY_EXECUTION_GATE',blockers:gate?.blockers??['GATE_CLOSED'],calls_executed:0,external_skill_code_executed:false,prod_authorized:false,results:[]});
  if(quotaPlan?.executable!==true||!routeAudit?.selected_route) return Object.freeze({schema_version:'0.1.1',execution_mode:'SYNTHETIC_AGENT_BROWSER_BEHAVIORAL_PROXY',status:'BLOCKED_BY_ROUTE_OR_QUOTA',calls_executed:0,external_skill_code_executed:false,prod_authorized:false,results:[]});
  const packages=oldVsNew?.packages??[];
  if(packages.length!==1||packages[0]?.domain!=='browser-automation-scraping'||packages[0]?.admission_basis!=='NORMALIZED_CEREBRO_WRAPPER') return Object.freeze({schema_version:'0.1.1',execution_mode:'SYNTHETIC_AGENT_BROWSER_BEHAVIORAL_PROXY',status:'BLOCKED_WRONG_TARGET_PACKAGE',calls_executed:0,external_skill_code_executed:false,prod_authorized:false,results:[]});
  const manifestMap=byCandidate(manifests);
  const providerId=routeAudit.selected_route.provider_id;
  const results=[];let callsUsed=0;let stopReason=null;
  for(const pkg of packages){
    const manifest=manifestMap.get(pkg.candidate_id);
    let skillText;
    try{skillText=await fetchExactSkillText(pkg,manifest,{token:githubToken,fetchImpl:githubFetch});}
    catch(err){results.push({package_id:pkg.package_id,candidate_id:pkg.candidate_id,status:'BLOCKED_SKILL_FETCH',error:String(err.message),fixture_results:[]});continue;}
    const fixtureResults=[];
    for(const fixture of pkg.fixtures??[]){
      if(stopReason) break;
      const armResults=[];
      for(const [arm,skill] of [['BASELINE_PROXY',null],['CANDIDATE_SKILL_PROXY',skillText]]){
        const q=quotaDecision(quotaPlan,{calls_used:callsUsed});
        if(q.status!=='ALLOW_NEXT_SYNTHETIC_CALL'){stopReason=q.reason;break;}
        const prompt=compileAgentBrowserPrompt({fixture,skillText:skill,arm});
        const response=await invokeProvider({providerId,prompt,gate,quotaDecisionResult:q,env,fetchImpl:providerFetch});
        callsUsed+=1;
        if(!response.ok){stopReason=response.stop_reason;break;}
        const wrapped=applyAgentBrowserCerebroWrapper({rawOutput:response.output_text,fixture,domain:pkg.domain,arm});
        armResults.push({
          ...evaluateProxyOutput({text:wrapped.text,fixture,arm,semanticOverlayText:wrapped.semantic_overlay_text??''}),
          provider_id:response.provider_id,model:response.model,usage:response.usage,provider_output_sha256:response.output_sha256,
          wrapper_applied:wrapped.applied,wrapper_id:wrapped.wrapper_id,wrapper_version:wrapped.wrapper_version,
          wrapper_policy_conflict:wrapped.policy_conflict,upstream_guidance_discarded:wrapped.upstream_guidance_discarded,
          wrapper_safeguards:wrapped.safeguards??[],wrapper_policy_precedence:wrapped.policy_precedence??null,
          wrapper_upstream_guidance_trust:wrapped.upstream_guidance_trust??null,wrapper_additional_cost_eur:wrapped.additional_cost_eur??0,
          wrapper_external_skill_code_execution:wrapped.external_skill_code_execution??false,wrapper_prod_authorized:wrapped.prod_authorized??false,
          wrapper_trading_access:wrapped.trading_access??false,wrapper_semantic_overlay_sha256:wrapped.semantic_overlay_sha256??null,
          wrapped_output_sha256:wrapped.output_sha256
        });
      }
      if(armResults.length===2) fixtureResults.push({fixture_id:fixture.fixture_id,arms:armResults});
    }
    const candidateArms=fixtureResults.map(x=>x.arms.find(a=>a.arm==='CANDIDATE_SKILL_PROXY')).filter(Boolean);
    const baselineArms=fixtureResults.map(x=>x.arms.find(a=>a.arm==='BASELINE_PROXY')).filter(Boolean);
    const avg=(arr,key)=>arr.length?Number((arr.reduce((n,x)=>n+Number(x[key]??0),0)/arr.length).toFixed(2)):null;
    const metricSet=(arms)=>({constraint_compliance:avg(arms,'constraint_compliance'),task_correctness_proxy:avg(arms,'task_correctness_proxy'),evidence_quality_proxy:avg(arms,'evidence_quality_proxy'),human_exception_correctness:avg(arms,'human_exception_correctness')});
    results.push({package_id:pkg.package_id,candidate_id:pkg.candidate_id,domain:pkg.domain,status:stopReason?'PARTIAL_STOPPED':'PROXY_COMPLETE',baseline_metrics:metricSet(baselineArms),candidate_metrics:metricSet(candidateArms),fixture_results:fixtureResults,actual_current_engine_baseline_executed:false,independent_judge_executed:false,rollback_proof:false,promotion_authorized:false});
  }
  return Object.freeze({schema_version:'0.1.1',execution_mode:'SYNTHETIC_AGENT_BROWSER_BEHAVIORAL_PROXY',observed_at:observedAt,status:stopReason?'STOPPED_FAIL_CLOSED':'PROXY_COMPLETE',stop_reason:stopReason,calls_executed:callsUsed,provider_id:providerId,synthetic_only:true,external_skill_code_executed:false,actual_current_engine_baseline_executed:false,independent_judge_executed:false,prod_authorized:false,promotion_authorized:false,results});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
if(import.meta.url===`file://${process.argv[1]}`){
  const report=await runAgentBrowserBehavioralProxy({oldVsNew:load(argValue('--oldnew')??'artifacts/cerebro-skill-old-vs-new-agent-browser-p0.json'),manifests:load(argValue('--manifests')??'artifacts/cerebro-skill-manifests.json'),gate:load(argValue('--gate')??'artifacts/cerebro-skill-behavioral-execution-gate.json'),quotaPlan:load(argValue('--quota')??'artifacts/cerebro-skill-free-quota-plan.json'),routeAudit:load(argValue('--route')??'artifacts/cerebro-skill-zero-cost-route.json')});
  const output=argValue('--output')??'artifacts/cerebro-skill-behavioral-proxy.json';
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.status,stop_reason:report.stop_reason??null,calls_executed:report.calls_executed,provider_id:report.provider_id??null,target:'agent-browser',synthetic_only:true,external_skill_code_executed:false,prod_authorized:false}));
}
