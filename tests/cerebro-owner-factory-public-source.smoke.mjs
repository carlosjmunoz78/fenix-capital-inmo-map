/**
 * Real external source smoke for the existing PUBLIC FACT-001 GitHub repo.
 * No credentials, no writes, no mutation, no generated assets.
 */
import assert from "node:assert/strict";
import {readFactoryGitOpsCatalog} from "../cerebro/ops/gateway-v36-followups/owner_factory_gitops.ts";

const result=await readFactoryGitOpsCatalog({actor:"CARLOS-ADMIN",useCache:false});
assert.equal(result.status,"OK","FACT GitOps public sources must be reachable and parseable");
assert.equal(result.source_status,"PUBLIC_GITHUB_LIVE");
assert.ok(result.catalog.some(x=>x.engine_id==="FACT-001"),"FACT-001 appears in the existing source catalog");
assert.ok(result.scaffolded.some(x=>x.engine_id==="SEO-001"),"Existing SEO-001 engine directory appears");
assert.ok(result.scaffolded.some(x=>x.engine_id==="FACT-OIDC-CANARY-20261112"),"FACT signed-enrollment canary directory appears");
assert.ok(result.production_authorized===false);
assert.ok(result.scaffolded.every(x=>x.execution_enabled===false));
console.log(JSON.stringify({
  status:"LIVE_SOURCE_VERIFIED",
  repository:result.repository,
  branch:result.branch,
  catalog_count:result.catalog.length,
  scaffold_count:result.scaffolded.length,
  observed_at:result.observed_at,
  production_authorized:false
}));
