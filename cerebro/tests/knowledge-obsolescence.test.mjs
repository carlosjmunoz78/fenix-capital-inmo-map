import test from "node:test";
import assert from "node:assert/strict";
import {assessKnowledge,historicalTransition} from "../runtime/knowledge-obsolescence.mjs";
test("TTL marks stale and decays confidence without deleting",()=>{const r=assessKnowledge({confidence:.9,age_ms:11,ttl_ms:10});assert.equal(r.state,"STALE");assert.equal(r.delete_original,false);assert.equal(r.history_preserved,true);});
test("drift and contradictions make knowledge uncertain",()=>{const r=assessKnowledge({confidence:.9,age_ms:1,ttl_ms:10,drift:true,contradictions:2});assert.equal(r.state,"UNCERTAIN");assert.ok(r.confidence<.9);});
test("validated replacement supersedes rather than erases",()=>{const r=assessKnowledge({confidence:.9,age_ms:1,ttl_ms:10,replacement_ref:"rule-v2"});assert.equal(r.state,"SUPERSEDED");assert.equal(r.replacement_ref,"rule-v2");});
test("state transition requires evidence and appends history",()=>{assert.throws(()=>historicalTransition({prior_state:"CURRENT",next_state:"STALE"}));assert.equal(historicalTransition({prior_state:"CURRENT",next_state:"STALE",evidence_ref:"e1"}).append_history,true);});
