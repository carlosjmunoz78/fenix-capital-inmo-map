import fs from 'node:fs';

const path='supabase/functions/jarvis-orchestrator-v0/index.ts';
const src=fs.readFileSync(path,'utf8');
const required=[
  "mode:'DETERMINISTIC'",
  "model_router:'PLANIFICADO'",
  "natural_language_planning:false",
  "protected_branches:['main','emergency-pages']",
  "prod_branch_mutation:false",
  "trading_access:false",
  "additional_cost_eur:0",
  "const SAFE_BRANCH='cerebro/jarvis-work-codex-complete-20261102'",
  "'SAVE_FILE'",
  "'ROLLBACK_COMMIT'",
  "'RUN_READONLY_CHECK'",
  "'BROWSER_STATUS'",
  "'BROWSER_PROFILES'",
  "'BROWSER_HANDOFF'",
  "PROTECTED_BRANCH_DENIED",
  "TRADING_SCOPE_DENIED",
  "MONEY_OPERATION_DENIED",
  "fenix_prod_actor_context_by_auth_server",
  "jarvis-work-gateway-v1",
  "jarvis-git-gateway-v1",
  "cerebro-browser-work-total-owner-v1-prod",
];
for(const needle of required){
  if(!src.includes(needle))throw new Error(`ORCHESTRATOR_CONTRACT_MISSING:${needle}`);
}
const forbidden=[
  "intent==='BROWSER_START'",
  "intent==='BROWSER_INPUT'",
  "intent==='TRADE'",
  "target_branch:'main'",
  "target_branch:'emergency-pages'",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
];
for(const needle of forbidden){
  if(src.includes(needle))throw new Error(`ORCHESTRATOR_FORBIDDEN_SURFACE:${needle}`);
}
const humanReasons=['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];
for(const reason of humanReasons){
  if(!src.includes(reason))throw new Error(`HUMAN_REQUIRED_REASON_MISSING:${reason}`);
}
console.log(JSON.stringify({ok:true,contract:'JARVIS_ORCHESTRATOR_V0',deterministic:true,model_router:'PLANIFICADO',safe_branch_only:true,browser_mutation:false,trading_access:false,additional_cost_eur:0}));
