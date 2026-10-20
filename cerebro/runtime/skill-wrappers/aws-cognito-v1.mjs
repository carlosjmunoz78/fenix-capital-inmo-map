import {createGovernedInternalWrapper} from './governed-wrapper-factory-v1.mjs';

const PIN='6edcf94159d9f46b0759d2e1b59dd545cfaca254';
const CANDIDATE='repo:be539f32206970b088329ceaf60b';

function commonSecurity(){return [
  'Use least-privilege scopes and separate application clients by trust boundary',
  'Keep client secrets out of browser and mobile public clients',
  'Validate issuer audience token use expiry and signature before trusting JWT claims',
  'Prefer standards-based OAuth/OIDC flows and PKCE for public clients',
  'Treat custom attributes groups and triggers as governed schema with migration impact',
  'Define recovery MFA abuse protection logging and revocation before production rollout'
];}

const tasks={
  AUTH_ARCHITECTURE_PLAN:({goal})=>({
    summary:`Cognito authentication architecture plan${goal?` for: ${goal}`:''}`,
    recommended_layers:['User pool / identity directory','Application clients by channel','OAuth/OIDC authorization flow','JWT verification boundary','Group/scope authorization mapping','Recovery and MFA policy','Audit and observability'],
    security_controls:commonSecurity(),
    delivery_sequence:['Model identities and trust boundaries','Define clients redirect origins and scopes','Choose authentication and recovery factors','Define token verification contract','Map groups/scopes to application RBAC','Add abuse controls and logs','Validate in isolated environment before rollout'],
    external_changes_executed:[]
  }),
  JWT_VERIFICATION_PLAN:()=>({
    summary:'Fail-closed JWT verification contract for a Cognito-backed application',
    verification_checks:['Expected issuer','Expected audience/client context','Signature against trusted key set','Token expiry and not-before semantics','Expected token use','Required scopes/claims','Subject and tenant/company mapping','Replay/session policy where applicable'],
    failure_policy:'Reject authentication or authorization when a required check cannot be proven.',
    external_changes_executed:[]
  }),
  FEDERATION_PLAN:({request,cleanStringList})=>({
    summary:'Federated identity integration plan without executing provider changes',
    identity_providers:cleanStringList(request?.options?.identity_providers,{maxItems:8,maxLength:80}),
    steps:['Confirm provider ownership and redirect domains','Define claim mapping and immutable identity key','Separate sign-in from application authorization','Handle account linking explicitly','Test logout revocation recovery and disabled-user behavior','Record data minimization and privacy implications'],
    external_changes_executed:[]
  }),
  SECURITY_REVIEW:({request,cleanStringList})=>({
    summary:'Cognito security review checklist',
    supplied_findings:cleanStringList(request?.options?.findings,{maxItems:20,maxLength:220}),
    checklist:commonSecurity(),
    additional_checks:['No privileged authorization based only on client-controlled profile fields','No cross-company claim leakage','No broad wildcard redirect URIs','No credentials or tokens committed to source control','Rate limiting / abuse monitoring is defined','Rollback and account recovery are documented'],
    verdict:'REVIEW_REQUIRED_AGAINST_REAL_CONFIGURATION',
    external_changes_executed:[]
  }),
  USER_POOL_REVIEW:({request,cleanStringList})=>({
    summary:'User-pool contract review from normalized inputs only',
    declared_attributes:cleanStringList(request?.options?.attributes,{maxItems:24,maxLength:100}),
    declared_groups:cleanStringList(request?.options?.groups,{maxItems:24,maxLength:100}),
    checks:['Attribute purpose and mutability are explicit','Authorization is not inferred from mutable profile data','Group semantics map to application policy','Recovery identifiers are controlled','PII collection is minimized','Schema changes have migration and rollback notes'],
    external_changes_executed:[]
  })
};

export const executeAwsCognitoInternalCapability=createGovernedInternalWrapper({
  wrapper_id:'skillwrap:aws-cognito-internal-v1',
  candidate_id:CANDIDATE,
  technical_name:'aws-cognito',
  source_license:'Apache-2.0',
  pinned_sha:PIN,
  default_engine:'APP-001',
  default_task:'AUTH_ARCHITECTURE_PLAN',
  tasks
});
