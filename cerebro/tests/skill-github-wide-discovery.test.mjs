import test from 'node:test';
import assert from 'node:assert/strict';
import {candidatesFromRepoTree,isSkillManifestPath,runGithubWideDiscovery} from '../skills/skill-github-wide-discovery.mjs';

function response(value,status=200){return {ok:status>=200&&status<300,status,async text(){return JSON.stringify(value);}};}

test('recognizes skill manifests but not arbitrary markdown',()=>{
  assert.equal(isSkillManifestPath('skills/foo/SKILL.md'),true);
  assert.equal(isSkillManifestPath('.claude/skills/bar/SKILL.md'),true);
  assert.equal(isSkillManifestPath('docs/SKILL.md'),false);
  assert.equal(isSkillManifestPath('skills/foo/README.md'),false);
});

test('tree candidates use real skill directory URL so downstream slug resolution stays exact',()=>{
  const repo={full_name:'acme/skills',html_url:'https://github.com/acme/skills',default_branch:'main'};
  const c=candidatesFromRepoTree(repo,{tree:[{type:'blob',path:'skills/browser-qa/SKILL.md'},{type:'blob',path:'README.md'}]});
  assert.equal(c.length,1);
  assert.equal(c[0].source_ref,'https://github.com/acme/skills/tree/main/skills/browser-qa');
  assert.equal(c[0].manifest_path_hint,'skills/browser-qa/SKILL.md');
  assert.equal(c[0].primary_upstream_hint,'https://github.com/acme/skills');
  assert.equal(c[0].executed,false);
});

test('wide discovery stays read-only, bounded and excludes forks/current repo',async()=>{
  const calls=[];
  const fetchImpl=async(url)=>{
    calls.push(url);
    if(url.includes('/search/repositories')) return response({items:[
      {full_name:'acme/skill-pack',html_url:'https://github.com/acme/skill-pack',default_branch:'main',archived:false,disabled:false,fork:false},
      {full_name:'someone/fork',html_url:'https://github.com/someone/fork',default_branch:'main',archived:false,disabled:false,fork:true},
      {full_name:'carlosjmunoz78/fenix-capital-inmo-map',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map',default_branch:'main',archived:false,disabled:false,fork:false}
    ]});
    if(url.includes('/repos/acme/skill-pack/git/trees/main')) return response({truncated:false,tree:[
      {type:'blob',path:'skills/a/SKILL.md'},{type:'blob',path:'skills/b/SKILL.md'},{type:'blob',path:'docs/SKILL.md'}
    ]});
    throw new Error(`unexpected ${url}`);
  };
  const r=await runGithubWideDiscovery({queries:['q1'],token:'test-token',fetchImpl,maxRepos:2,maxCandidates:10,observedAt:'2026-10-08T00:00:00Z'});
  assert.equal(r.execution_mode,'GITHUB_WIDE_READ_ONLY_DISCOVERY');
  assert.equal(r.candidates_discovered,2);
  assert.equal(r.results[0].candidates.every((c)=>c.executed===false),true);
  assert.equal(r.external_skill_code_executed,false);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.additional_cost_eur,0);
  assert.equal(calls.some((x)=>x.includes('someone/fork')),false);
});

test('missing token fails closed without network',async()=>{
  const r=await runGithubWideDiscovery({token:'',fetchImpl:async()=>{throw new Error('must not call');}});
  assert.equal(r.sources_ok,0);
  assert.equal(r.candidates_discovered,0);
  assert.equal(r.results[0].status,'SOURCE_FETCH_FAILED');
});
