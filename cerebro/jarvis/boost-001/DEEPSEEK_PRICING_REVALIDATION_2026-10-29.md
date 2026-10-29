# JARVIS BOOST-001 · DeepSeek pricing revalidation · 2026-10-29

Status: REVALIDATED_FOR_BOUNDED_PREPROD_CANARY

Official source checked: https://api-docs.deepseek.com/quick_start/pricing/

Model selected: `deepseek-flash` (DeepSeek-V4.1-Flash-1017 at the time of revalidation).

Pricing observed per 1M tokens:
- input cache hit: USD 0.003 off-peak / USD 0.006 peak
- input cache miss: USD 0.15 off-peak / USD 0.30 peak
- output: USD 0.60 off-peak / USD 1.20 peak

Official Responses API source checked: https://api-docs.deepseek.com/api/create-response/

CEREBRO execution policy for this integration:
- DeepSeek remains an advisory submodel, never the policy authority.
- `deepseek-flash` only for this V0 learning loop.
- Live balance guard is mandatory before each paid advisory.
- Default projected request guard is USD 0.01.
- Automatic recharge remains forbidden.
- No customer data, credentials, PROD writes or Trading data may be included in the prompt.
- Model output is untrusted candidate evidence until CEREBRO evaluation and tribunal.
- The generic zero-cost Execution Model Router is not weakened; this is a bounded JARVIS BOOST-001 exception using its existing budget policy and explicit owner authorization.

This revalidation does not authorize PROD. It authorizes only the bounded PREPROD canary/advisory path subject to the existing BOOST-001 live balance guard.
