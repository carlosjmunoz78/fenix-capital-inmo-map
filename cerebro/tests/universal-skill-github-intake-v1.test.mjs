import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseGitHubSkillUrl,acquirePublicGitHubSkill,runGitHubRepositoryActivation} from '../runtime/universal-skill-github-intake-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));const REPO_ROOT=path.resolve(__dirname,'../..');
const SHA='1234567890abcdef1234567890abcdef12345678';
const skill=`---\nname: finance-ops-unseen\ndescription: "Finance cash flow and accounting reconciliation for a small company"\ntags: [finance, accounting, cash-flow, reconciliation]\n---\n# Finance\nnet = inflows - outflows\nending_cash = starting_cash + net\nEvery bank line is reconciled and the wrapper must never execute a payment.\n`;
const license='MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy.\n';
function response(status,text,contentType='text/plain'){const bytes=Buffer.from(text);return {status,headers:{get:(k)=>k.toLowerCase()==='content-length'?String(bytes.length):contentType},arrayBuffer:async()=>bytes};}
function mockFetch(url){const u=String(url);if(u==='https://api.github.com/repos/acme/skills')return Promise.resolve(response(200,JSON.stringify({private:false,archived:false,default_branch:'main',license:{spdx_id:'MIT'}}),'application/json'));if(u==='https://api.github.com/repos/acme/skills/commits/main')return Promise.resolve(response(200,JSON.stringify({sha:SHA}),'application/json'));if(u.endsWith(`/${SHA}/skills/finance-ops/SKILL.md`))return Promise.resolve(response(200,skill));if(u.endsWith(`/${SHA}/LICENSE`))return Promise.resolve(response(200,license));return Promise.resolve(response(404,'not found'));}

test('B9 GitHub URL parser accepts public tree URL and preserves skill subpath',()=>{assert.deepEqual(parseGitHubSkillUrl('https://github.com/acme/skills/tree/main/skills/finance-ops'),{owner:'acme',repo:'skills',ref:'main',subpath:'skills/finance-ops',canonical_repo_url:'https://github.com/acme/skills'});});

