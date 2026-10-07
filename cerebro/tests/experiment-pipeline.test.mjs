import test from "node:test";
import assert from "node:assert/strict";
import {defineExperiment,registerReplay,recordArmResult,compareArms} from "../runtime/experiment-pipeline.mjs";

test("experiment requires predefined metrics and distinct OLD vs NEW",()=>{
 assert.throws(()=>defineExperiment({company_id:"f",engine_id:"SIM-001",hypothesis:"h",baseline_version:"1",candidate_version:"1",metrics:["accuracy"]}));
 assert.throws(()=>defineExperiment({company_id:"f",engine_id:"SIM-001",hypothesis:"h",baseline_version:"1",candidate_version:"2",metrics:[]}));
});
test("experiments cannot write PROD",()=>{
 assert.throws(()=>defineExperiment({company_id:"f",engine_id:"SIM-001",hypothesis:"h",baseline_version:"1",candidate_version:"2",metrics:["accuracy"],allow_prod_writes:true}));
});
test("replay is deterministic and deduplicated",()=>{
 const e=defineExperiment({company_id:"f",engine_id:"SIM-001",hypothesis:"h",baseline_version:"1",candidate_version:"2",metrics:["accuracy"]});
 const r=registerReplay({experiment:e,case_ids:["b","a","a"]});
 assert.equal(r.case_ids.length,2); assert.equal(r.writes_prod,false);
});
test("OLD vs NEW comparison uses predefined numeric metric",()=>{
 const old=recordArmResult({experiment_id:"e",arm:"OLD",metrics:{accuracy:.7},evidence_refs:["o"]});
 const neu=recordArmResult({experiment_id:"e",arm:"NEW",metrics:{accuracy:.8},evidence_refs:["n"]});
 const c=compareArms({old_result:old,new_result:neu,metric:"accuracy"});
 assert.equal(c.better,true); assert.equal(c.delta,.10000000000000009);
});
