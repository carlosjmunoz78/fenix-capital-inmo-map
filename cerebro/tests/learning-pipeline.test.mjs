import test from "node:test";
import assert from "node:assert/strict";
import {normalizeEvent,observeOutcome,createEvidence,proposeCandidate,dedupeByKey} from "../runtime/learning-pipeline.mjs";

const event={event_id:"evt-1",company_id:"fenix-capital",engine_id:"LRN-001",environment:"LAB",version:"0.1",occurred_at:"2026-09-19T00:00:00Z",source_type:"human_correction",payload:{x:1},evidence_refs:["ref:a"]};

test("normalization is deterministic and multiempresa",()=>{
 const a=normalizeEvent(event), b=normalizeEvent({...event});
 assert.equal(a.dedupe_key,b.dedupe_key);
 assert.equal(a.company_id,"fenix-capital");
});

test("outcome preserves expectation vs reality",()=>{
 const o=observeOutcome({event,expected:10,actual:7,observed_at:"2026-09-19T01:00:00Z"});
 assert.equal(o.delta,-3);
 assert.equal(o.event_id,"evt-1");
});

test("evidence requires provenance refs",()=>{
 const o=observeOutcome({event,expected:"A",actual:"B",observed_at:"2026-09-19T01:00:00Z"});
 assert.throws(()=>createEvidence({outcome:o,refs:[],confidence:0.8}));
 const ev=createEvidence({outcome:o,refs:["ref:a"],confidence:0.8});
 assert.equal(ev.provenance_locked,true);
});

test("candidate does not promote correlation as causality",()=>{
 const o=observeOutcome({event,expected:"A",actual:"B",observed_at:"2026-09-19T01:00:00Z"});
 const ev=createEvidence({outcome:o,refs:["ref:a"],confidence:0.8});
 assert.throws(()=>proposeCandidate({event,outcome:o,evidence:ev,hypothesis:"x causes y",causal_claim:true}));
 const c=proposeCandidate({event,outcome:o,evidence:ev,hypothesis:"x may predict y"});
 assert.equal(c.state,"CANDIDATE");
});

test("dedupe removes repeated normalized events",()=>{
 const a=normalizeEvent(event);
 const list=dedupeByKey([a,a]);
 assert.equal(list.length,1);
});
