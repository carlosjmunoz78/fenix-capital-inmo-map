# CEREBRO UMS-001 · Quality and training gate before video · 11 Nov 2026

**Environment:** LAB only. **Role ownership:** the existing CEREBRO Audiovisual Producer (UMS-001), its creative prompt factory, specialist agents, QA and tribunal. DeepSeek is a **temporary internal creative teacher and independent quality reviewer**, not a new owner or permanent replacement for the Studio. Replicate is a generator; no autonomous publishing.

## Live evidence preserved (do not re-run paid predictions)
- Real LAB run 43031579487, request `UMS001-IGC202603-DEEPSEEK-ARTLAB-20261111-07`: DeepSeek 4 calls; Replicate 2 JPG outputs, scores **52/100 and 48/100**, both rejected (HUMAN_REQUIRED_LOW_CONFIDENCE). Images and prompt/QA bundle are a retained GitHub Actions artifact.
- Defects from actual visual review: orange mural or ordinary patio rather than transparent glass architecture; shallow generic commercial portrait; fabricated markings on watch and a watermark-like text; anatomy/unequal subject scale, poor location storytelling.
- Real rejected scores are NOT a pass; published assets=0.
- Existing `UMS001_DEEPSEEK_REAL_IMAGE_LEARNING_LEDGER_20261111.json` is preserved. All learnings remain scoped to LAB until independent validation.

## One-variable causal trial (not a rewrite)
The legacy pipeline conditions social images with a verified cropped style reference at 0.30 strength. This may pull the composition toward generic portraits. We **cannot establish causation from 2 images**. An additive optional request field `style_reference_mode` permits `VERIFIED_CROP` (unchanged default) or `NONE` (unconditioned candidate). No changes to the existing job schema without this field.

- Candidate `...-08.json`: `style_reference_mode=NONE`, LAB, publish=false, unchanged financial caps.
- Deterministic `replicate_image_input` constructs the provider request, with no image conditioning only for explicitly opted-in orders.
- New offline tests check backwards compatibility, rejection of other modes, no reference payload, budgets, no PROD and no publishing.
- New CI safety workflow contains **no external provider tokens, paid inference or publishing code**.
- The existing PR #39 and all operating jobs are untouched. Candidate is on an isolated child branch; promotion only after OLD-vs-NEW and full acceptance.

## Operational image acceptance (NOT YET PASSED)
A single order originating in each relevant department (Instagram, Facebook, LinkedIn, SEO) must retain the department's documented size/aspect requirements and brand/rights contract. Before any paid test, reconcile the actual company brand assets and format matrix. The current hard-coded 4:5 generation is **not sufficient** to certify all platforms.

For a controlled original image canary: pin brief, prompt, camera/light/contrast plan, image input, source/reference settings, prediction ID, raw SHA256, QA dimensions, exact defects, correction, cost receipt and destination. If a generated image is rejected, do not falsely mark success; compare with previous accepted composition and explain why. For learning, store what DeepSeek changed and whether independent visual QA improved; do not import a weak or rejected prompt as truth.

Quality rule: each approved final must pass >=88/100 plus zero critical violations, correct genuine Fénix logo composited deterministically (never hallucinated by model), documented usage rights, no fictitious financing claims, correct dimensions/crop/readability, and owner-approved editorial quality where required. An LLM verdict alone is **not** visual acceptance.

## Gate to video
- IMAGE_GATE_GREEN: all intended image categories, format/brand/rights gates, private artifact preservation, reproducibility, FinOps actual use, cost ceiling and rollback, reliable E2E department→Studio→DeepSeek training→Replicate→QA→delivered, with independent accepted physical outputs.
- VIDEO_INTRO_OUTRO_LAB: after the image gate, build branded opening/closing cards using existing UMS composition capabilities and original mark; validate size/time/safe areas/audio rights.
- VIDEO_GENERATION_LAB: only after intro/outro acceptance, connect existing video generator candidates under isolated budgets, rights and safety gates.
- Do NOT claim producer/autonomous IMAGE_GATE_GREEN or advance to paid video merely from green unit tests.

## Rollback
Close the isolated candidate PR and stop using `style_reference_mode=NONE`; the parent PR #39 and default existing `VERIFIED_CROP` behavior remain unchanged. No main/PROD/App/CRM/Cloudflare/DNS/WordPress edits.

**Current status:** IMAGE=PARCIAL; candidate isolated and offline-testable; VIDEO=HOLD pending image acceptance.
