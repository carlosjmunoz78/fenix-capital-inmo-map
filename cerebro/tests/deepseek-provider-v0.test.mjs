import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEEPSEEK_PROVIDER_V0,
  DeepSeekProviderV0,
  buildDeepSeekResponseRequest,
  validateDeepSeekModel,
} from '../runtime/deepseek-provider-v0.mjs';

test('DeepSeek provider allowlists only BOOST-001 models', () => {
  assert.equal(validateDeepSeekModel('deepseek-flash'), 'deepseek-flash');
  assert.equal(validateDeepSeekModel('deepseek-v4-pro'), 'deepseek-v4-pro');
  assert.throws(() => validateDeepSeekModel('some-unapproved-model'), /not allowlisted/);
  assert.equal(DEEPSEEK_PROVIDER_V0.auto_recharge, false);
  assert.equal(DEEPSEEK_PROVIDER_V0.live_by_default, false);
});

test('request builder is deterministic and bounded', () => {
  const body = buildDeepSeekResponseRequest({
    model: 'deepseek-flash',
    instructions: 'test',
    input: 'hello',
    maxOutputTokens: 32,
  });
  assert.deepEqual(body, {
    model: 'deepseek-flash',
    input: 'hello',
    max_output_tokens: 32,
    instructions: 'test',
  });
  assert.throws(() => buildDeepSeekResponseRequest({ input: 'x', maxOutputTokens: 0 }), /between 1 and 393216/);
});

test('live request fails closed when secret is absent', async () => {
  let called = false;
  const provider = new DeepSeekProviderV0({
    apiKey: '',
    fetchImpl: async () => { called = true; },
  });
  await assert.rejects(() => provider.tinyCanary(), /not configured/);
  assert.equal(called, false);
});

test('tiny canary uses exact DeepSeek responses endpoint and returns sanitised telemetry', async () => {
  let captured;
  const provider = new DeepSeekProviderV0({
    apiKey: 'TEST_SECRET_DO_NOT_LOG',
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            id: 'resp_test',
            status: 'completed',
            model: 'deepseek-flash',
            output_text: 'DEEPSEEK_CANARY_OK',
            usage: {
              input_tokens: 10,
              input_tokens_details: { cached_tokens: 4 },
              output_tokens: 3,
              output_tokens_details: { reasoning_tokens: 0 },
            },
          };
        },
      };
    },
  });

  const result = await provider.tinyCanary({ requestId: 'req-1' });
  assert.equal(captured.url, 'https://api.deepseek.com/responses');
  assert.equal(captured.init.method, 'POST');
  assert.equal(JSON.parse(captured.init.body).model, 'deepseek-flash');
  assert.equal(result.output_text, 'DEEPSEEK_CANARY_OK');
  assert.equal(result.usage.input_tokens, 10);
  assert.equal(JSON.stringify(result).includes('TEST_SECRET_DO_NOT_LOG'), false);
});

test('provider errors never echo the API secret', async () => {
  const secret = 'VERY_PRIVATE_TEST_SECRET';
  const provider = new DeepSeekProviderV0({
    apiKey: secret,
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      async json() { return { error: { code: 'invalid_api_key', message: `bad ${secret}` } }; },
    }),
  });
  await assert.rejects(async () => {
    try {
      await provider.tinyCanary();
    } catch (error) {
      assert.equal(String(error).includes(secret), false);
      throw error;
    }
  }, /invalid_api_key/);
});