test('B9 direct GitHub skill URL becomes FULL_SAFE_PREPROD through inferred SKILL.md manifest',async()=>{const report=await runGitHubRepositoryActivation({github_url:'https://github.com/acme/skills/tree/main/skills/finance-ops',company_id:'fenix',fetch_impl:mockFetch,root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-github-e2e-')),source_run_id:9100,source_head_sha:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});assert.equal(report.status,'FULL_SAFE_PREPROD');assert.equal(report.full_safe_preprod,true);assert.equal(report.pinned_sha,SHA);assert.equal(report.license_spdx,'MIT');assert.equal(report.activation.activation_plan.domain_ids.includes('finance-accounting-payments'),true);assert.equal(report.activation.auto_engineering.fulfillment.source_evidence_kind,'GOVERNED_READONLY_REMOTE');assert.equal(report.activation.native_registration.native_full,true);assert.equal(report.external_skill_code_execution,false);assert.equal(report.additional_cost_eur,0);});

test('B9 plain SKILL.md without frontmatter gets deterministic bounded manifest inference when documentation is substantive',async()=>{
  const plain='# Natural Conversation Coach\n\nA humanizer and copywriter skill for natural customer communication, conversation tone, empathy, de-escalation and brand voice. It reviews writing style and proposes clearer human language while preserving factual meaning and never sending messages by itself.\n\nUse deterministic review criteria, regression checks and rollback-friendly suggestions.\n';
  const fetch_impl=async(url)=>{const u=String(url);if(u==='https://api.github.com/repos/acme/plain-skill')return response(200,JSON.stringify({private:false,archived:false,default_branch:'main',license:{spdx_id:'MIT'}}),'application/json');if(u.endsWith(`/${SHA}/skills/humanizer/SKILL.md`))return response(200,plain);if(u.endsWith(`/${SHA}/LICENSE`))return response(200,license);return response(404,'not found');};
  const acquired=await acquirePublicGitHubSkill({github_url:`https://github.com/acme/plain-skill/tree/${SHA}/skills/humanizer`,fetch_impl});
  assert.equal(acquired.status,'ACQUIRED_READONLY');
  const manifest=JSON.parse(fs.readFileSync(path.join(acquired.repo_dir,'cerebro.skill.json'),'utf8'));
  assert.equal(manifest.technical_name,'natural-conversation-coach');
  assert.equal(manifest.origin.inference,'DETERMINISTIC_DOCUMENT_FALLBACK');
  assert.equal(manifest.policy.external_code_execution,false);
  assert.equal(manifest.policy.prod_write_authorized,false);
  assert.ok(manifest.capabilities[0].terms.some((x)=>String(x).includes('humanizer')));
});

test('B9 thin or ambiguous documentation remains LOW_CONFIDENCE instead of fabricating a manifest',async()=>{
  const fetch_impl=async(url)=>{const u=String(url);if(u==='https://api.github.com/repos/acme/thin-skill')return response(200,JSON.stringify({private:false,archived:false,default_branch:'main',license:{spdx_id:'MIT'}}),'application/json');if(u.endsWith(`/${SHA}/SKILL.md`))return response(200,'# Tool\nUseful helper.\n');if(u.endsWith(`/${SHA}/LICENSE`))return response(200,license);return response(404,'not found');};
  const acquired=await acquirePublicGitHubSkill({github_url:`https://github.com/acme/thin-skill/tree/${SHA}`,fetch_impl});
  assert.equal(acquired.status,'HUMAN_REQUIRED');
  assert.equal(acquired.human_required,'LOW_CONFIDENCE');
  assert.equal(acquired.reason,'NO_MACHINE_READABLE_OR_INFERABLE_SKILL_MANIFEST');
});

test('B9 scoped token is sent only to api.github.com and pinned SHA skips the commit lookup',async()=>{const calls=[];const fetch_impl=async(url,options={})=>{calls.push({url:String(url),authorization:options?.headers?.authorization??null});return mockFetch(url);};const report=await runGitHubRepositoryActivation({github_url:`https://github.com/acme/skills/tree/${SHA}/skills/finance-ops`,company_id:'fenix',fetch_impl,token:'unit-test-token',root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-github-token-')),source_run_id:9101,source_head_sha:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'});assert.equal(report.status,'FULL_SAFE_PREPROD');assert.equal(report.pinned_sha,SHA);assert.equal(report.acquisition.pin_resolution,'URL_PINNED_SHA');assert.equal(calls.some((x)=>x.url.includes('/commits/')),false);assert.ok(calls.filter((x)=>x.url.startsWith('https://api.github.com/')).every((x)=>x.authorization==='Bearer unit-test-token'));assert.ok(calls.filter((x)=>x.url.startsWith('https://raw.githubusercontent.com/')).every((x)=>x.authorization===null));});

test('B9 rejects URL shapes outside governed public GitHub scope',()=>{assert.throws(()=>parseGitHubSkillUrl('http://github.com/acme/skills'),/GITHUB_PUBLIC_HTTPS_URL_REQUIRED/);assert.throws(()=>parseGitHubSkillUrl('https://evil.example/acme/skills'),/GITHUB_PUBLIC_HTTPS_URL_REQUIRED/);assert.throws(()=>parseGitHubSkillUrl('https://github.com/acme/skills?token=x'),/GITHUB_PUBLIC_HTTPS_URL_REQUIRED/);});

test('B9 GitHub runtime has no clone, install, token logging or external code execution path',()=>{const runtime=fs.readFileSync(path.join(REPO_ROOT,'cerebro/runtime/universal-skill-github-intake-v1.mjs'),'utf8');assert.equal(runtime.includes('git clone'),false);assert.equal(runtime.includes('npm install'),false);assert.equal(runtime.includes('child_process'),false);assert.equal(runtime.includes('console.log(process.env.GITHUB_TOKEN)'),false);assert.equal(runtime.includes('process.stdout.write(process.env.GITHUB_TOKEN)'),false);assert.equal(runtime.includes('external_skill_code_execution:true'),false);});
