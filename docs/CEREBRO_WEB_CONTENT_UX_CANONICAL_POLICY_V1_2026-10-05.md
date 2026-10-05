# CEREBRO Web Content & UX Canonical Policy V1

Date: 2026-10-05
Scope: Fénix Capital staging and future PROD promotion
Status: DEFINED / MANDATORY

## Purpose
No URL is GREEN merely because it renders or passes technical smoke tests. Every business URL must pass editorial depth, FAQ, form UX, link integrity, audience segmentation, visual QA, responsive QA and rollback requirements.

## Global requirements
- Applies to every URL: new landings, historical pages, posts, guides, cities, profiles, tools, `quienes-somos`, home, B2C and B2B pages.
- Content must be sufficient for the search/conversion intent, without filler or repeated generic blocks. Word count is measured but there is no universal word minimum that justifies artificial text.
- Main commercial/informational URLs require at least 8 useful FAQs unless the format is genuinely not applicable (e.g. legal pages).
- FAQ design and interaction must be homogeneous sitewide.
- Default conversion pattern: CTA/button opens the form in an accessible responsive modal/drawer/overlay. A form must not remain permanently pasted into the page unless a documented UX exception exists.
- Legacy/duplicate forms may be removed only after inventory, backup, new-form E2E, rollback and verification.
- Every visible link/button must have a real verified destination. Empty hrefs, broken anchors, blank CTAs and non-functional links are release blockers.
- Internal links must read naturally inside the content. Avoid artificial `Tools`, `Resources` or equivalent blocks when they break reading flow.

## Audience segmentation
Every URL must be classified as one of: `PARTICULAR`, `INMOBILIARIA`, `MIXTA_CONTROLADA`, `LEGAL`, `CORPORATIVA`.

### PARTICULAR
- No B2B real-estate-agency tools, funnels or agency landing destinations inside the customer journey.
- It is allowed to explain contextually that Fénix Capital can coordinate with the customer's real-estate agency when relevant.
- CTAs and next steps remain B2C.

### INMOBILIARIA
- Dedicated B2B landings, process, capture, resources and CTAs are required.
- B2B and B2C funnels must not be mixed.

### MIXTA_CONTROLADA
- Allowed only with explicit dual-audience justification and clearly segmented CTAs.

## Visual system
- Sitewide coherence is mandatory for typography, spacing, buttons, cards, FAQ, modal/form patterns, links, hover/focus states, responsive behavior and accessibility.
- Homogeneity does not mean duplication: composition must adapt to each page intent.
- Every block/image/space must have a reason to exist. No decorative or empty blocks by inertia.
- Validate desktop, tablet and mobile before PROD.

## Acceptance contract per URL
A URL can be GREEN only when all applicable checks pass:
1. intent + audience classification;
2. sufficient useful content, no filler;
3. >= 8 FAQs where applicable;
4. CTA-to-form open/fill/close/submit E2E;
5. no visible legacy/duplicate form;
6. no empty/broken links;
7. natural audience-correct internal linking;
8. visual QA desktop/tablet/mobile;
9. SEO technical QA (title, meta, H1, schema, canonical/noindex per env);
10. images/alt QA;
11. no WPVibe or Hostinger Reach dependency;
12. backup/rollback before destructive change.

## Defect taxonomy
`CONTENT_DEPTH`, `FAQ_COUNT`, `FORM_UX`, `LEGACY_FORM`, `BROKEN_LINK`, `EMPTY_LINK`, `AUDIENCE_MISMATCH`, `VISUAL_QUALITY`, `MOBILE_UX`, `INTERNAL_LINK_FLOW`, `SEO_TECHNICAL`.

## Release rule
All previous GREEN results that did not evaluate this contract are PARCIAL until revalidated. PROD remains blocked while blocking defects exist on business URLs.

## Execution rule
CONSERVE -> UNDERSTAND -> INVENTORY -> BACKUP -> PARALLEL FIX -> QA -> OLD vs NEW -> TESTED ROLLBACK -> PROMOTION.

The new Home is polished only after the global landing/component system is stable and must conform to this policy before any PROD switch.
