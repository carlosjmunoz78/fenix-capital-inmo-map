import test from "node:test";
import assert from "node:assert/strict";
import {cycleTelemetry,loopGuard,authorizeExternalChange} from "../runtime/rsi-observability-security.mjs";
test("telemetry emits correlation cost and learning yield",()=>{const t=cycleTelemetry({company_id:"f",engine_id:"SUP-001",cycle_id:"c",started_at:"2026-09-19T00:00:00Z",ended_at:"2026-09-19T00:00:01Z",cost_eur:0,candidates:4,useful_improvements:1,attempts:1});assert.equal(t.duration_ms,1000);assert.equal(t.learning_yield,.25);assert.equal(t.cost_per_cycle,0);});
test("runaway loops and spend fail closed",()=>{assert.equal(loopGuard({attempts:4,max_attempts:3}).allowed,false);const m=loopGuard({attempts:1,cost_eur:.01,budget_eur:0});assert.equal(m.human_required,"MONEY_LIMIT");});
test("security incident maps HUMAN_REQUIRED",()=>{const x=loopGuard({attempts:1,security_incident:true});assert.equal(x.allowed,false);assert.equal(x.human_required,"SECURITY_INCIDENT");});
test("kill switch blocks immediately",()=>assert.equal(loopGuard({attempts:0,kill_switch:true}).allowed,false));
test("external change requires audit rollback policy and security",()=>{assert.equal(authorizeExternalChange({auditable:true,reversible:true,policy_pass:true,security_pass:true}).allowed,true);assert.equal(authorizeExternalChange({auditable:true,reversible:false,policy_pass:true,security_pass:true}).allowed,false);});
