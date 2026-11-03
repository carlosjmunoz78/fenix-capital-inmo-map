#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Finops001CostLedgerV1} from '../runtime/foundation-holds-v1.mjs';
import {authorizeFinops001OutboundV1} from '../runtime/finops001-zero-cost-outbound-guard-v1.mjs';

const repo='carlosjmunoz78/fenix-capital-inmo-map';
const resource='cerebro/registry/engine-registry.v1.json';
const env={company_id:'fenix',engine_id:'FINOPS-001',environment:'PREPROD',version:'v1'};
const provider='GITHUB_REST_READONLY';
const ledger=new Finops001CostLedgerV1();
ledger.setBudget({...env,budget_eur:0,hard_stop:true});
const gate=authorizeFinops001OutboundV1({ledger,context:env,expected_cost_eur:0,budget_eur:0,provider,resource_type:'GET_CONTENTS'});
assert.equal(gate.authorized,true,'FINOPS provider call must be policy-authorized before execution');
assert.equal(authorizeFinops001OutboundV1({ledger,context:env,expected_cost_eur:0.0001,budget_eur:0,provider,resource_type:'GET_CONTENTS'}).authorized,false);
assert.equal(authorizeFinops001OutboundV1({ledger,context:{...env,environment:'PROD'},expected_cost_eur:0,budget_eur:0,provider,resource_type:'GET_CONTENTS'}).authorized,false);
const token=process.env.GITHUB_TOKEN;
assert.ok(token&&token.length>10,'read-only repo token required');
assert.equal(process.env.GITHUB_REPOSITORY,repo,'repository guard');
const sha=process.env.GITHUB_SHA;
assert.match(sha||'',/^[0-9a-f]{40}$/);
const url='https://api.github.com/repos/'+repo+'/contents/'+resource+'?ref='+sha;
const started=Date.now();
const response=await fetch(url,{method:'GET',headers:{
  Accept:'application/vnd.github+json',
  Authorization:'Bearer '+token,
  'User-Agent':'CEREBRO-FINOPS001-READONLY-ACCEPTANCE',
  'X-GitHub-Api-Version':'2022-11-28',
},signal:AbortSignal.timeout(15000)});
if(!response.ok)throw new Error('FINOPS001_PROVIDER_READ_FAILED:'+response.status);
const data=await response.json();
assert.equal(data.path,resource);
assert.equal(data.encoding,'base64');
const actual=Buffer.from(String(data.content).replace(/\s+/g,''),'base64');
const parsed=JSON.parse(actual.toString('utf8'));
assert.equal(parsed.count,179);
const digest=crypto.createHash('sha256').update(actual).digest('hex');
const event={...env,event_id:'finops001-live-github-'+sha.slice(0,16),task_id:'finops001-live-readonly',provider,
  resource_type:'GET_CONTENTS',cost_eur:0,savings_eur:0,occurred_at:new Date().toISOString()};
const first=ledger.ingest(event);
const second=ledger.ingest(event);
assert.equal(first.accepted,true);
assert.equal(second.deduplicated,true);
assert.equal(first.usage.event_count,1);
assert.equal(first.usage.cost_eur,0);
assert.equal(first.usage.by_provider[provider],0);
assert.equal(gate.expected_cost_eur,0);
const result={
  schema_version:'1.0.0',engine_id:'FINOPS-001',status:'GREEN_LIVE_GITHUB_READONLY_PROVIDER_CALL',
  provider,resource_type:event.resource_type,
  source:{repository:repo,git_sha:sha,resource,content_sha256:digest,registry_count:parsed.count},
  checks:{pre_call_zero_cost_gate:true,real_authenticated_read_only_api_call:true,provider_attribution:true,deduplication:true,tenant_scoping:true,prod_write_denied:true},
  observed:{http_status:response.status,elapsed_ms:Date.now()-started,usage_events:1,recorded_call_cost_eur:0},
  limits:{api_charge_independently_metered:false,github_actions_minutes_cost_not_verified:true,
    other_providers_instrumented:false,prod_authorized:false},
  token_recorded:false,external_write:false,prod_writes:false,trading_access:false,
  additional_subscription_eur:0
};
const dir=process.env.CEREBRO_FINOPS_EVIDENCE_OUT||'/tmp/cerebro-finops-github-live';
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/SUMMARY.json',JSON.stringify(result,null,2)+'\n');
console.log('FINOPS001_GITHUB_LIVE_READ_ACCEPTANCE='+JSON.stringify(result));
