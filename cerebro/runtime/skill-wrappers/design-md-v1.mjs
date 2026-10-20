import {createGovernedInternalWrapper} from './governed-wrapper-factory-v1.mjs';

const PIN='6edcf94159d9f46b0759d2e1b59dd545cfaca254';
const CANDIDATE='repo:45634853e08ec0e33ec3f9cceacd';

function markdownScaffold({name,summary}){
  return `# ${name||'Design System'}\n\n## Product / brand intent\n${summary||'Define the visual and interaction intent from verified product evidence.'}\n\n## Foundations\n- Color tokens\n- Typography scale\n- Spacing scale\n- Radius and border rules\n- Elevation / shadow rules\n- Motion and reduced-motion policy\n\n## Layout\n- Containers and max widths\n- Grid / flex patterns\n- Breakpoints\n- Density rules\n\n## Components\nFor every reusable component document anatomy, variants, states, accessibility, responsive behavior and forbidden usages.\n\n## Interaction states\n- Default\n- Hover / focus-visible\n- Active\n- Disabled\n- Loading\n- Empty\n- Error\n- Success\n\n## Accessibility\nDocument contrast, keyboard navigation, semantics, touch targets and reduced motion.\n\n## Governance\nRecord owner, version, evidence source, change policy and deprecation path.\n`;
}

const tasks={
  DESIGN_SYSTEM_SCAFFOLD:({request,goal,cleanText})=>{
    const name=cleanText(request?.options?.system_name,120)||'Design System';
    const summary=cleanText(request?.design_summary,1000)||goal;
    return {
      summary:'Deterministic DESIGN.md scaffold generated from normalized internal inputs',
      generated_markdown:markdownScaffold({name,summary}),
      required_evidence:['Approved brand assets or explicit provisional status','Representative screens/components','Typography and color sources','Responsive behavior evidence','Accessibility constraints'],
      confidence_note:summary?'STRUCTURE_READY_INPUT_EVIDENCE_PARTIAL':'STRUCTURE_ONLY_NO_DESIGN_EVIDENCE',
      external_changes_executed:[]
    };
  },
  TOKEN_NORMALIZATION_PLAN:({request,cleanStringList})=>({
    summary:'Plan to normalize visual decisions into reusable design tokens',
    declared_tokens:cleanStringList(request?.options?.tokens,{maxItems:40,maxLength:180}),
    token_groups:['color','typography','space','size','radius','border','shadow','motion','z-index'],
    rules:['Prefer semantic tokens over page-specific values','Preserve raw primitives separately from semantic aliases','Record light/dark/high-contrast variants explicitly','Avoid duplicate tokens with equivalent meaning','Version breaking changes and keep migration notes'],
    external_changes_executed:[]
  }),
  RESPONSIVE_RULES:({request,cleanStringList})=>({
    summary:'Responsive design documentation plan',
    observed_breakpoints:cleanStringList(request?.options?.breakpoints,{maxItems:12,maxLength:80}),
    checks:['Document behavior rather than device names','Define container and content width changes','Define navigation collapse/expansion','Define table/card overflow strategy','Define typography and spacing changes','Verify touch targets and keyboard order','Record component-specific exceptions'],
    external_changes_executed:[]
  }),
  COMPONENT_STYLE_GUIDE:({request,cleanStringList})=>({
    summary:'Reusable component documentation plan',
    components:cleanStringList(request?.options?.components,{maxItems:40,maxLength:100}),
    per_component_contract:['Purpose','Anatomy','Variants','States','Content rules','Responsive behavior','Accessibility','Do / do not','Token dependencies'],
    external_changes_executed:[]
  }),
  DESIGN_SYSTEM_REVIEW:({request,cleanStringList})=>({
    summary:'Design-system review checklist',
    declared_findings:cleanStringList(request?.options?.findings,{maxItems:30,maxLength:220}),
    review_axes:['Consistency','Reuse','Accessibility','Responsive behavior','State coverage','Token discipline','Brand alignment','Implementation traceability','Versioning / deprecation'],
    verdict:'REVIEW_REQUIRES_REAL_SCREEN_OR_TOKEN_EVIDENCE',
    external_changes_executed:[]
  })
};

export const executeDesignMdInternalCapability=createGovernedInternalWrapper({
  wrapper_id:'skillwrap:design-md-internal-v1',
  candidate_id:CANDIDATE,
  technical_name:'design-md',
  source_license:'MIT',
  pinned_sha:PIN,
  default_engine:'ARCH-001',
  default_task:'DESIGN_SYSTEM_SCAFFOLD',
  tasks
});
