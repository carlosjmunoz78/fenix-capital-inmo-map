# CEREBRO VISUAL SYSTEM V1

Status: ACTIVE_DESIGN / USABLE_BY_PHASE / NOT_LIVE_CONNECTED / PROD_FALSE
Date: 2026-10-11
Owner direction: accepted
Primary engine: MOTION-001
Related engines: HCI-001, VOICE-001, VOICEUI-001, FACT-001, Supervisor/Tribunal surfaces
Additional cost target: 0 EUR

## 1. Core principle

CEREBRO must become a visual operating system, not merely an animated brain.

The exterior brain is the identity layer. The internal neural world is the inspectable operational layer. Motor activity, orchestration, HUMAN_REQUIRED, learning, recovery and later replay must be represented by real or shadow telemetry rather than decorative random motion.

The brain silhouette must emerge from neuron/particle density and negative space. No explicit hard outline is canonical.

## 2. Incremental delivery rule

Each phase MUST be independently usable before the next phase exists.

A later phase wraps and extends the previous phase; it does not invalidate or replace it without OLD vs NEW, rollback and acceptance.

### Phase 0 · Static identity · usable immediately

Deliverables:
- canonical hero visual
- multi-angle reference pack
- idle / listening / processing / speaking / HUMAN_REQUIRED stills
- static fallback for reduced-motion and low-resource devices

Immediate use:
- CEREBRO Console hero/splash in shadow or PREPROD
- presentation surfaces
- engine cards / status screens
- documentation and demos

Status: ASSET FAMILY AVAILABLE / BINARY STORAGE PROMOTION PENDING.

### Phase 1 · Living visual presence

Phase 1 is now an iterative chain, not just image switching:

- V1: deterministic state-switched imagery — usable OLD/fallback.
- V2: procedural neural presence — usable prototype.
- V2.1: connected neural areas — usable prototype.
- V2.2: causal neural network — current candidate for owner visual review.

V2.2 introduces curved filaments, causal cluster activation, inter-area neural highways, foreground/background depth attenuation, node hierarchy (hub / secondary / micro), curved multi-hop pulses and afterglow.

Immediate use:
- real-time visual presence in LAB/PREPROD;
- deterministic representation of IDLE, LISTENING, PROCESSING, SPEAKING, HUMAN_REQUIRED, DEGRADED and ERROR;
- embeddable event-driven visual component without waiting for true 3D.

Status: V2.2 CODE/ARTIFACT READY / OWNER_VISUAL_ACCEPTANCE_PENDING / NOT_LIVE_CONNECTED / PROD_FALSE.

Phase 1 is NOT final until owner accepts a candidate, target-device performance is checked, reduced-motion is physically validated and OLD vs NEW preference is documented.

### Phase 2 · CEREBRO Inside / navigable atlas

Deliverables:
- exterior → interior zoom transition
- internal neural landscape
- macro functional regions
- motor-family clusters
- route visualization between clusters
- selectable region/motor detail panels

Immediate use:
- operator exploration
- explainability surface
- shadow telemetry inspection
- onboarding/demo mode

### Phase 3 · 2.5D / parallax interactive presence

Deliverables:
- depth layers
- parallax
- camera drift
- particle layers
- pulse routing
- GPU-light implementation

Immediate use:
- premium interactive visual experience before full 3D
- web/mobile capable fallback path

### Phase 4 · Procedural 3D neural volume

Deliverables:
- real 3D particle cloud
- volumetric brain density field
- primary/secondary nodes
- emissive activation masks
- camera-safe silhouette
- reusable shaders

Immediate use:
- free camera
- true interior fly-through
- multi-angle rendering
- spatial interaction

### Phase 5 · Real operational telemetry binding

Deliverables:
- visual event contract keyed by company_id, engine_id, environment, version
- live/shadow engine activation
- job transitions
- dependency routes
- bottleneck / degraded / HUMAN_REQUIRED indicators
- confidence / intensity abstraction without exposing sensitive payloads

Immediate use:
- CEREBRO Ops Map
- visual supervision
- audit and traceability
- human-by-exception visibility

### Phase 6 · Replay / forensic timeline

Deliverables:
- event timeline replay
- route reconstruction
- motor activation sequence
- failure / retry / escalation path
- OLD vs NEW comparison visualization

Immediate use:
- incident analysis
- tribunal evidence aid
- training/learning review
- operator explanation

### Phase 7 · Hologram presentation layer

Deliverables:
- translucent volumetric treatment
- depth fade
- restrained scan/interference FX
- AR/transparent render mode
- optional spatial projection presentation

Immediate use:
- premium console
- display/hologram experiments
- public/internal presentation

Rule: hologram FX must remain removable. The underlying operational visual language must stay legible without it.

## 3. Functional visual atlas

The atlas is symbolic/operational, not medical neuroanatomy.

Initial macro regions:

1. CORE / ORCHESTRATION
   - Gateway
   - Model Router
   - Event Bus
   - Engine Registry
   - central coordination

2. FACTORY / BUILD
   - FACT-001
   - scaffolding
   - contracts
   - rebuild
   - promotion mechanics

3. SUPERVISION / DECISION
   - Supervisor
   - EVA
   - JDG / Tribunal
   - policy/confidence gates
   - HUMAN_REQUIRED routing

4. COMMUNICATION / EXPERIENCE
   - HCI-001
   - VOICE-001
   - VOICEUI-001
   - MOTION-001
   - Console / Telegram / channels

