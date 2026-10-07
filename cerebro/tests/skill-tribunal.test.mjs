import test from 'node:test';
import assert from 'node:assert/strict';
import {runSkillTribunal} from '../skills/skill-tribunal.mjs';

const candidateId='c1';
function greenInput(){
  return {
    staticLab:{results:[{candidate_id:candidateId,declared_name:'supabase-postgres-best-practices',domain:'data-database-supabase',status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',policy_alignment_score:100,hard_blocks:[]}]},
    licenses:{results:[{candidate_id:candidateId,status:'EXACT_LICENSE_FILE_EVIDENCE',metadata_matches_detected:true,detected_families:['MIT'],legal_compatibility:'UNASSESSED'}]},
    behavioralResults:{status:'PROXY_COMPLETE',results:[{candidate_id:candidateId,status:'PROXY_COMPLETE'}]},
    independentJudge:{green:true,decision:'GREEN_FOR_TRIBUNAL_REVIEW',packages:[{candidate_id:candidateId,decision:'GREEN'}]},
    rollback:{ready:true,status:'GREEN_ROLLBACK_REBUILD_PROOF',plans:[{candidate_id:candidateId,ready:true,decision:'GREEN'}]},
    routeAudit:{status:'READY_ZERO_COST_ROUTE'},
    rsiShadow:{bridge_status:'SHADOW_BRIDGE_GREEN'}
  };
}

test('complete evidence becomes tribunal GREEN but never authorizes PROD',()=>{
  const r=runSkillTribunal(greenInput());
  assert.equal(r.green,true);
  assert.equal(r.decision,'GREEN');
  assert.equal(r.prod_authorized,false);
  assert.equal(r.autonomous_promotion_authorized,false);
  assert.equal(r.legal_final_opinion,false);
  assert.equal(r.candidates[0].decision,'GREEN');
});

test('missing behavioral or judge evidence fails closed',()=>{
  const i=greenInput();
  i.behavioralResults={status:'BLOCKED_BY_EXECUTION_GATE',results:[]};
  i.independentJudge={green:false,decision:'NOT_READY',packages:[]};
  const r=runSkillTribunal(i);
  assert.equal(r.green,false);
  assert.ok(r.blockers.includes('BEHAVIORAL_EVIDENCE_NOT_COMPLETE'));
  assert.ok(r.blockers.includes('INDEPENDENT_JUDGE_NOT_GREEN'));
});

test('license mismatch or nonpermissive evidence blocks candidate',()=>{
  const i=greenInput();
  i.licenses.results[0].metadata_matches_detected=false;
  i.licenses.results[0].detected_families=['GPL-3.0'];
  const r=runSkillTribunal(i);
  assert.equal(r.green,false);
  assert.ok(r.candidates[0].blockers.includes('LICENSE_METADATA_MISMATCH'));
  assert.ok(r.candidates[0].blockers.includes('PERMISSIVE_LICENSE_EVIDENCE_NOT_ESTABLISHED'));
});

test('static security or policy regression blocks tribunal even with green behavioral result',()=>{
  const i=greenInput();
  i.staticLab.results[0].hard_blocks=['SAFETY_OVERRIDE'];
  i.staticLab.results[0].policy_alignment_score=75;
  const r=runSkillTribunal(i);
  assert.equal(r.green,false);
  assert.ok(r.candidates[0].blockers.includes('STATIC_SECURITY_HARD_BLOCK'));
  assert.ok(r.candidates[0].blockers.includes('STATIC_POLICY_NOT_FULLY_ALIGNED'));
});
