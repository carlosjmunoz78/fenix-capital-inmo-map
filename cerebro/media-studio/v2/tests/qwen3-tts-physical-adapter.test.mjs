import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  planQwen3TtsPhysicalPreprod,
  executeQwen3TtsPhysicalPreprod,
  executeSyntheticVoiceWithFallbackPreprod,
  QWEN3_TTS_PREPROD_BINDING
} from '../runtime/qwen3-tts-physical-adapter.mjs';

const base={company_id:'GLOBAL',environment:'PREPROD',request_id:'ums:qwen:test1',asset_ref:'ums:voice:test1',text:'CEREBRO, prueba de voz en español.',language:'Spanish',speaker:'Aiden',max_cost_eur:0,contains_personal_data:false};

test('Qwen plan reuses multimedia seam, routes zero-cost and preserves Piper fallback',()=>{
  const plan=planQwen3TtsPhysicalPreprod(base);
  assert.equal(plan.status,'QWEN3_TTS_PREPROD_PLAN_READY');
  assert.equal(plan.multimedia_plan.adapter,'QWEN3_TTS');
  assert.equal(plan.multimedia_plan.task_type,'VOICE_SYNTHESIS');
  assert.equal(plan.routing.selected.id,'QWEN3_TTS_0_6B_CPU');
  assert.deepEqual(plan.fallback_chain,['PIPER_ZERO_COST']);
  assert.equal(plan.additional_cost_eur,0);
  assert.equal(plan.prod_authorized,false);
  assert.equal(QWEN3_TTS_PREPROD_BINDING.prod_binding,false);
});

test('Qwen physical adapter fails closed for PROD, money and real-person/clone requests',()=>{
  assert.throws(()=>planQwen3TtsPhysicalPreprod({...base,environment:'PROD'}),/PREPROD_ONLY/);
  assert.throws(()=>planQwen3TtsPhysicalPreprod({...base,max_cost_eur:0.01}),/MONEY_LIMIT/);
  assert.throws(()=>planQwen3TtsPhysicalPreprod({...base,voice_clone_requested:true}),/SYNTHETIC_BUILTIN_VOICE_ONLY/);
  assert.throws(()=>planQwen3TtsPhysicalPreprod({...base,real_person_voice_requested:true}),/SYNTHETIC_BUILTIN_VOICE_ONLY/);
});

test('physical execution contract accepts semantic WAV evidence without model download in unit test',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ums-qwen-test-'));
  try{
    const result=await executeQwen3TtsPhysicalPreprod({...base,preprod_physical_test:true,cwd:process.cwd(),artifact_dir:dir},{runProcess:async({env})=>{
      fs.writeFileSync(env.UMS_QWEN_OUTPUT,Buffer.from('RIFFsynthetic-test-wave'));
      fs.writeFileSync(env.UMS_QWEN_REPORT,JSON.stringify({status:'PASSED_CPU_REAL_INFERENCE',artifact:{sha256:'a'.repeat(64),duration_seconds:1.25,sample_rate:24000,bytes:23}}));
      return {code:0,signal:null,stdout:'fake physical executor',stderr:''};
    }});
    assert.equal(result.status,'QWEN3_TTS_PREPROD_PHYSICAL_GREEN');
    assert.equal(result.physical_execution_proven,true);
    assert.equal(result.artifact.duration_seconds,1.25);
    assert.equal(result.external_side_effect_executed,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Piper fallback is explicit and only used after Qwen failure',async()=>{
  const result=await executeSyntheticVoiceWithFallbackPreprod({...base,preprod_physical_test:true},{
    runProcess:async()=>({code:9,signal:null,stdout:'',stderr:'controlled qwen failure'}),
    piperFallback:async()=>({ok:true,provider:'PIPER',artifact_ref:'fixture:piper.wav',cost_eur:0})
  });
  assert.equal(result.status,'PIPER_FALLBACK_GREEN');
  assert.equal(result.primary_provider,'QWEN3_TTS_0_6B_CPU');
  assert.equal(result.fallback_provider,'PIPER_ZERO_COST');
  assert.equal(result.fallback.cost_eur,0);
});
