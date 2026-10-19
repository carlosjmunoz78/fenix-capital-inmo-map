import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSkillSourceQueueOnce,requestsFromGitHubEvent} from '../runtime/universal-skill-source-queue-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));const REPO_ROOT=path.resolve(__dirname,'../..');const SHA='1234567890abcdef1234567890abcdef12345678';
const skill=`---\nname: finance-ops-queue\ndescription: "Finance cash flow and accounting reconciliation"\ntags: [finance, accounting, cash-flow, reconciliation]\n---\nnet = inflows - outflows\nending_cash = starting_cash + net\n`;
function response(status,text){const b=Buffer.from(text);return {status,headers:{get:(k)=>k.toLowerCase()==='content-length'?String(b.length):'text/plain'},arrayBuffer:async()=>b};}
function mockFetch(url){const u=String(url);if(u==='https://api.github.com/repos/acme/skills')return Promise.resolve(response(200,JSON.stringify({private:false,archived:false,default_branch:'main',license:{spdx_id:'MIT'}})));if(u==='https://api.github.com/repos/acme/skills/commits/main')return Promise.resolve(response(200,JSON.stringify({sha:SHA})));if(u.endsWith(`/${SHA}/skills/finance/SKILL.md`))return Promise.resolve(response(200,skill));if(u.endsWith(`/${SHA}/LICENSE`))return Promise.resolve(response(200,'MIT License\nPermission is hereby granted, free of charge.'));return Promise.resolve(response(404,'not found'));}
const URL='https://github.com/acme/skills/tree/main/skills/finance';

test('B10 durable source queue activates duplicate URLs once and reuses completed result on restart',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b10-queue-'));const first=await runSkillSourceQueueOnce({root_dir:root,requests:[{company_id:'fenix',github_url:URL},{company_id:'fenix',github_url:URL}],concurrency:4,fetch_impl:mockFetch,now_ms:100000,source_run_id:10001,source_head_sha:'dddddddddddddddddddddddddddddddddddddddd'});assert.equal(first.status,'QUEUE_TERMINAL_GREEN');assert.equal(first.accepted_new,1);assert.equal(first.duplicates,1);assert.equal(first.unique_results,1);assert.equal(first.by_status.FULL_SAFE_PREPROD,1);assert.equal(first.results[0].full_safe_preprod,true);const second=await runSkillSourceQueueOnce({root_dir:root,requests:[{company_id:'fenix',github_url:URL}],concurrency:4,fetch_impl:mockFetch,now_ms:200000,source_run_id:10002,source_head_sha:'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'});assert.equal(second.status,'QUEUE_TERMINAL_GREEN');assert.equal(second.accepted_new,0);assert.equal(second.duplicates,1);assert.equal(second.processed_new,0);assert.equal(second.by_status.FULL_SAFE_PREPROD,1);assert.equal(second.results[0].reused_completed_job,true);});

test('B10 GitHub repository_dispatch payload becomes source queue requests',()=>{const rows=requestsFromGitHubEvent({action:'cerebro_skill_intake',client_payload:{company_id:'fenix',github_urls:[URL,'https://github.com/acme/skills/tree/main/skills/finance-two']}});assert.equal(rows.length,2);assert.equal(rows[0].company_id,'fenix');assert.equal(rows[0].github_url,URL);});

test('B10 queue has no PROD, trading, install or raw external execution authority',()=>{const runtime=fs.readFileSync(path.join(REPO_ROOT,'cerebro/runtime/universal-skill-source-queue-v1.mjs'),'utf8');assert.equal(runtime.includes('prod_authorized:true'),false);assert.equal(runtime.includes('trading_access:true'),false);assert.equal(runtime.includes('npm install'),false);assert.equal(runtime.includes('child_process'),false);assert.equal(runtime.includes('external_skill_code_execution:true'),false);});
