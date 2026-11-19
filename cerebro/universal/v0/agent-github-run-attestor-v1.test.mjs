import test from 'node:test';
import assert from 'node:assert/strict';
import {attestGithubQaRunV1} from './agent-github-run-attestor-v1.mjs';
import {projectAgentEvidenceV1} from './agent-evidence-bridge-v1.mjs';
import {superviseAgentsV1} from './agent-supervisor-v1.mjs';
import {buildCerebroAgentDirectoryV0} from '../../../api/cerebro-agent-directory.ts';
const time='2026-11-18T19:00:00.000Z';
const run={id:44373404586,name:'CEREBRO Operativa verified evidence bridge LAB',
 workflow_id:422902482,head_branch:'cerebro/operativa-live-evidence-bridge-lab-20261118',
 event:'pull_request',path:'.github/workflows/cerebro-operativa-evidence-bridge-lab.yml@refs/pull/81/merge',
 head_repository:{full_name:'carlosjmunoz78/fenix-capital-inmo-map'},
 head_sha:'fa69e852aba63c3d5934b43b8e3f319da5dd6e8e',status:'completed',conclusion:'success',
 updated_at:'2026-11-18T18:52:00.000Z',
 html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44373404586'};
const job={id:135050000001,name:'evidence-bridge',status:'completed',conclusion:'success',
 completed_at:'2026-11-18T18:51:30.000Z',steps:[
 {name:'Run node --experimental-strip-types --test cerebro/universal/v0/agent-evidence-bridge-v1.test.mjs cerebro/universal/v0/agent-receipt-attestor-v1.test.mjs',status:'completed',conclusion:'success'},
 {name:'Run npm run build',status:'completed',conclusion:'success'}]};
test('GitHub provider job readback attests exact ENG-QA historical execution, not autonomous activity',()=>{
 const evidence=attestGithubQaRunV1({run,jobs:[job],now:time});assert(evidence);
 assert.equal(evidence.autonomy_claim,false);
 const p=projectAgentEvidenceV1({roster:buildCerebroAgentDirectoryV0(),company_id:'fenix',
  observed_at:time,authorized_sources:['GITHUB_ACTIONS'],receipts:[evidence]});
 assert.equal(p.runtime_verified_profiles,1);
 assert.equal(p.active_recent_profiles,0);
 const qa=p.profiles.find(x=>x.id==='ENG-QA');
 assert(qa);assert.equal(qa.last_event,'SUCCEEDED');
 const health=superviseAgentsV1({projection:p,observed_at:time});
 assert.equal(health.summary.executed_not_running,1);
 assert.equal(health.summary.excellence_verified,0);
});
test('GitHub source mismatch, wrong workflow, failed step or old run cannot accredit',()=>{
 for(const candidate of [
  {run:{...run,workflow_id:33},jobs:[job]},
  {run:{...run,head_branch:'main'},jobs:[job]},
  {run:{...run,head_repository:{full_name:'attacker/repo'}},jobs:[job]},
  {run:{...run,event:'workflow_dispatch'},jobs:[job]},
  {run:{...run,conclusion:'failure'},jobs:[job]},
  {run,jobs:[{...job,steps:[{...job.steps[0],conclusion:'failure'},job.steps[1]]}]},
  {run:{...run,updated_at:'2026-11-15T12:00:00Z'},jobs:[job]},
  {run,jobs:[{...job,name:'deployment'}]}
 ])assert.equal(attestGithubQaRunV1({...candidate,now:time}),null);
});
test('JSON-cloned forged GitHub receipt lacks same-process provider attestation',()=>{
 const original=attestGithubQaRunV1({run,jobs:[job],now:time});assert(original);
 const forged=JSON.parse(JSON.stringify(original));
 forged.agent_role_id='ENG-ARCHITECT';
 const p=projectAgentEvidenceV1({roster:buildCerebroAgentDirectoryV0(),company_id:'fenix',
  observed_at:time,authorized_sources:['GITHUB_ACTIONS'],receipts:[forged]});
 assert.equal(p.runtime_verified_profiles,0);
 assert.equal(p.rejected_receipts.untrusted,1);
});
