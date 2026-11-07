import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildSeoSkillpackRoleContracts,generateSeoRoleScaffolds} from '../../../factory/seo-skillpack-factory-v2.mjs';
test('FACT-001 adapter emits exactly 141 scoped complete subagent contracts',()=>{
 const v=buildSeoSkillpackRoleContracts();assert.equal(v.length,141);
 for(const {contract:c} of v){
  assert.equal(c.company_id,'fenix');assert.equal(c.engine_id,'SEO-001');
  assert.equal(c.environment,'LAB');assert.equal(c.iam_principal_id,null);
  assert.equal(c.api.live_endpoint,null);assert.equal(c.release.prod_allowed,false);
  assert.equal(c.costs.paid_ai_granted,false);assert.equal(c.costs.additional_eur,0);
  assert.equal(c.config.default_mode,'READ_ONLY_PLAN');
  assert.ok(c.permissions.deny.includes('IAM_ADMIN'));
  assert.ok(c.training.curriculum.exercise.length>20);
  for(const field of ['data_contracts','permissions','policy','events','jobs','api','tests','evaluation','observability','costs','backup','rollback','rebuild','training','release'])assert.ok(c[field]);
 }
});
test('generated pack is idempotent, rebuildable and never overwrites altered contract',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fact-seo-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const first=generateSeoRoleScaffolds(dir),again=generateSeoRoleScaffolds(dir);
 assert.deepEqual(first,again);assert.equal(first.role_templates,141);assert.equal(first.files,142);
 const index=JSON.parse(fs.readFileSync(path.join(dir,'index.json')));
 assert.equal(index.live_iam_principals,0);assert.equal(index.prod_grants,0);
 const target=path.join(dir,index.files[0].path);
 fs.appendFileSync(target,'tampered');
 assert.throws(()=>generateSeoRoleScaffolds(dir),/EXISTING_CONTRACT_CONFLICT/);
});
