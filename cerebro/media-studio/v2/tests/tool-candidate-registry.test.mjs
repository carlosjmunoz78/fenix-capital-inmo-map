import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const reg=JSON.parse(fs.readFileSync(path.resolve(here,'../registry/tool-model-candidates.json'),'utf8'));
const allowedRouteClasses=new Set(['deterministic','oss_local','contracted_existing','free_tier','self_hosted','cheap_external','paid_burst_authorized']);

test('tool registry contains evidence-backed candidates only',()=>{
  assert.ok(reg.candidates.length>=2);
  for(const c of reg.candidates){
    assert.ok(c.id);
    assert.ok(c.name);
    assert.ok(Array.isArray(c.capabilities)&&c.capabilities.length>0);
    assert.ok(Array.isArray(c.evidence_refs)&&c.evidence_refs.length>0);
    assert.ok(allowedRouteClasses.has(c.route_class));
  }
});

test('availability may never be confused with PROD operation',()=>{
  for(const c of reg.candidates){
    if(c.prod_binding_status==='OPERATIONAL'){
      assert.equal(c.tested_in_ums_prod,true);
      assert.equal(c.license_status,'PASS');
      assert.equal(c.security_status,'PASS');
      assert.notEqual(c.cost_status,'UNKNOWN_NO_SILENT_SPEND');
    }
  }
});

test('real identity use defaults closed',()=>{
  for(const c of reg.candidates) if(c.tested_in_ums_prod!==true) assert.equal(c.real_identity_allowed,false);
});

test('unknown cost cannot be silently treated as zero cost',()=>{
  for(const c of reg.candidates.filter(x=>x.cost_status==='UNKNOWN_NO_SILENT_SPEND')) assert.notEqual(c.prod_binding_status,'OPERATIONAL');
});
