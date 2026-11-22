import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCOPE,PROJECTS,WRITE_GATES,READ_OPERATIONS,PLANNED_MUTATIONS,assertOrder,assertMutationReady} from '../policy.mjs';
const base={...SCOPE,provider:'supabase',project_id:PROJECTS.map,operation:'supabase.project.read_inventory',request_id:'FACT001-SUPABASE-20261111-READ-001',idempotency_key:'fact001-supabase-20261111-read-001',max_cost_eur:0};
test('read-only scoped inventory is permitted for exact configured projects',()=>{
 assert.equal(assertOrder(base).status,'READ_ONLY_ALLOWED');
 assert.equal(assertOrder({...base,project_id:PROJECTS.prod,operation:READ_OPERATIONS[1]}).status,'READ_ONLY_ALLOWED');
});
test('all mutation operations denied fail-closed regardless of submitted values',()=>{
 assert.equal(PLANNED_MUTATIONS.length,4);
 for(const operation of PLANNED_MUTATIONS)assert.throws(()=>assertOrder({...base,operation}),/HIGH_RISK/);
 assert.throws(assertMutationReady,/HIGH_RISK/);
 assert.equal(WRITE_GATES.physical_backup_verified,false);
 assert.equal(WRITE_GATES.high_risk_security_findings_reviewed,false);
});
test('reject PROD, unrelated tenant, arbitrary paths, paid operations and extra fields',()=>{
 for(const diff of [{environment:'PROD'},{company_id:'other'},{engine_id:'OTHER'},{project_id:'unknown'},{max_cost_eur:1},
   {operation:'supabase.project.delete'},{url:'https://api.supabase.com'},{api_key:'secret'}])
  assert.throws(()=>assertOrder({...base,...diff}));
});
test('no live SQL/Edge mutations implemented',()=>{
 const src=readFileSync(new URL('../policy.mjs',import.meta.url),'utf8');
 assert.ok(!src.includes('fetch('));
 assert.ok(!src.includes('console.log('));
 assert.ok(!src.includes('DELETE FROM'));
 assert.ok(!src.includes('ALTER TABLE'));
 assert.ok(!src.includes('DROP TABLE'));
});
