const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const ALLOWED_MODELS = new Set(['deepseek-flash', 'deepseek-v4-pro']);

function cleanBaseUrl(value = DEFAULT_BASE_URL) {
  return String(value).replace(/\/+$/, '');
}

export function validateDeepSeekModel(model) {
  if (!ALLOWED_MODELS.has(model)) {
    throw new Error(`DeepSeek model is not allowlisted: ${model}`);
  }
  return model;
}

export function buildDeepSeekResponseRequest({
  model = 'deepseek-flash',
  input,
  instructions,
  maxOutputTokens = 256,
}) {
  validateDeepSeekModel(model);
  if (typeof input !== 'string' && !Array.isArray(input)) {
    throw new Error('DeepSeek input must be a string or Responses API input array');
  }
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 393216) {
    throw new Error('maxOutputTokens must be an integer between 1 and 393216');
  }
  const body = {
    model,
    input,
    max_output_tokens: maxOutputTokens,
  };
  if (instructions) body.instructions = String(instructions);
  return body;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of payload?.output ?? []) {
    if (item?.type !== 'message') continue;
    for (const part of item?.content ?? []) {
      if (part?.type === 'output_text' && typeof part?.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('');
}

export function normalizeDeepSeekUsage(payload) {
  const usage = payload?.usage ?? {};
  return {
    input_tokens: Number(usage.input_tokens ?? 0),
    cached_input_tokens: Number(usage.input_tokens_details?.cached_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? 0),
    reasoning_tokens: Number(usage.output_tokens_details?.reasoning_tokens ?? 0),
  };
}

export class DeepSeekProviderV0 {
  constructor({
    apiKey = process.env.DEEPSEEK_API_KEY,
    baseUrl = DEFAULT_BASE_URL,
    fetchImpl = globalThis.fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = cleanBaseUrl(baseUrl);
    this.fetchImpl = fetchImpl;
  }

  assertLiveReady() {
    if (!this.apiKey) throw new Error('DEEPSEEK_API_KEY is not configured in the runtime secret store');
    if (typeof this.fetchImpl !== 'function') throw new Error('No fetch implementation available');
  }

  async respond(request, { requestId = 'unassigned', signal } = {}) {
    this.assertLiveReady();
    const body = buildDeepSeekResponseRequest(request);
    const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        'x-cerebro-request-id': requestId,
      },
      body: JSON.stringify(body),
      signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerCode = payload?.error?.code ?? `HTTP_${response.status}`;
      throw new Error(`DeepSeek request failed: ${providerCode}`);
    }

    return {
      provider: 'deepseek',
      request_id: requestId,
      response_id: payload?.id ?? null,
      status: payload?.status ?? 'completed',
      model: payload?.model ?? body.model,
      output_text: extractOutputText(payload),
      usage: normalizeDeepSeekUsage(payload),
    };
  }

  async tinyCanary({ requestId = 'jarvis-boost-001-canary' } = {}) {
    return this.respond({
      model: 'deepseek-flash',
      instructions: 'This is a CEREBRO provider connectivity canary. Follow the user instruction exactly and do nothing else.',
      input: 'Return exactly: DEEPSEEK_CANARY_OK',
      maxOutputTokens: 128,
    }, { requestId });
  }
}

export const DEEPSEEK_PROVIDER_V0 = Object.freeze({
  provider: 'deepseek',
  base_url: DEFAULT_BASE_URL,
  allowed_models: [...ALLOWED_MODELS],
  secret_env: 'DEEPSEEK_API_KEY',
  live_by_default: false,
  auto_recharge: false,
});
