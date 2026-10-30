import test from 'node:test';
import assert from 'node:assert/strict';
import {getJarvisContractRegistryV1,validateJarvisContractV1,freezeJarvisContractV1,JARVIS_CONTRACTS_V1} from '../jarvis/contracts-v1/contract-validator-v1.mjs';

const ctx={company_id:'fenix',project_id:'jarvis',environment:'PREPROD',version:'1'};

test('registry freezes shared contracts for P01/P03/P04/P07',()=>{const r=getJarvisContractRegistryV1();assert.equal(r.registry_id,'JARVIS-CONTRACTS-V1');assert.ok(Object.keys(r.contracts).length>=20);assert.deepEqual(r.canonical_human_required,['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);assert.equal(JARVIS_CONTRACTS_V1.prod_authorized,false);});

test('MissionContract validates with canonical multi-company context',()=>{const value={...ctx,mission_id:'m1',objective:'Build safely',success_criteria:['green'],constraints:['no prod'],authority:{actor:'OWNER_ROOT'},budget:{eur:0},reversibility:'HIGH',evidence_required:['tests']};const v=validateJarvisContractV1('MissionContract',value);assert.equal(v.ok,true);assert.equal(v.contract_hash.length,64);const frozen=freezeJarvisContractV1('MissionContract',value);assert.equal(frozen.contract_type,'MissionContract');assert.equal(frozen.value.mission_id,'m1');});

test('contract validation fails closed on missing context and PROD',()=>{const base={mission_id:'m',objective:'x',success_criteria:[],constraints:[],authority:{},budget:{},reversibility:'HIGH',evidence_required:[]};assert.equal(validateJarvisContractV1('MissionContract',base).code,'MISSING_FIELDS');assert.equal(validateJarvisContractV1('MissionContract',{...ctx,...base,environment:'PROD'}).code,'PREPROD_ONLY');});

test('ExceptionRequest only accepts canonical HUMAN_REQUIRED reasons',()=>{const good={...ctx,exception_id:'e1',reason:'HIGH_RISK',what_happened:'x',why_human_needed:'y',deadline:'2026-12-01',risk:'HIGH',options:['a'],recommendation:'a',minimum_decision_required:'approve'};assert.equal(validateJarvisContractV1('ExceptionRequest',good).ok,true);assert.equal(validateJarvisContractV1('ExceptionRequest',{...good,reason:'approve this please'}).code,'INVALID_HUMAN_REQUIRED_REASON');});

test('AuthzDecision and HandshakeResponse require booleans',()=>{const auth={...ctx,decision_id:'d',actor:'jarvis',action:'read',target:'x',allowed:'yes',reason:'r',policy_ref:'p',decided_at:'now'};assert.equal(validateJarvisContractV1('AuthzDecision',auth).code,'ALLOWED_BOOLEAN_REQUIRED');const hs={...ctx,granted:'yes',constraints:[],expires_at:'later',deny_reason:null,decision_ref:'d'};assert.equal(validateJarvisContractV1('HandshakeResponse',hs).code,'GRANTED_BOOLEAN_REQUIRED');});

test('Verdict decision vocabulary and ComplexityBudget are bounded',()=>{const verdict={...ctx,verdict_id:'v',candidate_ref:'c',verifier_id:'j',decision:'MAYBE',criteria_results:{},evidence_refs:['e'],decided_at:'now'};assert.equal(validateJarvisContractV1('Verdict',verdict).code,'INVALID_VERDICT');const budget={...ctx,max_steps:5,token_ceiling:1000,cost_ceiling_eur:0,parallelism_ceiling:10,novelty_allowance:0.2};assert.equal(validateJarvisContractV1('ComplexityBudget',budget).ok,true);assert.equal(validateJarvisContractV1('ComplexityBudget',{...budget,max_steps:-1}).code,'INVALID_NONNEGATIVE_NUMBER');});
