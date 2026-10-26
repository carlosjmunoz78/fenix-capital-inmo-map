# ANA_FENIX_FINANCE_ES_ES_V1 · Rebuild

## Purpose
Reconstruct Ana's approved financial-agent voice without changing speaker identity.

## Canonical identity
- voice_profile_id: `ANA_FENIX_FINANCE_ES_ES_V1`
- locale: `es-ES`
- agent: `ANA_FINANCE`
- engine: `VOICEUI-001`
- environment: `PREPROD`

## Source
- Runtime family: ResembleAI Chatterbox Multilingual V3 Single Language
- Model: `ResembleAI/Chatterbox-Multilingual-es-es`
- Canonical reference: `es_es_f1.wav`
- Upstream reference URL: `https://storage.googleapis.com/chatterbox-demo-samples/mtl-v3-single-language-prompts/es-es/es_es_f1.wav`
- Model checkpoint SHA256: `d85844b13ea8cb45e95b8d84a55bcfeccb2d743035cf304ee3d778fc6be39546`

## Rebuild order
1. Verify model repository and checksum metadata.
2. Obtain the canonical `es_es_f1.wav` reference from the registered upstream source or owned backup when available.
3. Verify the reference binary checksum once an owned backup exists.
4. Load the dedicated `es-ES` model; language id must remain `es`.
5. Apply the registered ANA prosody preset; do not alter speaker identity.
6. Run `acceptance-tests.json` in PREPROD.
7. Compare regenerated samples with the approved Ana reference.
8. Keep PROD blocked until every gate passes.

## Backup rule
The upstream URL is registered but is not sufficient as the sole long-term backup. A byte-identical owned binary copy + SHA256 is still required before declaring backup GREEN.

## Rollback
Rollback means disabling ANA voice output and returning the agent to text-only/previous approved voice behavior. Do not overwrite or delete the locked reference profile.
