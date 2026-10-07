import test from "node:test";
import assert from "node:assert/strict";
import {detectRepeatedFailurePattern,proposeFactoryVnext,ImprovementSupervisor} from "../runtime/factory-supervisor-improvement.mjs";

test("Factory improvement needs repeated cross-engine evidence",()=>{
 assert.throws(()=>detectRepeatedFailurePattern({error_class:"missing-test",engine_ids:["A"],occurrences:1,evidence_refs:["e1"]}));
 const p=detectRepeatedFailurePattern({error_class:"missing-test",engine_ids:["A","B"],occurrences:4,evidence_refs:["e1","e2"]});
 assert.equal(p.state,"VALIDATED_PATTERN");
});
test("Vnext does not mutate existing engines automatically",()=>{
 const p=detectRepeatedFailurePattern({error_class:"missing-test",engine_ids:["A","B"],occurrences:4,evidence_refs:["e1","e2"]});
 const c=proposeFactoryVnext({pattern:p,current_scaffold_version:"1",candidate_scaffold_version:"2",new_contract_test:"tenant-bound",fixture_engine_ids:["A","B"]});
 assert.equal(c.mutate_existing_engines,false);
});
test("Supervisor is idempotent, bounded and anti-double-promotion",()=>{
 const s=new ImprovementSupervisor();
 assert.equal(s.open({candidate_id:"c1",evidence_ref:"e1"}).accepted,true);
 assert.equal(s.open({candidate_id:"c1",evidence_ref:"e1"}).duplicate,true);
 s.attempt("c1"); s.markJudged("c1",{pass:true,rollback_ref:"rb"});
 assert.equal(s.markPromoted("c1").duplicate_promotion,false);
 assert.equal(s.markPromoted("c1").duplicate_promotion,true);
});
test("Supervisor refuses promotion without rollback",()=>{
 const s=new ImprovementSupervisor(); s.open({candidate_id:"c2",evidence_ref:"e2"});
 assert.throws(()=>s.markJudged("c2",{pass:true}));
});
