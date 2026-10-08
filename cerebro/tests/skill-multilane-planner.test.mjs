import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILL_STUDY_LANES,buildMultilanePlan,classifyStrategicLane,estimateWorkClass,isExpressCandidate} from '../skills/skill-multilane-planner.mjs';
import {initialMultilaneState,reconcileMultilaneResults} from '../skills/skill-multilane-reconcile.mjs';

function c(id,domain,name,{score=80,permission=95,portability=100,permissionRisk=0,instructionRisk=0,recommendation='HIGH_VALUE_LAB_BENCHMARK'}={}){
  return {candidate_id:id,domain,declared_name:name,declared_description:`Operational ${name} capability`,value_score:score,recommendation,components:{permission_simplicity:permission,portability},penalties:{permission_risk:permissionRisk,instruction_integrity:instructionRisk},prod_authorized:false,external_code_executed:false};
}

test('factory exposes exactly five strategic lanes plus one multi-candidate FAST_LANE',()=>{
  assert.deepEqual(SKILL_STUDY_LANES.map((x)=>x.id),['ENGINEERING','DEVICE_CONTROL','GROWTH','CREATION','COMPANY','FAST_LANE']);
  assert.equal(SKILL_STUDY_LANES.find((x)=>x.id==='FAST_LANE').max_parallel,3);
});

test('domain routing matches the owner-approved strategic lines',()=>{
  assert.equal(classifyStrategicLane(c('e','software-engineering-devops','kairos-lite')),'ENGINEERING');
  assert.equal(classifyStrategicLane(c('d','browser-automation-scraping','computer-use')),'DEVICE_CONTROL');
  assert.equal(classifyStrategicLane(c('g','seo-search-content','seo-auditor')),'GROWTH');
  assert.equal(classifyStrategicLane(c('v','multimedia-voice-video-design','video-maker')),'CREATION');
  assert.equal(classifyStrategicLane(c('b','sales-crm-customer','crm-builder')),'COMPANY');
});

test('explicit domain wins over ambiguous keywords such as database design',()=>{
  const supabase=c('db','data-database-supabase','supabase-postgres-best-practices');
  supabase.declared_description='Postgres database design and query optimization';
  assert.equal(classifyStrategicLane(supabase),'COMPANY');
});

test('heavy device/company skills go DEEP while simple low-risk skills can be EXPRESS',()=>{
  assert.equal(estimateWorkClass(c('d','browser-automation-scraping','browser-control')),'DEEP');
  assert.equal(estimateWorkClass(c('b','multi-company-business-bootstrap','company-builder')),'DEEP');
  const small=c('x','documents-office-pdf','small formatter');
  assert.equal(estimateWorkClass(small),'EXPRESS');
  assert.equal(isExpressCandidate(small),true);
});

test('existing Kairos keeps engineering active while other strategic lanes and three fast skills advance',()=>{
  const value={results:[
    c('device','browser-automation-scraping','Android device control',{score:95}),
    c('growth','seo-search-content','SEO research',{score:94}),
    c('creation','multimedia-voice-video-design','Video renderer',{score:93}),
    c('company','sales-crm-customer','CRM builder',{score:92}),
    c('fast1','documents-office-pdf','PDF utility',{score:91}),
    c('fast2','productivity-office-workspace','Text utility',{score:90}),
    c('fast3','knowledge-research-training','Knowledge formatter',{score:89})
  ]};
  const autoloop={processed_candidate_ids:['kairos'],waiting_safe_handler:{kairos:{candidate_id:'kairos',name:'kairos-lite',domain:'software-engineering-devops',status:'WAITING_SAFE_HANDLER'}}};
  const plan=buildMultilanePlan(value,autoloop,initialMultilaneState());
  assert.equal(plan.lanes.ENGINEERING.status,'ACTIVE_EXISTING_CANONICAL_AUTOLOOP');
  assert.equal(plan.lanes.DEVICE_CONTROL.selected.length,1);
  assert.equal(plan.lanes.GROWTH.selected.length,1);
  assert.equal(plan.lanes.CREATION.selected.length,1);
  assert.equal(plan.lanes.COMPANY.selected.length,1);
  assert.equal(plan.lanes.FAST_LANE.selected.length,3);
  assert.equal(plan.matrix.length,7);
});

test('HUMAN_REQUIRED is visible but never blocks unrelated lanes',()=>{
  const value={results:[c('growth','seo-search-content','SEO helper')]};
  const autoloop={waiting_human:{blocked:{candidate_id:'blocked',name:'Sensitive skill',domain:'security-identity-privacy',human_required:'HIGH_RISK'}}};
  const plan=buildMultilanePlan(value,autoloop,{});
  assert.equal(plan.waiting_human.length,1);
  assert.equal(plan.waiting_human_blocks_other_lanes,false);
  assert.equal(plan.matrix.some((x)=>x.candidate_id==='growth'),true);
});

test('already studied, canonical-known or unsafe candidates are not relaunched',()=>{
  const unsafe={...c('unsafe','seo-search-content','unsafe'),prod_write:true};
  const value={results:[c('done','seo-search-content','done'),c('known','seo-search-content','known'),unsafe,c('fresh','seo-search-content','fresh')]};
  const plan=buildMultilanePlan(value,{processed_candidate_ids:['known']},{studied_candidate_ids:['done']});
  assert.deepEqual(plan.matrix.filter((x)=>x.lane==='GROWTH').map((x)=>x.candidate_id),['fresh']);
  assert.equal(plan.matrix.some((x)=>x.candidate_id==='unsafe'),false);
});

test('reconcile records completed static studies and preserves zero-risk invariants',()=>{
  const state=initialMultilaneState();
  const result={state_type:'CEREBRO_SKILL_MULTILANE_LANE_RESULT',candidate_id:'a',name:'A',human_alias:'A',lane:'FAST_LANE',work_class:'EXPRESS',value_score:88,assessment_complete:true,assessment_status:'STATIC_STUDY_GREEN',static_status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',rollback_green:true,prod_authorized:false,prod_write:false,customer_data_used:false,external_skill_code_execution:false,trading_access:false,paid_fallback:false,additional_cost_eur:0};
  const out=reconcileMultilaneResults(state,[result],{runId:123,now:'2026-10-08T10:00:00Z'});
  assert.deepEqual(out.studied_candidate_ids,['a']);
  assert.equal(out.assessments.a.study_run_id,123);
  assert.equal(out.lane_history.FAST_LANE.length,1);
  assert.equal(out.invariants.prod_write,false);
});

test('reconcile fails closed on any unsafe result',()=>{
  assert.throws(()=>reconcileMultilaneResults(initialMultilaneState(),[{state_type:'CEREBRO_SKILL_MULTILANE_LANE_RESULT',candidate_id:'x',assessment_complete:true,prod_write:true}]),/UNSAFE_MULTILANE_RESULT/);
});
