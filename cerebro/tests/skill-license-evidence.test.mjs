import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLicenseFamily,
  rankLicensePaths,
  resolveLicenseEvidence
} from '../skills/skill-license-evidence.mjs';

test('rankLicensePaths prefers skill-local and ancestor license evidence',()=>{
  const tree=[
    {type:'blob',path:'skills/x/license.txt'},
    {type:'blob',path:'LICENSE'},
    {type:'blob',path:'docs/NOTICE'}
  ];
  const ranked=rankLicensePaths(tree,'skills/x/SKILL.md');
  assert.equal(ranked[0].path,'skills/x/license.txt');
  assert.ok(ranked.some((x)=>x.path==='LICENSE'));
});

test('detectLicenseFamily recognizes common families without deciding legal compatibility',()=>{
  assert.equal(detectLicenseFamily('MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy'),'MIT');
  assert.equal(detectLicenseFamily('Apache License\nVersion 2.0, January 2004'),'Apache-2.0');
  assert.equal(detectLicenseFamily('something custom'),'UNKNOWN');
});

test('resolveLicenseEvidence fetches exact license text at exact commit and hashes it',async()=>{
  const discovery={results:[{candidates:[{candidate_id:'c1',source_ref:'https://directory/x'}]}]};
  const upstreams={results:[{status:'RESOLVED',full_name:'acme/skill',head_commit:'commit1',head_tree_sha:'tree1',license_spdx:'MIT',license_name:'MIT License',discovery_candidate_ids:['c1']}]};
  const manifests={results:[{candidate_id:'c1',status:'MANIFEST_RESOLVED_STATIC_ONLY',manifest_path:'skills/x/SKILL.md'}]};
  const license='MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy';
  const fetchImpl=async(url)=>{
    if(url.includes('/git/trees/tree1')) return new Response(JSON.stringify({truncated:false,tree:[{type:'blob',path:'skills/x/license.txt',sha:'l',size:license.length},{type:'blob',path:'LICENSE',sha:'r',size:license.length}]}),{status:200});
    if(url.includes('/contents/skills/x/license.txt')||url.includes('/contents/LICENSE')) return new Response(JSON.stringify({encoding:'base64',content:Buffer.from(license).toString('base64')}),{status:200});
    return new Response('{}',{status:404});
  };
  const report=await resolveLicenseEvidence(discovery,upstreams,manifests,{token:'test',fetchImpl,observedAt:'2026-10-06T00:00:00Z'});
  assert.equal(report.code_executed,false);
  assert.equal(report.legal_compatibility,'UNASSESSED');
  assert.equal(report.status_counts.EXACT_LICENSE_FILE_EVIDENCE,1);
  assert.equal(report.results[0].detected_families[0],'MIT');
  assert.equal(report.results[0].metadata_matches_detected,true);
  assert.match(report.results[0].exact_evidence[0].sha256,/^[a-f0-9]{64}$/);
});

test('missing manifest stays unresolved and never invents compatibility',async()=>{
  const report=await resolveLicenseEvidence({results:[{candidates:[{candidate_id:'c2'}]}]},{results:[]},{results:[]},{fetchImpl:async()=>{throw new Error('must not fetch')}});
  assert.equal(report.results[0].status,'LICENSE_EVIDENCE_NOT_RESOLVABLE');
  assert.equal(report.results[0].legal_compatibility,'UNASSESSED');
  assert.equal(report.results[0].executed,false);
});