5. KNOWLEDGE / LEARNING
   - Knowledge bootstrap
   - Training
   - LRN family
   - memory/knowledge graph surfaces

6. GROWTH / INTELLIGENCE
   - SEO
   - Local SEO
   - market/competitor intelligence
   - research
   - marketing intelligence

7. OPERATIONS / BUSINESS
   - CRM
   - App
   - processes
   - customer/transaction workflows

8. AUTOMATION / JOBS
   - workers
   - scheduled jobs
   - integrations
   - automation bootstrap

9. SECURITY / RESILIENCE
   - Auth
   - permissions
   - incidents
   - backup
   - rollback
   - rebuild

10. FINANCE / RISK
   - financial engines
   - money limits
   - cost controls
   - risk gates

Atlas regions are logical. Exact engine placement is versioned and may evolve without changing the visual grammar.

## 4. Visual grammar

### Base palette
- deep navy / black: inactive space
- electric blue: normal active network
- cyan: strong healthy activation / active routing
- white: high-confidence / important node / completion pulse

### Exception overlays
- amber/gold: HUMAN_REQUIRED / attention / gated decision
- red: reserved for confirmed ERROR / security critical only; never routine alert decoration

No rainbow engine coding. Normal success/operation remains inside blue/cyan/white.

### Intensity grammar
- 0–20%: dormant / background
- 20–45%: idle healthy
- 45–70%: active
- 70–90%: high work / orchestration
- 90–100%: reserved for focal completion, escalation or critical event; brief duration only

## 5. Motion grammar

IDLE:
- slow breathing
- tiny local micro-pulses
- stable silhouette

LISTENING:
- directional receptive pulses
- limited regional activation
- causal convergence toward CORE

PROCESSING:
- several regions activate in a causal sequence
- visible route propagation between clusters
- no chaotic flashing

SPEAKING:
- output-oriented rhythmic pulses
- output-side regional propagation
- voice envelope may modulate intensity after VOICE binding

HUMAN_REQUIRED:
- one clear amber focal cluster
- routes converge toward it
- calm but unmistakable

DEGRADED:
- lower density/intensity
- stable, readable fallback

ERROR:
- localized broken/fault route or red focal area
- no whole-screen panic unless true system-wide incident

LEARNING:
- replay-like pulses forming/stabilizing new pathways

RECOVERY:
- routes re-form and return progressively to blue/cyan healthy state

## 6. Visual event contract V1

Every runtime visual event must be representable without exposing raw sensitive data.

Minimum envelope:

```json
{
  "company_id": "fenix",
  "engine_id": "SEO-001",
  "environment": "PREPROD",
  "version": "v1",
  "event_type": "ENGINE_ACTIVE",
  "state": "PROCESSING",
  "intensity": 0.64,
  "region_id": "GROWTH_INTELLIGENCE",
  "route_from": "CORE_ORCHESTRATION",
  "route_to": "GROWTH_INTELLIGENCE",
  "confidence_band": "HIGH",
  "human_required_reason": null,
  "timestamp": "..."
}
```

No transcript, secret, customer PII or raw payload is required for the visual layer.

## 7. Usability before completion

The system intentionally supports partial deployment:

- Phase 0 usable with static imagery.
- Phase 1 usable as an external visual-presence prototype while V2.2 is evaluated.
- Phase 2 usable with mocked/shadow atlas telemetry.
- Phase 3 usable with 2.5D effects.
- Phase 4 adds true 3D without blocking earlier use.
- Phase 5 binds real operational telemetry only after contracts/tests.
- Phase 6/7 are additive enhancements.

No phase waits for the final hologram before delivering value.

## 8. Performance / accessibility

Mandatory:
- prefers-reduced-motion support
- static fallback
- FPS/resource budget
- no flashing patterns that create accessibility risk
- mobile/device degradation path
- no required paid rendering service

## 9. Promotion gates

Before live binding:
- asset consistency
- visual state tests
- event-contract tests
- privacy/minimization review
- performance budget
- reduced-motion validation
- OLD vs NEW
- owner acceptance
- EVA-001
- JDG-001
- rollback
- PREPROD evidence

## 10. Current real state

HECHO:
- owner-approved visual direction
- canonical seed + master registered by hash
- multi-angle family generated
- Phase 1 V1 static/state-switched fallback
- Phase 1 V2 procedural presence
- Phase 1 V2.1 neural-area connected filaments
- Phase 1 V2.2 causal neural network artifact
- V2.2 JavaScript syntax + structure gates green
- visual color discipline registered
- symbolic functional atlas defined
- visual event envelope defined

DEFINIDO:
- phase-by-phase usable architecture
- external presence → Inside → ops map → 3D → telemetry → replay → hologram
- no-fake-cognition rule for future real telemetry binding

PARCIAL:
- Phase 1 V2.2 awaits physical owner visual acceptance
- target-device performance not yet measured
- generated image binaries remain conversation artifacts / external to source Git
- no real 3D scene yet
- no live engine telemetry binding yet

PLANIFICADO NEXT:
- owner review of V2.2 organicity / causal readability / cleanliness
- tune density/glow if required
- profile mobile/desktop performance
- close Phase 1 only after acceptance gates
- then reuse the same causal neural graph as the starting point for Phase 2 CEREBRO Inside

NOT AUTHORIZED:
- PROD
- destructive UI replacement
- paid rendering dependency without explicit justification
- Trading access
