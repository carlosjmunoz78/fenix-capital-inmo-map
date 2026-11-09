# CEREBRO Universal Media Studio V2 · Changelog

## 2026-10-25 · Character Clone Engine V0 · persistent character governance

Environment: `PREPROD -> main control-plane candidate`
Pull request: `#934`
Readiness before/after: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`
Physical benchmark credit: `0` new PASS_WITH_EVIDENCE
Additional recurring cost introduced: `0 €`

### HECHO
- Added canonical persistent-character contract covering face, body, voice, motion, performance, expressions, wardrobe and behavior under `company_id`, `engine_id`, `environment` and `version`.
- Reused the existing UMS clone contract and `rights-gate.mjs`; no parallel rights system was created.
- Added identity classes `SYNTHETIC_ORIGINAL`, `FICTIONAL_LICENSED` and `REAL_AUTHORIZED` with fail-closed governance for real identities.
- Real-person digital doubles require valid rights/consent, provenance and revocation evidence and return `HUMAN_REQUIRED: LEGAL_REQUIRED` when those records are incomplete.
- Added `character-clone-orchestrator.mjs` to assemble only the departments/guardians required by the requested clone components.
- Added explicit continuity targets for identity similarity, temporal identity drift, body-proportion drift, voice similarity, lip-sync offset, wardrobe continuity and mannerism continuity.
- Added a dedicated physical acceptance gate with multi-angle identity, long-sequence consistency, rights recheck, provenance, license/security, measured cost, rollback/rebuild and tribunal requirements.
- Physical adapter binding remains disabled until PREPROD adapter evidence + benchmark evidence + provenance + rollback are GREEN.
- Added six block-specific tests covering synthetic originals, real-person rights failure, authorized-real planning, physical binding evidence, voice-only routing and mandatory provenance.
- The first CI attempt exposed an unrelated prior daily-learning deduplication regression; corrected the central scout to deduplicate the common 12-section curriculum while retaining exact consumer role/department routing.
- UMS V2 foundation gate then passed GREEN with all 91 tests, including the six new character-clone tests and the no-false-PROD/no-paid-dependency controls.

### EXISTENTE Y PRESERVADO
- Existing `clone-job.schema.json` and `rights-gate.mjs`: wrapped and preserved.
- Existing creative/multimedia runtime and role graph: unchanged.
- App Fénix, CRM, Supabase transactional core, SEO, WordPress, Training and Trading isolation: unchanged.

### PARCIAL / NO CONFUNDIR CON CAPACIDAD FÍSICA COMPLETA
- Character/digital-human control plane is implemented and tested.
- No new face, body, voice, motion, 3D or video model is silently installed or declared operational by this block.
- No real-person identity is cloned by this block.
- Physical quality remains subject to adapter selection and real PREPROD benchmarks; UMS global readiness remains `NOT_READY`.

### Rollback / rebuild
- Change is additive under `cerebro/media-studio/v2/**`.
- PR `#934` is the block-level rollback boundary before main integration.
- Rebuild source of truth: persistent-character schema + existing rights gate + character orchestrator + physical benchmark contract + tests.

---

## 2026-10-25 · PROD knowledge expansion for 192 specialists

Environment: `PROD_KNOWLEDGE / NO_EXECUTION_AUTHORITY`
Readiness before/after: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`
Physical benchmarks before/after: `0/12 PASS_WITH_EVIDENCE`
Additional recurring cost introduced: `0 €`

### HECHO
- Closed the previous verified-source gap affecting 24 departments / 192 specialists. Current department-level source coverage is 48/48 departments and 384/384 specialists.
- Added a PROD professional source expansion using official/primary material across audience, research, screenwriting, narrative, creative direction, digital humans, voice, lighting, reconstruction, spatial media, illustration, motion design, directing, editorial, 2D animation, mocap, stunts/crowds, sound design, music, singing and interactive media.
- Added an existing-CEREBRO skill reuse map so UMS reuses the current creative/multimedia stack before creating new runtimes.
- Enriched exactly 192/192 formerly uncovered specialists with >=2 verified sources, >=6 concrete knowledge points, reusable skills/candidates/HOLDs, capability gaps, daily questions and NOW/EMERGING/COMING/FRONTIER watch.
- Added a 192 × 12 deep knowledge matrix = 2,304 governed knowledge cells covering standards, workflows, tools/models, research, case studies, benchmarks, rights/licenses, failure modes, quality metrics, cost/latency/compute, interoperability and future watch.
- All 2,304 cells have an active evidence/research path. No cell is falsely declared mastered.
- Added current frontier knowledge candidates for 3D/reconstruction, video/digital humans, voice, music and sound, including Blender, SAM 3D, gsplat, Nerfstudio, TRELLIS, Hunyuan3D, Wan, LTX-2, HunyuanVideo, MuseTalk, Qwen3-TTS, IndexTTS, GPT-SoVITS, ACE-Step, Stable Audio Tools and AudioCraft/MusicGen/AudioGen.
- Added comparison groups/metrics so candidates are evaluated OLD vs NEW rather than promoted by popularity.
- Added one daily learning request per enriched specialist, with central deduplication and a 12-day rotation through all 12 deep knowledge sections.
- Added professional/frontier source change watching. Changed sources become `REVALIDATION_REQUIRED`; they never overwrite accepted knowledge automatically.
- Installed a daily GitHub workflow scheduled at 04:17 UTC and a separate PROD knowledge-regression workflow.
- Full UMS foundation gate passed with the new knowledge tests included before this documentation update.

### AUTHORITY BOUNDARY
- Knowledge is present in PROD.
- Knowledge presence does not authorize tool execution, PROD writes, publication, spending, paid provider calls or automatic capability promotion.
- Operational candidates still require license/rights/security checks, physical benchmark, OLD vs NEW and tribunal review.

### EXISTENTE Y REUTILIZADO
- Existing creative render pipeline / creative job runner.
- Chromium/HTML rendering and FFmpeg composition paths.
- Existing multimedia-factory adapter catalog.
- Existing universal skill intake and learning governance.
- No second multimedia factory or duplicate FFmpeg engine created.

### SIGUE PENDIENTE
- First real scheduled daily-learning run evidence (the schedule is installed; execution is only claimed after the first scheduled run completes).
- Deep mastery remains continuous rather than declared complete.
- Physical binding/benchmark of 3D, current generative video, voice cloning, singing, lip-sync, mocap and reconstruction candidates.
- BM-01 through BM-12 remain incomplete; readiness stays 0/12.

---

## 2026-10-25 · Knowledge coverage + existing runtime reuse + BM-01 Stage 0

Environment: `PREPROD`
Base before block: `4cd2deed2f62238c5baf0e459b9ad48508592924`
Pull request: `#933`
Readiness before/after: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`
Physical benchmarks before/after: `0/12 PASS_WITH_EVIDENCE`
Additional recurring cost introduced: `0 €`

### HECHO
- Converted the 384 specialist knowledge packs from structural coverage into measurable source-backed gap evidence.
- Current verified snapshot maps at least one official source to 192 specialists / 24 departments; 192 specialists / 24 departments currently have zero verified department-level source mappings.
- Generated 48 governed research jobs, including 24 `CRITICAL` zero-source department jobs. No job can auto-promote knowledge.
- Added repository-wide media-runtime inventory excluding the UMS namespace and UMS workflows so self-references cannot fabricate prior capability evidence.
- Clean inventory found prior CEREBRO references for FFmpeg, SoX, ImageMagick, Remotion and HyperFrames; no prior tracked Blender reference was found outside UMS.
- Important existing systems discovered and preserved: `creative-output-pipeline-v1`, `creative-job-runner-v1`, `multimedia-factory-runtime-v0`, their contracts/workflows and capability registries.
- Confirmed existing creative core certification declares `CREATIVE-PROGRAMMATIC-RENDER-V1` / `CEREBRO_HTML_CHROMIUM_FFMPEG` as `PROD_GREEN`, heavy render outside Supabase and additional cost 0 € under its own evidence/authority model.
- Added `existing-creative-pipeline-adapter.mjs` to let UMS plan reuse of that existing capability in PREPROD without creating a second media runtime. UMS physical execution and UMS PROD binding remain unproven/unauthorized.
- Added BM-01 original synthetic character seed `UMS-SYNTH-CHAR-001` (`Nova-01`).
- Physically generated and hashed three distinct 512×512 reference views: FRONT, PROFILE_LEFT and THREE_QUARTER_RIGHT.
- BM-01 Stage 0 is `BM01_STAGE0_REFERENCE_GREEN`, but global BM-01 remains `NOT_RUN`; no benchmark credit or readiness mutation is granted.
- Added durable evidence snapshot: `cerebro/media-studio/v2/evidence/preprod-knowledge-runtime-bm01-stage0-2026-10-25.json`.

### BM-01 sigue pendiente
Missing for a real BM-01 pass:
- `VIDEO_IDENTITY_PROOF`.
- `THREE_D_REFERENCE_PROOF`.
- `CROSS_MODAL_CONSISTENCY_METRICS`.

### EXISTENTE Y PRESERVADO
- App Fénix, CRM, Supabase transactional core, SEO, WordPress, Training and unrelated CEREBRO engines: unchanged.
- Existing creative/multimedia pipeline: preserved and wrapped; not replaced.
- Existing universal learning scheduler: reused; no competing scheduler.
- Trading isolation: unchanged.

### Evidencia
- Knowledge/runtime inventory run `40205418621`, artifact `12603128218`, digest `sha256:9d2bbf295968a38674e8475acc39493fdf25318f3ad9af3431ef92b4ded7b5e2`.
- BM-01 Stage 0 run `40205418615`, artifact `12602998549`, digest `sha256:80acc24c9814186144eddb800b06d141aca7262ad6296f9ebf681efd514b7bc6`.
- Character bible SHA-256 `02b2be4c5560c4bb9b3f8a1dd547530b6ac4ab53413dc3fca5305a254eaeaceb`.
- FRONT SHA-256 `e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec`.
- PROFILE_LEFT SHA-256 `fd18b29d82a0de3acbd178210938c5ab021aa25fde260285f5bddd741ba0b172`.
- THREE_QUARTER_RIGHT SHA-256 `97fb7b322508f995378d7d3dfd01baa7511d91d3b78b69a05518f40a4a63b651`.

### Próximo bloque
- Physically execute the UMS wrapper against the existing creative pipeline to target BM-01 video identity evidence, without changing its underlying runtime.
- Audit the existing creative job runner contract/evidence for the exact reuse seam and rollback.
- Solve the genuine 3D gap separately; current clean repository inventory found no prior Blender implementation outside UMS.
- Map verified sources to role-level required sections; current department source density is not equivalent to expert completion.

---

## 2026-10-25 · Specialist knowledge + governed learning + physical runtime evidence

Environment: `PREPROD`
Base before block: `96c22743ac512cc3cc9e9331720cd312d6eae450`
Pull request: `#932`
Readiness before: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`
Readiness after: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`
Physical benchmarks before/after: `0/12 PASS_WITH_EVIDENCE`
Additional recurring cost introduced: `0 €`

### HECHO
- Added inherited professional knowledge-pack structure for all `384/384` specialist roles.
- Each specialist pack includes professional standards, canonical workflows, tools/models, research, case studies, benchmarks, rights/licenses, failure modes, quality metrics, cost/latency/compute, interoperability and future-watch sections.
- Specialist packs explicitly remain `STRUCTURED_RESEARCH_REQUIRED`; no pack falsely claims deep verified operational knowledge.
- Added zero-cost-first physical adapter candidate registry for FFmpeg, FFprobe, Chrome/Chromium, Blender, SoX, ImageMagick, Python and Node.js.
- Added fail-closed physical adapter evidence normalizer and tests. Discovery can only produce `PREPROD_DISCOVERED`; it cannot produce a PROD binding or operational claim.
- Added runner-native physical runtime audit with no runtime preparation, installation or network download before discovery.
- Runner-native audit evidence on 2026-10-25 found Chrome `155.0.8059.39`, Chromium `155.0.8059.0`, Python `3.12.3` and Node `22.23.3`.
- Runner-native audit did not find FFmpeg, FFprobe, Blender, SoX or ImageMagick.
- Added a zero-install, zero-external-network physical media smoke using Node -> deterministic local HTML -> Chrome headless -> PNG -> Python inspection -> Node evidence validation.
- Physical smoke produced a real 640x360 PNG, 27,817 bytes, SHA-256 `f340480860d1b6ae803092bf45e759051072fa2c22eab832e3a4544863057d33`.
- Smoke status is only `PREPROD_SMOKE_GREEN`; `benchmark_credit=false`, `prod_operational_claim=false`, `readiness_mutation=false`.
- Hardened UMS governed learning relevance. Real governed execution reduced a noisy 41-candidate media set to one deduplicated strong media candidate: `image-analysis`.
- Current governed-learning evidence: 136 safe capabilities inspected, 2 raw strong-media matches, 1 deduplicated candidate, 134 weak-media signals rejected, 0 unsafe/unproven candidates admitted, 0 auto-promotions.
- Added durable evidence snapshot at `cerebro/media-studio/v2/evidence/preprod-runtime-learning-smoke-2026-10-25.json`.
- Added operational runbook at `cerebro/media-studio/v2/RUNBOOK.md`.

### Correcciones realizadas durante PREPROD
- Fixed invalid GitHub Actions use of `${{ runner.temp }}` at job-level `env` in the UMS learning and runtime-audit workflows; replaced with fixed `/tmp` evidence paths inside the isolated runner.
- Removed `actions/setup-node` from the physical runtime discovery workflow after identifying that runtime setup would contaminate the claim of a runner-native audit.
- Tightened media relevance to reject style-only web/design skills and require either a strong media identifier/domain or a multi-group operational media description.
- Added deterministic deduplication so repeated governed versions of the same technical capability/domain retain only the newest governed evidence.

### EXISTENTE Y PRESERVADO
- App Fénix behavior: unchanged.
- CRM behavior/data contracts: unchanged.
- Supabase production behavior: unchanged.
- SEO and WordPress production behavior: unchanged.
- Training and unrelated CEREBRO engines: unchanged.
- Existing CEREBRO Universal Skill Continuous Intake scheduler: reused; no competing scheduler added.
- Trading isolation: unchanged.

### Evidencia física / CI
- Governed learning run `40204350170`, artifact `12603725051`, digest `sha256:faa2093bbe3bea25096e6cee2d69bca4b6e8df05d820e1301921d0b0238b6ed2`.
- Runner-native runtime audit run `40204350222`, artifact `12603166808`, digest `sha256:41fcfa72b3737049128821cc9afd099713532fd1da0539ff12865d7aca61d4eb`.
- Zero-cost media smoke run `40204350257`, artifact `12602704703`, digest `sha256:236c601ec11bc606b1fe7956dec03a9566711b4259f7ac5469126880a8706b99`.
- The evidence above is PREPROD evidence and does not count as any of the 12 mandatory readiness benchmark passes.

### PARCIAL
- Professional knowledge coverage is structurally complete for 384 specialists, but deep source-backed content remains to be ingested, measured and promoted through the governed learning pipeline.
- Chrome/Node/Python have a physical PREPROD smoke path but are not PROD-bound media adapters.
- `image-analysis` is only `BENCHMARK_REQUIRED`; it is not accepted UMS knowledge or a PROD capability binding.

### POR AUDITAR / PENDIENTE
- Zero-cost/self-hosted strategy for FFmpeg/FFprobe/Blender/SoX/ImageMagick or equivalent existing CEREBRO runtimes.
- Durable heavy media storage, asset/effect/voice persistence and observability implementation.
- Physical benchmark execution for BM-01 through BM-12.
- BM-03 remains impossible to execute honestly without authorized real-person voice material and valid consent/provenance/revocation/scope evidence.

### Rollback / rebuild
- Foundation rollback anchor remains `cerebro/ums-v2-safety-rollback-20261025`.
- This block is additive and isolated under `cerebro/media-studio/v2/**` plus dedicated UMS workflows.
- Rebuild sources are the versioned role factories, contracts, registries, knowledge packs, workflows, runbook and evidence snapshots; transient media artifacts are evidence/assets, not control-plane source of truth.


### 2026-11-09 · UMS001 Reels IG/FB V2 locución española / LAB
- HECHO: recuperadas 2 locuciones HeyGen ya sintetizadas (0 regeneraciones), GitHub run 42536725622 SUCCESS; export V1 y V2 con voces integradas, música con ducking, subtítulos elevados y outro corto; originales V0/V1 preservados.
- Entrega física V2: IG https://drive.google.com/file/d/18qQaGd3GHcANxkltCNCyqhxoXvMFKQd8/view (19,955 s) y FB https://drive.google.com/file/d/1XwjjfvyP6awkKAA_iwTCWVowayRLwcBF/view (22,262 s).
- Evidencia QA: https://drive.google.com/file/d/17kpRWzMhJBkA6xTQ472mt9Id5UPKjujJ/view . Gasto de nuevas generaciones 0, no publicación.
- PENDIENTE: escucha de acento es-ES, QA editorial/video en red real, derechos, QA casting y CTA medible. PROD/main intactos.


### 2026-11-09 · UMS-001 IG/FB V4 Meta safe-zone
- HECHO LAB: 2 Reels 1080×1920 19.955/22.262s, voz castellano configurada es-ES (pendiente confirmación auditiva), música original, subtítulos movidos del margen 430px al 800px mediante render desde vídeos fuente sin subtítulos. CTA fenixcapital.es/contacto/ visible en outro con título.
- GitHub runbook: `cerebro/media-studio/v2/runbooks/UMS001_IGFB_V4_META_SAFE_QA_AND_QUEUE_20261109.md`.
- V4 Drive IG https://drive.google.com/file/d/1rZhqbX6T9sXXU47x2P6dnq1-khClP0Ae/view ; FB https://drive.google.com/file/d/1yxiEgFs3rMdkQgUQF8nxg7Wp_O7Ki-AU/view ; QA https://drive.google.com/file/d/1c3F6RF4Tw9_cVndkLWRYQoDdcS7fJbox/view .
- Fichas Notion V4 creado, pendientes QA; ninguna OP antigua modificada. Fuentes y V0–V3 intactas. Sin nuevas llamadas a IA de pago, sin publicación.
- Gate posterior: acento real, derechos, claims hipotecarios, prueba en dispositivos Meta y conversión; no se promociona a PROD.


### 2026-11-09 · UMS-001 IG/FB V5.1 Kokoro Apache español
- HECHO: GitHub run 42539851459 SUCCESS, Kokoro-82M Apache 2.0 en español, 14 WAV TTS generados en LAB sin tokens/servicios de pago. Auditar acento de España todavía.
- HECHO: dos MP4 V5.1 (Instagram 19.955 s / Facebook 22.262 s) con voces Kokoro sustituyendo por completo la pista HeyGen Free, mezcla original V0, normalización −16.3 LUFS, vídeo bitstream V4 idéntico, subtítulos 800px elevados y CTA fenixcapital.es/contacto.
- Drive IG https://drive.google.com/file/d/1ejOReqRCnq_bW6IxTaFHlgmSlzKaSYic/view · FB https://drive.google.com/file/d/1RWGqTOy9nmB_wshqnEBpq9mnbVuUz1ix/view · paquete https://drive.google.com/file/d/10Xr3OF-eHLEjC9KKwTnI7fSRrdcOuuwj/view · QA https://drive.google.com/file/d/1DKXdHjbA8HZvLEjqLgYtCTZuVoG49LQj/view.
- Derechos: 4 activos V2/V4 HeyGen Free cambiados a Bloqueado en Notion, V5.1 nuevos también Bloqueados hasta verificar derechos de música/Runway, locuciones castellanas, sincronía y QA Meta. NO PUBLICAR.
- Runbook: `cerebro/media-studio/v2/runbooks/UMS001_IG_FB_V5_1_APACHE_VOICE_20261109.md`. Sin App/CRM/Supabase/WordPress/SEO/main/PROD.


### 2026-11-09 · UMS001 IG/FB V5.2 + audición es_ES de Piper
- ENTREGADO LAB: dos nuevos MP4 V5.2 reconstruidos desde fuentes originales, 7 subtítulos temporizados con voz Kokoro y 0 solapamientos, 800px de margen inferior. El stream AAC de V5.1 se ha preservado exactamente; no nuevos créditos ni suscripciones.
- Drive: Instagram https://drive.google.com/file/d/1xftL42cdrRpBEc84vF8yfox40UMirqoH/view, Facebook https://drive.google.com/file/d/1yBqtgKnQ7RobrZSG8StpKGZGyQkPplDs/view, ZIP QA+backups https://drive.google.com/file/d/1iFG5lFp2eAWdpje89aja0iKFtNbnuDF0/view.
- Audición alternativa Piper `es_ES` (0€) GH Actions run 42542341098 SUCCESS: voz masculina davefx-medium 6.525s (candidata de escucha); voz femenina mls_9972-low 31.344s (descartada por duración y licencia con atribución). Las voces de los Reels NO se modificaron.
- Notion: V5.2 IG https://app.notion.com/p/41381b1a756d810fa544e1813cf56a2d y FB https://app.notion.com/p/41381b1a756d81148ceddd39cccd0ccc; ambos Bloqueado/TEST (LAB lógico).
- Incidencia MUSIC_RIGHTS=UNKNOWN para el WAV orquestal de 44s; derechos generales de Runway/Replicate contrastados pero no bastan para acreditar banda sonora y activos de entrada. Faltan acento es_ES auditivo, claims, dispositivos Meta, y CTA/GA4. NO PUBLICAR. Main/PROD/App/CRM/Supabase/DNS intactos.


### 2026-11-09 · UMS-001 V5.3 música comercial Mixkit licencia verificada
- HECHO: segundo intento en GitHub Actions 42571395779 SUCCESS; recuperadas 2 pistas auténticas Mixkit (Ahjay Stelino, «Dreaming Big», «Driving Ambition») con licencia https://mixkit.co/license/modal/musicFree/ para posts comerciales y ads online; hashes SHA256 y autoría registrados. Sin MP3 standalone en archivos públicos.
- HECHO: renderizado nuevo IG https://drive.google.com/file/d/1P5TSDX7063y-HLRdhmLa87ORovt03vPL/view (19.955 s) y FB https://drive.google.com/file/d/1MYvF5QZo6wyx0XhQYbGL1n-hFKCD89b4/view (22.262 s), vídeos H264 sin cambios vs V5.2, voces Kokoro Apache2, pista antigua de música 44s sin derechos eliminada de estos dos derivados.
- HECHO: audio nuevo ~−15 LUFS y TP < -1.6dB, sin nuevas generaciones IA de pago ni suscripciones. Backup completo con alternativa de score local original y scripts https://drive.google.com/file/d/16F2lTs1i9U7FvbyCECm9s6pE0flgclVi/view .
- Notion IG https://app.notion.com/p/41381b1a756d81b78ad6e23f1e2149bb / FB https://app.notion.com/p/41381b1a756d8199b9e3d6ef8ff548b8 · Bloqueado para publicación hasta QA voz acento España, marcas, claims hipotecarios, inputs visuales y preview Meta real.
- Runbook `cerebro/media-studio/v2/runbooks/UMS001_V53_MIXKIT_MUSIC_COMMERCIAL_RIGHTS_AND_QA_20261109.md`; conserva todos RAW y V0–V5.2; sin main/PROD/App/CRM/Supabase/WordPress/SEO/DNS/Buffer.


### 2026-11-09 · UMS-001 voces Piper nativas es_ES female/male LAB
- GitHub Actions run 42573071257 SUCCESS: 2 nuevas muestras 6.467s y 6.351s, modelo Piper `es_ES-sharvard-medium` (speaker F=1, M=0), licencia dataset CC BY 3.0 con atribución, sin nuevas APIs de pago ni planes.
- Google Drive femenino https://drive.google.com/file/d/1xa4MHKfc-CX1AQqXbqoGkPvjKdHFkoft/view · masculino https://drive.google.com/file/d/16XWyGMdjuKd858966_H-JSbz5DW38qHF/view · manifest https://drive.google.com/file/d/1YeLCPxZ8milS5APFpv19zQMWf1kDI4kg/view .
- Las voces no están instaladas en los Reels V5.3. Aprobar por escucha real la pronunciación y calidad publicitaria antes de sustitución. Mantener `PUBLISH=false`, LAB; Runbook `cerebro/media-studio/v2/runbooks/UMS001_CASTILIAN_FEMALE_MALE_VOICE_AUDITION_20261109.md`.


### 2026-11-09 · UMS-001 V5.4 reels voz España Piper y cierre safe Meta
- LAB físico HECHO: dos vídeos V5.4 IG 19.955s y FB 22.262s con voz es_ES Piper-Sharvard (14 WAV, licencia de corpus CC BY 3.0 con atribución), banda Mixkit con permiso comercial y CTA recolocado dentro de safe-zone y=282..374. Hooks desde segundo 0 y ASS 7 frases con MarginV=800. Gasto por APIs de IA: 0 € adicional; GitHub Actions no conciliado.
- GitHub run 42574112980 SUCCESS. No se ha aprobado por audición real acento/prosodia aunque el modelo diga España. No se publican piezas.
- Drive V5.4 IG: https://drive.google.com/file/d/16MD3EPGc8Y7P_f1L29gSO-R7pdqmdyXh/view ; FB: https://drive.google.com/file/d/1tF1Ri4nJnh6T3FsRz12sNkNZwWRHRAq0/view .
- ZIP backup 27 entradas (sin pistas Mixkit standalone): https://drive.google.com/file/d/1AtoWDeaXnI_PaoikLj4fl105b46nnaFQ/view ; QA https://drive.google.com/file/d/1QzCTf5bMVW0uQnett58814IlJF2bdmhb/view .
- Notion IG https://app.notion.com/p/41381b1a756d8189aba0fbe512188144 y FB https://app.notion.com/p/41381b1a756d810691becef060e85e6e, ambos Bloqueado/TEST (LAB).
- Runbook completo `cerebro/media-studio/v2/runbooks/UMS001_IG_FB_V54_PIPER_ES_ES_NATIVE_MUSIC_LICENSED_QA_20261109.md`. Ninguna modificación de main/PROD/App/CRM/Supabase/SEO/WordPress/DNS/Buffer; V0-V5.3 intactas; rollback por archivos antiguos.
