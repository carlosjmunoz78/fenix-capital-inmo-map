# Daily Media Technology Scout Contract · UMS V2

## Objective
Every Universal Media Studio role owns a `Learning Inbox`. Roles request new knowledge; they do not independently crawl the same sources. D48 + Research deduplicate requests and run one governed discovery/evaluation pipeline.

## Daily loop
`ROLE QUESTION -> dedupe -> source discovery -> evidence -> license/security/rights -> capability mapping -> duplicate/gap analysis -> LAB benchmark -> quality/cost/latency/privacy -> OLD vs NEW -> tribunal -> promote/reject -> learning memory -> affected-role distribution`

## Knowledge horizons
- `NOW`: usable in production today.
- `EMERGING`: beta/early access/research already testable.
- `COMING`: announced or near-term capability requiring readiness planning.
- `FRONTIER`: credible research that may alter future architecture.

## Mandatory monitored universes
- image generation/editing/restoration;
- video generation/editing/video-to-video;
- voice/TTS/voice conversion/dubbing/singing;
- music/composition/audio/SFX/Foley;
- 3D/modeling/rigging/animation/reconstruction;
- photogrammetry/LiDAR/NeRF/Gaussian splats/volumetric/light-field;
- realtime/virtual production;
- VFX/simulation/compositing;
- render/compute/storage/codecs;
- XR/AR/VR/MR/spatial/holographic devices;
- live/broadcast/interactive;
- restoration/QC/forensics/provenance;
- new DCCs, APIs, SDKs, open standards and interoperability tools.

## Learning Inbox schema
Each role may emit:
- `role_id`
- `question_id`
- `question`
- `reason`
- `capability_domain`
- `horizon`
- `urgency`
- `current_baseline`
- `expected_gain`
- `risk_if_ignored`

## Promotion rule
No novelty is adopted merely because it is new. Promotion requires evidence that the candidate improves at least one relevant dimension without unacceptable regression:
- quality;
- capability coverage;
- consistency;
- speed;
- cost;
- privacy/security;
- rights/licensing;
- reproducibility;
- interoperability;
- maintainability;
- future readiness.

## New-role creation
If a discovered capability cannot be owned cleanly by an existing role, FACT-001 performs capability-gap analysis. Only a proven gap may create a new logical role. The new role inherits registry, permissions, policies, tests, supervision, tribunal, learning, observability, cost, backup, rollback and rebuild requirements.

## Internal learning
Every completed production must also feed the learning system with:
`decision -> output -> supervisor feedback -> tribunal scores -> audience/business result where available -> corrective action -> reusable precedent`.

External discovery and internal production learning are equally important.
