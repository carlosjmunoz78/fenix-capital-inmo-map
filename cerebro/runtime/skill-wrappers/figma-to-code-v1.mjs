import {createGovernedInternalWrapper} from './governed-wrapper-factory-v1.mjs';

const PIN='6edcf94159d9f46b0759d2e1b59dd545cfaca254';
const CANDIDATE='repo:92207779a87a5dd5282b5b69b099';

function evidenceWarning(request){
  const hasSummary=typeof request?.design_summary==='string'&&request.design_summary.trim().length>0;
  return hasSummary?'NORMALIZED_DESIGN_SUMMARY_PRESENT_NO_LIVE_FIGMA_ACCESS':'NO_NORMALIZED_DESIGN_EVIDENCE_STRUCTURAL_PLAN_ONLY';
}

const tasks={
  COMPONENT_TREE_PLAN:({request,cleanText})=>({
    summary:'Plan a maintainable component tree from normalized design information',
    design_summary:cleanText(request?.design_summary,1200),
    decomposition_order:['Page shell and route boundary','Global layout primitives','Repeated sections and patterns','Interactive controls and state owners','Content-only leaf components','Shared tokens and icons/assets'],
    rules:['Prefer semantic product boundaries over arbitrary design-frame nesting','Do not create a component for every visual layer','Keep data/state ownership explicit','Reuse existing project components before introducing duplicates','Preserve accessibility semantics independently of visual grouping'],
    evidence_status:evidenceWarning(request),
    external_changes_executed:[]
  }),
  DESIGN_TOKEN_EXTRACTION_PLAN:({request,cleanText})=>({
    summary:'Design-token extraction plan without connecting to Figma or external APIs',
    design_summary:cleanText(request?.design_summary,1200),
    extraction_groups:['Color primitives and semantic roles','Typography family/weight/size/line-height','Spacing and sizing scale','Radius/border/shadow','Layout/grid/container rules','Motion and interaction timing'],
    normalization_rules:['Deduplicate equivalent values','Separate primitive values from semantic aliases','Preserve component-local exceptions only when justified','Record source evidence and uncertainty','Map tokens to existing codebase conventions before introducing new names'],
    evidence_status:evidenceWarning(request),
    external_changes_executed:[]
  }),
  RESPONSIVE_IMPLEMENTATION_PLAN:({request,cleanText})=>({
    summary:'Responsive implementation plan from normalized design evidence',
    design_summary:cleanText(request?.design_summary,1200),
    steps:['Identify intrinsic content constraints before breakpoints','Model container widths and wrapping behavior','Map navigation transformations','Define image/media cropping rules','Define component-specific reflow','Verify keyboard and reading order','Compare representative viewport captures before declaring visual parity'],
    evidence_status:evidenceWarning(request),
    external_changes_executed:[]
  }),
  ACCESSIBILITY_REVIEW:({request,cleanText})=>({
    summary:'Accessibility review plan for design-to-code implementation',
    design_summary:cleanText(request?.design_summary,1200),
    checklist:['Semantic landmarks and heading order','Keyboard operation and focus visibility','Accessible names/descriptions','Contrast and non-color state cues','Touch target sizing','Form labels errors and status messaging','Reduced-motion behavior','Responsive zoom/reflow','Screen-reader reading order'],
    verdict:'REQUIRES_REAL_IMPLEMENTATION_AND_RENDER_EVIDENCE',
    evidence_status:evidenceWarning(request),
    external_changes_executed:[]
  }),
  CODE_SCAFFOLD:({request,cleanText})=>({
    summary:'Framework-neutral implementation scaffold; not a pixel-perfect claim',
    design_summary:cleanText(request?.design_summary,1200),
    generated_scaffold:`Page\n├─ AppShell\n│  ├─ Header\n│  └─ Main\n│     ├─ Section[]\n│     │  ├─ SectionHeading\n│     │  └─ ContentPattern[]\n│     └─ FeedbackStates\n└─ Footer\n\nTokens → layout primitives → components → route composition → visual/E2E comparison`,
    verification_gate:['Real design metadata or approved screenshots available','Existing UI primitives inventoried','Rendered implementation captured at representative viewports','Visual differences reviewed','Accessibility checks pass','No external side effects were required for this scaffold'],
    evidence_status:evidenceWarning(request),
    external_changes_executed:[]
  })
};

export const executeFigmaToCodeInternalCapability=createGovernedInternalWrapper({
  wrapper_id:'skillwrap:figma-to-code-internal-v1',
  candidate_id:CANDIDATE,
  technical_name:'figma-to-code',
  source_license:'Apache-2.0',
  pinned_sha:PIN,
  default_engine:'APP-001',
  default_task:'COMPONENT_TREE_PLAN',
  tasks
});
