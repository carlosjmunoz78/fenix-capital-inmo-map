import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OSS_RUNTIME,
  boundPromptForOssContext,
  invokeEphemeralOssInference,
  resetEphemeralOssInferenceForTests
} from '../skills/skill-ephemeral-oss-inference.mjs';

const gate={allowed:true,synthetic_only:true,paid_fallback:false,prod_authorized:false};
const quotaDecisionResult={status:'ALLOW_NEXT_SYNTHETIC_CALL'};

test('short local OSS prompts are preserved byte-for-byte',()=>{
  const prompt='CEREBRO synthetic test';
  const bounded=boundPromptForOssContext(prompt);
  assert.equal(bounded.prompt,prompt);
  assert.equal(bounded.truncated,false);
  assert.equal(bounded.original_utf8_bytes,Buffer.byteLength(prompt));
  assert.equal(bounded.effective_utf8_bytes,Buffer.byteLength(prompt));
});

test('oversized prompts are deterministically bounded while preserving head and tail',()=>{
  const head='HEAD_POLICY_MUST_SURVIVE\n';
  const tail='\nTAIL_OUTPUT_CONTRACT_MUST_SURVIVE';
  const prompt=head+'x'.repeat(20000)+tail;
  const bounded=boundPromptForOssContext(prompt);
  assert.equal(bounded.truncated,true);
  assert.ok(bounded.prompt.startsWith(head));
  assert.ok(bounded.prompt.endsWith(tail));
  assert.ok(bounded.prompt.includes('[CEREBRO_CONTEXT_TRUNCATED_FOR_LOCAL_OSS]'));
  assert.ok(Buffer.byteLength(bounded.prompt,'utf8')<=OSS_RUNTIME.max_prompt_utf8_bytes);
  assert.ok(OSS_RUNTIME.max_prompt_utf8_bytes+OSS_RUNTIME.max_new_tokens<OSS_RUNTIME.context_window_tokens);
});

test('unicode oversized prompts remain valid UTF-8 and stay inside conservative byte budget',()=>{
  const prompt='POLÍTICA\n'+'🧠áéíóú'.repeat(4000)+'\nCONTRATO_FINAL';
  const bounded=boundPromptForOssContext(prompt);
  assert.equal(bounded.truncated,true);
  assert.ok(!bounded.prompt.includes('\uFFFD'));
  assert.ok(bounded.prompt.startsWith('POLÍTICA'));
  assert.ok(bounded.prompt.endsWith('CONTRATO_FINAL'));
  assert.ok(Buffer.byteLength(bounded.prompt,'utf8')<=OSS_RUNTIME.max_prompt_utf8_bytes);
});

test('inference sends only bounded prompt to pinned local OSS generator and records audit metadata',async()=>{
  resetEphemeralOssInferenceForTests();
  const seen=[];
  const generator=async(chat,options)=>{
    seen.push({chat,options});
    return [{generated_text:'synthetic result'}];
  };
  const importImpl=async()=>({
    env:{},
    pipeline:async(task,model,options)=>{
      assert.equal(task,'text-generation');
      assert.equal(model,OSS_RUNTIME.model_repo);
      assert.equal(options.revision,OSS_RUNTIME.model_revision);
      return generator;
    }
  });
  const prompt='CEREBRO_POLICY\n'+'A'.repeat(30000)+'\nFINAL_REQUIREMENTS';
  const result=await invokeEphemeralOssInference({prompt,gate,quotaDecisionResult,importImpl});
  assert.equal(result.ok,true);
  assert.equal(result.prompt_truncated,true);
  assert.equal(result.additional_cost_eur_claimed,0);
  assert.equal(result.external_skill_code_executed,false);
  assert.equal(seen.length,1);
  const effective=seen[0].chat[0].content;
  assert.ok(Buffer.byteLength(effective,'utf8')<=OSS_RUNTIME.max_prompt_utf8_bytes);
  assert.equal(seen[0].options.max_new_tokens,OSS_RUNTIME.max_new_tokens);
  assert.equal(result.effective_prompt_utf8_bytes,Buffer.byteLength(effective,'utf8'));
  assert.notEqual(result.original_prompt_sha256,result.prompt_sha256);
  resetEphemeralOssInferenceForTests();
});
