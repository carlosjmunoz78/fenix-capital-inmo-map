import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runSeoKnowledgeOrientation} from '../runtime/seo-workforce-orientation-v2.mjs';
import {assembleSeoV2ControlPlane,verifySeoV2Assembly} from '../runtime/seo-v2-control-plane-assembly-v1.mjs';
const tmp=t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo-control-v2-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 return path.join(root,'existing-job001.v8');
};
test('32 departments, 141 distinct specialists and 12 safe routes assemble from existing JOB-001 receipts',t=>{
 const orientation_journal=tmp(t);
 const run=runSeoKnowledgeOrientation({file_path:orientation_journal});
 assert.equal(run.passed_contract_orientation,true);
 const ready=assembleSeoV2ControlPlane({orientation_journal});
 assert.equal(ready.status,'SHARED_CONTROL_PLANE_ASSEMBLED_READONLY_LAB_NOT_AUTONOMOUS');
 assert.equal(ready.platform.organization_families,8);
 assert.equal(ready.platform.departments,32);
 assert.equal(ready.platform.specialists,141);
 assert.equal(ready.platform.all_seo_role_templates,191);
 assert.equal(ready.platform.owner_excellence_governance_roles,191);
 assert.equal(ready.platform.owner_excellence_governance_policy_id,'SEO_V2_OWNER_EXCELLENCE_ALL_191_ROLES_V1');
 assert.equal(ready.controls.universal_owner_business_authority,'AUTHENTICATED_OWNER_ONLY');
 assert.equal(ready.controls.auto_promotion,false);
 assert.equal(ready.departments.every(x=>x.universal_owner_policy_id==='SEO_V2_OWNER_EXCELLENCE_ALL_191_ROLES_V1'),true);
 assert.equal(ready.platform.route_types,12);
 assert.equal(ready.platform.existing_orientation_job_receipts,141);
 assert.equal(ready.platform.one_shared_job_runtime,true);
 assert.equal(ready.platform.additional_servers,0);
 assert.equal(ready.platform.authenticated_individual_agent_principals,0);
 assert.equal(ready.platform.gateway_persistent_host_proven,false);
 assert.equal(ready.platform.certified_prod_departments,0);
 assert.equal(ready.corpus.documents,200);
 assert.equal(ready.corpus.media_images,629);
 assert.equal(ready.corpus.historical_staging_used,false);
 assert.equal(ready.can_write_prod,false);
 assert.equal(ready.can_publish,false);
 assert.equal(ready.controls.production_data_mutated,false);
 const all=ready.departments.flatMap(x=>x.specialist_role_ids);
 assert.equal(all.length,141);
 assert.equal(new Set(all).size,141);
 assert.equal(new Set(ready.departments.map(x=>x.department_id)).size,32);
 assert.equal(ready.departments.every(x=>x.qa_department==='SEO-D31'&&
  x.training_department==='SEO-D32'&&x.training_exam_passed===false&&
  x.release_authorized===false),true);
 assert.equal(ready.routes.every(x=>x.permitted_stage==='PLAN_ONLY'),true);
 assert.equal(verifySeoV2Assembly({orientation_journal,manifest:ready}).status,'ASSEMBLY_VERIFIED_READONLY');
 const second=assembleSeoV2ControlPlane({orientation_journal});
 assert.equal(second.assembly_sha256,ready.assembly_sha256);
});
test('missing JOB-001 journal and fabricated evidence are rejected fail closed',t=>{
 const orientation_journal=tmp(t);
 assert.throws(()=>assembleSeoV2ControlPlane({orientation_journal}),/SEO_V2_ASSEMBLY_JOB001_ORIENTATION_NOT_VERIFIED/);
 runSeoKnowledgeOrientation({file_path:orientation_journal});
 const valid=assembleSeoV2ControlPlane({orientation_journal});
 assert.throws(()=>verifySeoV2Assembly({orientation_journal,manifest:{...valid,platform:{...valid.platform,certified_prod_departments:32}}}),
  /SEO_V2_ASSEMBLY_MANIFEST_NOT_REPRODUCIBLE/);
 assert.throws(()=>verifySeoV2Assembly({orientation_journal,manifest:{...valid,can_publish:true}}),
  /SEO_V2_ASSEMBLY_MANIFEST_NOT_REPRODUCIBLE/);
 assert.throws(()=>assembleSeoV2ControlPlane({orientation_journal:''}),/SEO_V2_ASSEMBLY_JOURNAL_REQUIRED/);
});
