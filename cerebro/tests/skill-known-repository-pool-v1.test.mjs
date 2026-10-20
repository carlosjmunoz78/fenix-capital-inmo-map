import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverKnownRepositorySkillSources,buildKnownPoolEvent} from '../runtime/skill-known-repository-pool-v1.mjs';

function response(status,data){return {status,async json(){return data;}};}
function registry(repositories){return {state_type:'CEREBRO_SKILL_KNOWN_REPOSITORY_POOL_V1',environment:'PREPROD',repositories};}

test('discovers pinned skill descriptors from known repository trees without code search',async()=>{
  const shaA='a'.repeat(40);const shaB='b'.repeat(40);const calls=[];
  const fetch_impl=async(url)=>{const u=String(url);calls.push(u);
    if(u.endsWith('/repos/example/a'))return response(200,{private:false,archived:false,disabled:false,default_branch:'main'});
    if(u.endsWith('/repos/example/a/commits/main'))return response(200,{sha:shaA});
    if(u.includes(`/repos/example/a/git/trees/${shaA}`))return response(200,{truncated:false,tree:[
      {type:'blob',path:'skills/voice/SKILL.md'},{type:'blob',path:'skills/app/SKILL.md'},{type:'blob',path:'README.md'}
    ]});
    if(u.endsWith('/repos/example/b'))return response(200,{private:false,archived:false,disabled:false,default_branch:'trunk'});
    if(u.endsWith('/repos/example/b/commits/trunk'))return response(200,{sha:shaB});
    if(u.includes(`/repos/example/b/git/trees/${shaB}`))return response(200,{truncated:false,tree:[
      {type:'blob',path:'reporting/SKILL.md'},{type:'blob',path:'reporting/cerebro.skill.json'}
    ]});
    throw new Error(`unexpected url:${u}`);
  };
  const report=await discoverKnownRepositorySkillSources({fetch_impl,registry:registry([
    {repository:'example/a',roots:['skills'],priority:1},{repository:'example/b',roots:[''],priority:2}
  ]),max_sources:3,pool_page:1});
  assert.equal(report.status,'POOL_SOURCES_DISCOVERED');
  assert.equal(report.search_dependency,false);
  assert.equal(report.source_count,3);
  assert.equal(report.total_descriptors,3);
  assert.equal(calls.some((u)=>u.includes('/search/code')),false);
  assert.ok(report.sources.every((x)=>/\/tree\/[a-f0-9]{40}\//.test(x.github_url)));
  assert.deepEqual(new Set(report.sources.map((x)=>x.repository)),new Set(['example/a','example/b']));
  assert.equal(report.external_skill_code_execution,false);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.additional_cost_eur,0);
});

test('rotates the bounded pool window so later cycles do not repeat only the first candidates',async()=>{
  const sha='c'.repeat(40);
  const fetch_impl=async(url)=>{const u=String(url);
    if(u.endsWith('/repos/example/pool'))return response(200,{private:false,archived:false,disabled:false,default_branch:'main'});
    if(u.endsWith('/repos/example/pool/commits/main'))return response(200,{sha});
    if(u.includes(`/repos/example/pool/git/trees/${sha}`))return response(200,{truncated:false,tree:[0,1,2,3,4].map((i)=>({type:'blob',path:`skills/s${i}/SKILL.md`}))});
    throw new Error(`unexpected url:${u}`);
  };
  const config=registry([{repository:'example/pool',roots:['skills'],priority:1}]);
  const page1=await discoverKnownRepositorySkillSources({fetch_impl,registry:config,max_sources:2,pool_page:1});
  const page2=await discoverKnownRepositorySkillSources({fetch_impl,registry:config,max_sources:2,pool_page:2});
  assert.deepEqual(page1.sources.map((x)=>x.subpath),['skills/s0','skills/s1']);
  assert.deepEqual(page2.sources.map((x)=>x.subpath),['skills/s2','skills/s3']);
});

test('one unavailable repository does not block independent repositories',async()=>{
  const sha='d'.repeat(40);
  const fetch_impl=async(url)=>{const u=String(url);
    if(u.endsWith('/repos/example/down'))return response(503,{message:'down'});
    if(u.endsWith('/repos/example/good'))return response(200,{private:false,archived:false,disabled:false,default_branch:'main'});
    if(u.endsWith('/repos/example/good/commits/main'))return response(200,{sha});
    if(u.includes(`/repos/example/good/git/trees/${sha}`))return response(200,{truncated:false,tree:[{type:'blob',path:'skills/analytics/SKILL.md'}]});
    throw new Error(`unexpected url:${u}`);
  };
  const report=await discoverKnownRepositorySkillSources({fetch_impl,registry:registry([
    {repository:'example/down',roots:[''],priority:1},{repository:'example/good',roots:['skills'],priority:2}
  ]),max_sources:4,pool_page:1});
  assert.equal(report.status,'POOL_SOURCES_DISCOVERED');
  assert.equal(report.source_count,1);
  assert.equal(report.repository_reports.find((x)=>x.repository==='example/down').status,'REPOSITORY_UNAVAILABLE');
  assert.equal(report.sources[0].repository,'example/good');
});

test('known pool event remains PREPROD-only and source-queue compatible',async()=>{
  const report={state_type:'CEREBRO_SKILL_KNOWN_REPOSITORY_POOL_REPORT_V1',status:'POOL_SOURCES_DISCOVERED',source_count:1,pool_page:1,total_descriptors:1,repositories_scanned:1,repository_reports:[],families_represented:['WEB_BUILD'],sources:[{github_url:'https://github.com/example/repo/tree/'+'e'.repeat(40)+'/skills/web'}]};
  const event=buildKnownPoolEvent({report,company_id:'fenix'});
  assert.deepEqual(event.client_payload.github_urls,[report.sources[0].github_url]);
  assert.equal(event.discovery.search_dependency,false);
  assert.equal(event.environment,'PREPROD');
  assert.equal(event.prod_write_authorized,false);
  assert.equal(event.prod_mutation_authorized,false);
  assert.equal(event.external_skill_code_execution,false);
  assert.equal(event.trading_access,false);
});
