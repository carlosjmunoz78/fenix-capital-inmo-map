import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {JARVIS_IDENTITY,HUMAN_REQUIRED,normalizeExecutionContext,authorizeAction,classifyInformation,toolFirewall,compileContext,CapabilityFabricV1,verifyProofCarryingAction,ExecutionJournalV1} from '../jarvis/core-v1/core-v1.mjs';

const ctx={request_id:'r1',company_id:'fenix',project_id:'jarvis',environment:'PREPROD',permissions:['risk:high'],max_cost_eur:100};

test('identity and human exception contract are canonical',()=>{assert.equal(JARVIS_IDENTITY.owner_role,'OWNER_ROOT');assert.deepEqual(HUMAN_REQUIRED,['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);});

test('cross-company is deny-by-default',()=>{const r=authorizeAction({context:ctx,action:'read',target_company_id:'other'});assert.equal(r.allowed,false);assert.equal(r.human_required,'POLICY_CONFLICT');});

test('ordinary PREPROD action is allowed without repeated prompt',()=>{const r=authorizeAction({context:ctx,action:'inspect'});assert.equal(r.allowed,true);assert.equal(r.human_required,null);});

test('money limit triggers canonical exception',()=>{const r=authorizeAction({context:ctx,action:'buy',money_eur:101});assert.equal(r.allowed,false);assert.equal(r.human_required,'MONEY_LIMIT');});

test('tainted input cannot drive high-risk action',()=>{const label=classifyInformation({company_id:'fenix',project_id:'jarvis',integrity:'TAINTED'});const r=toolFirewall({context:ctx,action:'prod_write',labels:[label]});assert.equal(r.allowed,false);assert.equal(r.reason,'UNVERIFIED_OR_TAINTED_INPUT_FOR_HIGH_RISK_ACTION');});

test('context compiler preserves scope and excludes secrets',()=>{const c=compileContext({context:ctx,mission:{mission_id:'m1',tags:['jarvis']},max_items:2,shards:[{id:'a',required:true,text:'jarvis constitution',label:{company_id:'fenix',project_id:'jarvis',confidentiality:'INTERNAL'},confidence:1},{id:'b',secret:true,text:'secret',label:{company_id:'fenix',project_id:'jarvis',confidentiality:'SECRET'}},{id:'c',text:'foreign',label:{company_id:'other',project_id:'x',confidentiality:'PUBLIC'}}]});assert.equal(c.item_count,1);assert.equal(c.items[0].id,'a');});

test('capability fabric resolves only compatible capability',()=>{const f=new CapabilityFabricV1();f.register({capability_id:'x',version:'1',environments:['PREPROD'],company_ids:['fenix']});assert.equal(f.resolve({capability_id:'x',environment:'PREPROD',company_id:'fenix'}).capability_id,'x');assert.equal(f.resolve({capability_id:'x',environment:'PROD',company_id:'fenix'}),null);});

test('proof carrying action requires evidence',()=>{assert.equal(verifyProofCarryingAction({action_id:'a',request_id:'r',company_id:'fenix',environment:'PREPROD',intent:'x',authority:{},result:'ok',evidence:[]}).ok,false);assert.equal(verifyProofCarryingAction({action_id:'a',request_id:'r',company_id:'fenix',environment:'PREPROD',intent:'x',authority:{},result:'ok',evidence:['e']}).ok,true);});

test('execution journal is hash chained and detects committed side effect',()=>{const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-core-')),'journal.jsonl');const j=new ExecutionJournalV1({file});j.append({type:'MISSION_STARTED',mission_id:'m'});j.append({type:'SIDE_EFFECT_COMMITTED',idempotency_key:'k1'});assert.equal(j.verify(),true);assert.equal(j.hasSideEffect('k1'),true);const reread=new ExecutionJournalV1({file});assert.equal(reread.verify(),true);});

test('PROD context requires explicit prod permission',()=>{assert.throws(()=>normalizeExecutionContext({...ctx,environment:'PROD'}),/PROD_WRITE_PERMISSION_REQUIRED/);});
