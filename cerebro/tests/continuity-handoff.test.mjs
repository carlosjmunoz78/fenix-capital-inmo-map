import test from "node:test";
import assert from "node:assert/strict";
import {buildContinuityState,validatePreventiveHandoff,minimalResumePlan} from "../runtime/continuity-handoff.mjs";
const state=buildContinuityState({repository:"r",branch:"b",head:"h",pr:1,runs:[{id:1,conclusion:"success"}],files:["a"],blocks:{M:{status:"GREEN"}},next_block:"M",live_verification_targets:["PR/HEAD/CI"]});
test("handoff state requires live git and CI evidence",()=>{assert.equal(state.generated_from_live_state,true);assert.throws(()=>buildContinuityState({repository:"r",branch:"b",head:"h",pr:1,runs:[],blocks:{M:{}},next_block:"M"}));});
test("preventive handoff requires four artifacts",()=>{const good={continuity_master_docx:"a",exact_prompt_txt:"b",continuity_state_json:"c",handoff_readme_md:"d"};assert.equal(validatePreventiveHandoff({state,artifacts:good}).ok,true);assert.equal(validatePreventiveHandoff({state,artifacts:{}}).ok,false);});
test("high context pressure requests regeneration",()=>{const good={continuity_master_docx:"a",exact_prompt_txt:"b",continuity_state_json:"c",handoff_readme_md:"d"};assert.equal(validatePreventiveHandoff({state,artifacts:good,context_pressure:"HIGH"}).should_regenerate,true);});
test("same HEAD resumes next block without re-audit",()=>assert.equal(minimalResumePlan(state,"h").action,"RESUME_NEXT_BLOCK"));
test("changed HEAD verifies only live delta",()=>assert.equal(minimalResumePlan(state,"new").action,"VERIFY_NEW_HEAD_ONLY"));
