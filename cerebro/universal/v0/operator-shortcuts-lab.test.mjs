import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planOperatorInstructionLab} from './operator-instruction-lab.mjs';

const ui=readFileSync(new URL('../../../src/CerebroOperatorChatLab.tsx',import.meta.url),'utf8');
const block=ui.match(/const READ_SHORTCUTS=\[([\s\S]*?)\] as const;/)?.[1];
test('owner one-tap suggestions are static, read-only, and use the same authenticated planner',()=>{
 assert.ok(block,'READ_SHORTCUTS must be defined');
 const cmds=[...block.matchAll(/command:'([^']+)'/g)].map(m=>m[1]);
 assert.equal(cmds.length,5);
 assert.equal(new Set(cmds).size,cmds.length);
 const intents=new Set(['REGISTRY_STATUS','JOB001_STATUS','ENGINE_STATUS','FACT_LATEST','STAGING_STATUS']);
 for(const cmd of cmds){
  const plan=planOperatorInstructionLab(cmd);
  assert.equal(plan.status,'PLAN_READY',cmd);
  assert.equal(plan.requires_confirmation,false,cmd);
  assert.equal(plan.production_allowed,false,cmd);
  assert.equal(plan.external_destination_allowed,false,cmd);
  assert.equal(plan.staging_allowed,false,cmd);
  assert.equal(plan.additional_cost_eur,0,cmd);
  assert.ok(intents.has(plan.intent),cmd+' is not safe read-only');
 }
 assert.match(ui,/onClick=\{\(\)=>\{void dispatchInstruction\(item\.command\)\}\}/);
 assert.match(ui,/const plan=await planOwnerInstructionLab\(text\)/);
 assert.match(ui,/if\(busyRef\.current\|\|pending\)return/);
 assert.match(ui,/if\(plan\.requiresConfirmation\)\{/);
 assert.ok(!block.includes('certificar FACT-001'));
 assert.ok(!block.includes('simular FACT-001'));
});
