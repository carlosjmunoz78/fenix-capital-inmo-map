import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildSeoOrg,saveSeoOrg} from '../factory/seo-org-v0.mjs';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const source=()=>({
 organization:load('seo-enterprise/v2/organization.manifest.json'),
 coverage:load('seo-enterprise/v2/competency-coverage-and-board-v0.json'),
 policy:load('governance/universal-excellence-owner-authority.v0.json'),
 seed:load('registry/engine-registry.seed.json')
});
const dir=t=>{const r=fs.mkdtempSync(path.join(os.tmpdir(),'fact-seo-org-'));t.after(()=>fs.rmSync(r,{recursive:true,force:true}));return r;};
test('FACT-001 overlay generates eight families and 32 departments with 74 deterministic safe documents',()=>{
 const a=buildSeoOrg(source());const b=buildSeoOrg(source());
 assert.equal(a.size,74);
 assert.deepEqual([...a.entries()],[...b.entries()]);
 const idx=JSON.parse(a.get('index.json'));
 assert.equal(idx.families,8);assert.equal(idx.departments,32);
 assert.equal(idx.active_agents,0);assert.equal(idx.certified_departments,0);
 assert.equal(idx.prod_authorized,false);
 assert.equal(idx.file_count,a.size);
 assert.equal(idx.files.length,73);
 for(let i=1;i<=8;i++){
  const key='families/SEO-PF'+String(i).padStart(2,'0')+'.json';
  const fam=JSON.parse(a.get(key));
  assert.equal(fam.departments.length,4);
  assert.equal(fam.role_templates.length,2);
  assert.equal(fam.verified_directors,0);
 }
 for(let i=1;i<=32;i++){
  const id='SEO-D'+String(i).padStart(2,'0');
  const d=JSON.parse(a.get('departments/'+id+'/manifest.json'));
  const c=JSON.parse(a.get('departments/'+id+'/contract.json'));
  assert.equal(d.role_templates.length,4);
  assert.equal(d.real_workers,0);
  assert.equal(c.default_permissions,'DENY');
  assert.deepEqual(c.granted_scopes,[]);
  assert.equal(c.production_ready,false);
  assert.equal(c.agent_iam_verified,false);
  assert.equal(c.excellence_minimum_score,90);
  assert.equal(c.qa_and_tribunal_independent,true);
 }
});
test('multi-company scoping changes all contexts but grants no cross-company permissions',()=>{
 const a=buildSeoOrg({...source(),company_id:'fenix'});
 const b=buildSeoOrg({...source(),company_id:'ejemplo'});
 assert.notEqual(a.get('index.json'),b.get('index.json'));
 for(const [k,v] of b){
  const doc=JSON.parse(v);
  assert.equal(doc.company_id,'ejemplo',k);
  assert.equal(doc.prod_authorized,false,k);
 }
});
test('non-destructive generation preserves files, repeats idempotently and blocks conflicts',t=>{
 const output=dir(t),plan=buildSeoOrg(source());
 const external=path.join(output,'existing.txt');
 fs.writeFileSync(external,'KEEP_UNCHANGED');
 const first=saveSeoOrg(output,plan),second=saveSeoOrg(output,plan);
 assert.equal(first.created,74);
 assert.equal(second.created,0);
 assert.equal(second.existing,74);
 assert.equal(fs.readFileSync(external,'utf8'),'KEEP_UNCHANGED');
 const conflicts='departments/SEO-D12/contract.json';
 const filename=path.join(output,conflicts);
 fs.writeFileSync(filename,'modified externally');
 assert.throws(()=>saveSeoOrg(output,plan),/ORG_CONFLICT/);
 assert.equal(fs.readFileSync(filename,'utf8'),'modified externally');
});
test('invalid counts, membership, role policy, tenant, authority and readiness fail closed',()=>{
 const s=source();
 assert.throws(()=>buildSeoOrg({...s,company_id:'../bad'}),/ORG_TENANT/);
 assert.throws(()=>buildSeoOrg({...s,organization:{...s.organization,departments:s.organization.departments.slice(1)}}),/ORG_SOURCE/);
 assert.throws(()=>buildSeoOrg({...s,policy:{...s.policy,boundaries:{...s.policy.boundaries,additional_subscriptions_eur:2}}}),/ORG_CONTRACT/);
 assert.throws(()=>buildSeoOrg({...s,coverage:{...s.coverage,progress:{...s.coverage.progress,fully_ready:32}}}),/ORG_SOURCE/);
 const o=structuredClone(s.organization);
 o.professional_families[0].department_ids[0]='SEO-D99';
 assert.throws(()=>buildSeoOrg({...s,organization:o}),/ORG_DEPT_INVALID/);
});
test('factory canonical 177-engine validate remains untouched; CLI validates and generates safely',t=>{
 const out=dir(t),root=path.resolve(new URL('..',import.meta.url).pathname);
 const factory=JSON.parse(execFileSync(process.execPath,[path.join(root,'factory.mjs'),'validate'],{encoding:'utf8'}));
 assert.equal(factory.engines,177);assert.equal(factory.safe_scaffold,true);
 const cli=path.join(root,'factory','seo-org-cli-v0.mjs');
 const validated=JSON.parse(execFileSync(process.execPath,[cli,'validate'],{encoding:'utf8'}));
 assert.equal(validated.files,74);
 const generated=JSON.parse(execFileSync(process.execPath,[cli,'generate','--out',out],{encoding:'utf8'}));
 assert.equal(generated.created,74);
 const repeated=JSON.parse(execFileSync(process.execPath,[cli,'generate','--out',out],{encoding:'utf8'}));
 assert.equal(repeated.created,0);
});
