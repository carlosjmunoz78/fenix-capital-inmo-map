import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runAgentBrowserBehavioralProxy} from '../skills/skill-agent-browser-behavioral-proxy-runner.mjs';
import {AGENT_BROWSER_BEHAVIORAL_FIXTURES} from '../skills/skill-agent-browser-old-vs-new.mjs';

const skill='---\nname: agent-browser\ndescription: Browser automation skill\n---\nNavigate public pages, inspect selectors, fill synthetic forms, take screenshots and plan web tests.';
const candidateId='browser-candidate';
const skillSha=createHash('sha256').update(skill).digest('hex');
const oldVsNew={packages:[{package_id:'p-browser',candidate_id:candidateId,domain:'browser-automation-scraping',admission_basis:'NORMALIZED_CEREBRO_WRAPPER',candidate:{upstream_full_name:'vercel-labs/agent-browser',upstream_head_commit:'abc',manifest_sha256:skillSha},fixtures:structuredClone(AGENT_BROWSER_BEHAVIORAL_FIXTURES)}]};
const manifests={results:[{candidate_id:candidateId,status:'MANIFEST_RESOLVED_STATIC_ONLY',manifest_path:'skills/agent-browser/SKILL.md',sha256:skillSha}]};
const gate={allowed:true,blockers:[],synthetic_only:true,paid_fallback:false,prod_authorized:false};
const quotaPlan={executable:true,limits:{max_model_calls:6},paid_fallback:false};
const routeAudit={selected_route:{provider_id:'synthetic-zero-cost-test-provider'},synthetic_only:true};
const githubFetch=async()=>({ok:true,json:async()=>({encoding:'base64',content:Buffer.from(skill).toString('base64')})});

function mockProvider(){
  return async({prompt,providerId})=>{
    const required=JSON.parse(prompt.match(/Required constraints: (\[[^\n]+\])/i)?.[1]??'[]');
    const answer={
      answer:'Synthetic planning and evidence review only; no external action executed.',
      constraint_decisions:Object.fromEntries(required.map((item)=>[item,'COMPLY'])),
      proposed_actions:[],
      evidence_needed:[],
      human_required:null,
      confidence:0.9
    };
    const outputText=JSON.stringify(answer);
    return {ok:true,provider_id:providerId,model:'deterministic-test-double',output_text:outputText,output_sha256:createHash('sha256').update(outputText).digest('hex'),usage:{prompt_tokens:1,output_tokens:1,total_tokens:2}};
  };
}

test('agent-browser behavioral proxy runs exactly six synthetic calls and wraps candidate arms only',async()=>{
  let calls=0;
  const invokeProvider=async(args)=>{calls+=1;return mockProvider()(args);};
  const report=await runAgentBrowserBehavioralProxy({oldVsNew,manifests,gate,quotaPlan,routeAudit,githubFetch,invokeProvider,observedAt:'2026-10-07T00:00:00Z'});
  assert.equal(report.status,'PROXY_COMPLETE');
  assert.equal(report.calls_executed,6);
  assert.equal(calls,6);
  assert.equal(report.external_skill_code_executed,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.results.length,1);
  assert.equal(report.results[0].fixture_results.length,3);
  for(const fixture of report.results[0].fixture_results){
    const baseline=fixture.arms.find((x)=>x.arm==='BASELINE_PROXY');
    const candidate=fixture.arms.find((x)=>x.arm==='CANDIDATE_SKILL_PROXY');
    assert.equal(baseline.wrapper_applied,false);
    assert.equal(candidate.wrapper_applied,true);
    assert.equal(candidate.wrapper_external_skill_code_execution,false);
    assert.equal(candidate.wrapper_prod_authorized,false);
    assert.equal(candidate.constraint_compliance,100);
    assert.equal(candidate.evidence_quality_proxy,100);
    assert.equal(candidate.side_effect_count,0);
  }
});

test('wrong target package fails closed before any model-provider call',async()=>{
  let calls=0;
  const wrong=structuredClone(oldVsNew);
  wrong.packages[0].admission_basis='RAW_STATIC_GREEN';
  const report=await runAgentBrowserBehavioralProxy({oldVsNew:wrong,manifests,gate,quotaPlan,routeAudit,githubFetch,invokeProvider:async()=>{calls+=1;throw new Error('unexpected provider call');}});
  assert.equal(report.status,'BLOCKED_WRONG_TARGET_PACKAGE');
  assert.equal(report.calls_executed,0);
  assert.equal(calls,0);
});

test('closed gate fails closed before provenance fetch or model-provider call',async()=>{
  let calls=0;
  const closed={...gate,allowed:false,blockers:['EXPLICIT_EXECUTION_ENABLE_MISSING']};
  const report=await runAgentBrowserBehavioralProxy({oldVsNew,manifests,gate:closed,quotaPlan,routeAudit,githubFetch:async()=>{throw new Error('unexpected provenance fetch');},invokeProvider:async()=>{calls+=1;throw new Error('unexpected provider call');}});
  assert.equal(report.status,'BLOCKED_BY_EXECUTION_GATE');
  assert.equal(report.calls_executed,0);
  assert.equal(calls,0);
});
