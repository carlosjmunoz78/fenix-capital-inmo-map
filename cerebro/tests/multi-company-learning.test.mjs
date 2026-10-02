import test from "node:test";
import assert from "node:assert/strict";
import {scopedKnowledge,transferCandidate,tenantIsolation} from "../runtime/multi-company-learning.mjs";
const src=()=>scopedKnowledge({company_id:"a",engine_id:"LRN-001",rule_id:"r1",scope:"GLOBAL_CANDIDATE",context_signature:"mortgage-spain",evidence_refs:["e1"]});
test("tenant records deny cross-company access",()=>{assert.equal(tenantIsolation({request_company_id:"a",record_company_id:"a"}).allowed,true);assert.equal(tenantIsolation({request_company_id:"b",record_company_id:"a"}).allowed,false);});
test("secrets never transfer",()=>assert.equal(transferCandidate({source:src(),target_company_id:"b",target_context_signature:"mortgage-spain",source_contains_secrets:true,context_compatible:true}).reason,"SECRET_ISOLATION"));
test("context mismatch blocks transfer",()=>assert.equal(transferCandidate({source:src(),target_company_id:"b",target_context_signature:"other",context_compatible:false}).reason,"CONTEXT_MISMATCH"));
test("transfer is candidate only and needs local validation",()=>{const t=transferCandidate({source:src(),target_company_id:"b",target_context_signature:"mortgage-spain",context_compatible:true});assert.equal(t.allowed,true);assert.equal(t.state,"TRANSFER_CANDIDATE");assert.equal(t.requires_local_validation,true);assert.equal(t.may_copy_raw_company_data,false);});
