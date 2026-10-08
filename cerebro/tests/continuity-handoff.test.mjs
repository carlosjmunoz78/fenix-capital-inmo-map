import test from 'node:test';
import assert from 'node:assert/strict';
import {buildContinuityState,validatePreventiveHandoff,minimalResumePlan} from '../runtime/continuity-handoff.mjs';

const HEAD='7ce05495a2bbb1e3d9b14fcbe33849d9c0197193';
const OTHER='63e4a02341d8884b4df21c7c2a94562b06844059';
function state(){return buildContinuityState({repository:'carlosjmunoz78/fenix-capital-inmo-map',branch:'cerebro-rsi-recovery-001-20261008',head:HEAD,pr:{number:502,state:'open',draft:true},runs:[{id:37776551209,status:'completed',conclusion:'success'}],files:['cerebro/runtime/continuity-handoff.mjs'],blocks:{'RSI-RECOVERY-001F':{state:'PLANIFIED'}},next_block:'RSI-RECOVERY-001F',live_verification_targets:['HEAD','PR','CI']});}

test('continuity state requires live-looking git SHA PR CI and next block',()=>{
  const s=state();
  assert.equal(s.generated_from_live_state,true);
  assert.equal(s.no_invented_sha,true);
  assert.equal(s.prod_authorized,false);
  assert.throws(()=>buildContinuityState({repository:'r',branch:'b',head:'invented',pr:{number:1},runs:[{id:1,status:'success'}],blocks:{x:{}},next_block:'x',live_verification_targets:['HEAD']}),/live git state/);
});

test('preventive handoff requires machine-readable state and README while recommending richer artifacts',()=>{
  const ok=validatePreventiveHandoff({state:state(),artifacts:{continuity_state_json:'state.json',handoff_readme_md:'README.md'}});
  assert.equal(ok.ok,true);
  assert.ok(ok.recommended_missing.includes('continuity_master_docx'));
  const bad=validatePreventiveHandoff({state:state(),artifacts:{}});
  assert.equal(bad.ok,false);
});

test('resume plan jumps directly to next block when HEAD matches',()=>{
  assert.equal(minimalResumePlan(state(),HEAD).action,'RESUME_NEXT_BLOCK');
  const changed=minimalResumePlan(state(),OTHER);
  assert.equal(changed.action,'VERIFY_NEW_HEAD_ONLY');
  assert.ok(changed.verify.includes('DIFF_FROM_HANDOFF_HEAD'));
});
