import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessGovernedReleasePromotion,finalizeGovernedReleasePromotion,HUMAN_EXCEPTION_REASONS,REQUIRED_RELEASE_GATES,RELEASE_REF_PREFIX} from '../governance/governed-release-promotion-executor-v2.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(HERE,'../..');
const repoFile=(...parts)=>path.join(REPO_ROOT,...parts);
const RELEASE_SHA='b'.repeat(40);
const BASE_SHA='a'.repeat(40);
const greenGates=Object.fromEntries(REQUIRED_RELEASE_GATES.map(k=>[k,true]));
function packet(overrides={}){return {state_type:'CEREBRO_GOVERNED_RELEASE_PROMOTION_PACKET_V2',company_id:'fenix',engine_id:'APP-001',target:'APP_FENIX_STATIC',release_ref:`${RELEASE_REF_PREFIX}app001-test`,expected_release_sha:RELEASE_SHA,base_prod_sha:BASE_SHA,preprod_evidence_run_id:123456,gates:{...greenGates},prod_source_audit_green:true,additional_subscription_eur:0,trading_access:false,...overrides};}

test('all gates green returns PROMOTE_READY without claiming PROD',()=>{
  const r=assessGovernedReleasePromotion(packet());
  assert.equal(r.status,'PROMOTE_READY');
  assert.equal(r.environment,'PREPROD');
  assert.equal(r.expected_release_sha,RELEASE_SHA);
  assert.equal(r.base_prod_sha,BASE_SHA);
  assert.equal(r.authority.prod_write_authorized,true);
});

test('release ref is fail-closed to APP_FENIX_STATIC namespace',()=>{
  assert.throws(()=>assessGovernedReleasePromotion(packet({release_ref:'main'})),/release_ref must start/);
});

test('physical PROD base must be audited',()=>{
  const r=assessGovernedReleasePromotion(packet({prod_source_audit_green:false}));
  assert.equal(r.status,'REPAIR_REQUIRED');
  assert.ok(r.blockers.includes('PHYSICAL_PROD_BASE_NOT_AUDITED'));
});

test('any missing gate blocks promotion',()=>{
  const r=assessGovernedReleasePromotion(packet({gates:{...greenGates,tribunal:false}}));
  assert.equal(r.status,'REPAIR_REQUIRED');
  assert.ok(r.blockers.includes('GATE_TRIBUNAL_NOT_GREEN'));
});

test('cost and Trading remain fail-closed',()=>{
  assert.equal(assessGovernedReleasePromotion(packet({additional_subscription_eur:1})).status,'REPAIR_REQUIRED');
  assert.equal(assessGovernedReleasePromotion(packet({trading_access:true})).status,'REPAIR_REQUIRED');
});

test('HUMAN_REQUIRED is restricted to canonical reasons',()=>{
  assert.deepEqual(HUMAN_EXCEPTION_REASONS,['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
  for(const reason of HUMAN_EXCEPTION_REASONS)assert.equal(assessGovernedReleasePromotion(packet({human_exception:{reason,detail:'test'}})).status,'HUMAN_REQUIRED');
  assert.throws(()=>assessGovernedReleasePromotion(packet({human_exception:{reason:'OTHER'}})),/invalid HUMAN_REQUIRED reason/);
});

test('PROD_PROMOTED requires exact physical source SHA plus smoke and monitor',()=>{
  const mismatch=finalizeGovernedReleasePromotion(packet(),{deployment_run_id:9,prod_source_sha:BASE_SHA,smoke_passed:true,monitor_passed:true});
  assert.equal(mismatch.status,'REPAIR_REQUIRED');
  assert.ok(mismatch.blockers.includes('PHYSICAL_PROD_SOURCE_SHA_MISMATCH'));
  const green=finalizeGovernedReleasePromotion(packet(),{deployment_run_id:9,prod_source_sha:RELEASE_SHA,smoke_passed:true,monitor_passed:true,proof_url:'https://app.fenixcapital.es/PROD_SOURCE_SHA.txt'});
  assert.equal(green.status,'PROD_PROMOTED');
  assert.equal(green.environment,'PROD');
});

test('V2 workflow never merges main and deploys exact release ref only after exact PREPROD proof',()=>{
  const workflow=fs.readFileSync(repoFile('.github','workflows','cerebro-governed-release-promotion-v2.yml'),'utf8');
  assert.match(workflow,/release\/app-fenix-static\/\*/);
  assert.match(workflow,/cerebro-app001-preprod-physical-qa-v1\.yml/);
  assert.match(workflow,/gh workflow run prod-live-deploy\.yml[\s\S]*--ref "\$RELEASE_REF"/);
  assert.match(workflow,/gh workflow run prod-runtime-smoke\.yml[\s\S]*--ref "\$RELEASE_REF"/);
  assert.match(workflow,/PROD_SOURCE_SHA\.txt/);
  assert.match(workflow,/terminal_state=PROD_PROMOTED/);
  assert.doesNotMatch(workflow,/gh pr merge/);
  assert.doesNotMatch(workflow,/--ref main -f confirm=DEPLOY_PROD/);
});

test('V2 workflow restricts APP-001 release diff and preserves isolation',()=>{
  const workflow=fs.readFileSync(repoFile('.github','workflows','cerebro-governed-release-promotion-v2.yml'),'utf8');
  assert.match(workflow,/src\/login-layout-fix\.css/);
  assert.match(workflow,/unauthorized path/);
  assert.match(workflow,/CEREBRO_PROD_WRITE: 'false'/);
  assert.match(workflow,/CEREBRO_TRADING_ACCESS: 'false'/);
});
