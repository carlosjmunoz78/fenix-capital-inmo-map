# CEREBRO · Shared Creative Capabilities V1

Status: `PREPROD_SHARED_ROUTING_DEFINED`

## Objective

Make design, Canva, image generation, video generation, video editing, voice and media composition reusable CEREBRO capabilities instead of rebuilding them per social network, SEO workflow, website, app or marketing process.

## Ownership

- Owner engine: `FACT-001`
- Shared multimedia capability: `DIGITAL-BUILD-MULTIMEDIA`
- Canva design route: official `CANVA_REMOTE_MCP` once the one-time OAuth/provider grant is valid
- New canonical engine: **not required**

## Consumer rule

Any registered CEREBRO engine may request these capabilities when:

1. `company_id` matches the target company;
2. environment and permissions allow the request;
3. the request passes policy/risk/cost gates;
4. the creative task does not implicitly grant publication, spending or legal authority.

Initial consumer families include Social Networks, SEO, Marketing, Web Factory, App Factory, Email, Documents, Sales, Training and Customer Communication.

## Shared tasks

### Canva / design

- social post design
- carousel design
- story design
- reel cover
- thumbnail
- SEO infographic
- blog visual
- landing visual
- email visual
- document/presentation visual
- advertising creative

### Multimedia Factory

- image generation
- voice synthesis
- video generation
- video editing
- video understanding
- deterministic media composition
- explainer video
- visual workflows

The existing Multimedia Factory remains the implementation seam for these tasks. It already catalogs ComfyUI, image generation, Qwen3 TTS, HyperFrames, Procedural Film, OpenMontage, LTX Video, WATCH and FFmpeg routes at their current maturity level.

## Non-negotiable separation

Creating a creative asset **never** means publishing it.

`CREATE/EDIT/EXPORT` and `PUBLISH/SEND/SPEND` are separate authorities. Social/SEO/Marketing consumers retain their own provider gates, policy gates, idempotency and audit trail.

## Cost policy

Target additional cost: `0 EUR`.

Use deterministic/open-source/local or already-contracted capabilities first. A new purchase, subscription or paid API requires `MONEY_LIMIT` before execution.

## Canva status

Canva is a shared provider route, not a Facebook-only tool. The official MCP/OAuth route remains pending the initial valid provider grant. Anti-bot, CAPTCHA or MFA controls must not be bypassed.

## Promotion rule

This V1 is PREPROD routing/governance. Before replacing any existing channel-specific workflow:

`CURRENT PATH -> SHARED CREATIVE PATH -> TEST -> OLD vs NEW -> QA -> ROLLBACK VERIFIED -> GRADUAL PROMOTION`

Existing Buffer/Make/native/social paths remain available until physical parity is demonstrated.
