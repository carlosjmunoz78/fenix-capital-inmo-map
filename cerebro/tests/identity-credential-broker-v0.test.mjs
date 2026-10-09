import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  IDENTITY_CREDENTIAL_BROKER_V0_CONTRACT,
  connectorAuthDecision,
  credentialReferenceDecision,
  identityCredentialAuditSummary,
  loadIdentityCredentialFoundation
} from '../governance/identity-credential-broker.mjs';

const foundation=loadIdentityCredentialFoundation();

test('IAM-001 foundation loads registries and never grants business authority',()=>{
  assert.equal(foundation.identity.engine_id,'IAM-001');
  assert.equal(foundation.credentials.engine_id,'IAM-001');
  assert.equal(foundation.connectors.engine_id,'IAM-001');
  assert.equal(foundation.prod_authorized,false);
  assert.equal(foundation.prod_write_authorized,false);
  assert.equal(foundation.trading_access,false);
  assert.equal(foundation.multicompany_continuation,false);
  assert.equal(foundation.additional_cost_eur,0);
  assert.ok(foundation.identity_count>=7);
  assert.ok(foundation.credential_ref_count>=9);
  assert.ok(foundation.connector_count>=7);
});

test('known GitHub ephemeral token resolves as metadata only',()=>{
  const d=credentialReferenceDecision({credential_ref_id:'credref:github-actions-token',consumer:'github-actions-workflows',environment:'PREPROD',foundation});
  assert.equal(d.ok,true);
  assert.equal(d.decision,'REFERENCE_REGISTERED');
  assert.equal(d.secret_store,'GITHUB_ACTIONS_JOB_TOKEN');
  assert.equal(d.symbolic_name,'github.token');
  assert.equal(d.secret_value_returned,false);
  assert.equal(d.value_may_be_persisted,false);
  assert.equal(d.value_may_be_logged,false);
});

test('E2E user JWT is registered but lifecycle gap remains explicit',()=>{
  const d=credentialReferenceDecision({credential_ref_id:'credref:cerebro-e2e-user-jwt',consumer:'session-context-auth-e2e',environment:'PROD_READONLY_E2E',foundation});
  assert.equal(d.ok,true);
  assert.equal(d.decision,'REFERENCE_REGISTERED_LIFECYCLE_PARTIAL');
  assert.equal(d.lifecycle_audit_required,true);
  assert.equal(d.secret_value_returned,false);
});

test('unknown reference, wrong consumer and wrong environment fail closed',()=>{
  assert.equal(credentialReferenceDecision({credential_ref_id:'credref:missing',consumer:'x',environment:'LAB',foundation}).decision,'DENY_UNREGISTERED_CREDENTIAL_REFERENCE');
  assert.equal(credentialReferenceDecision({credential_ref_id:'credref:cerebro-gemini-api-key',consumer:'prod-live-deploy',environment:'LAB',foundation}).decision,'DENY_CONSUMER_SCOPE_MISMATCH');
  assert.equal(credentialReferenceDecision({credential_ref_id:'credref:cerebro-gemini-api-key',consumer:'skill-agent-browser-behavioral-lab',environment:'PROD',foundation}).decision,'DENY_ENVIRONMENT_SCOPE_MISMATCH');
});

test('real browser execution stays HOLD until a real profile/session binding is audited',()=>{
  const d=connectorAuthDecision({connector_id:'connector:agent-browser-candidate',environment:'PREPROD',foundation});
  assert.equal(d.ok,false);
  assert.equal(d.decision,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(d.browser_fallback,true);
  assert.equal(d.prod_authorized,false);
});

test('official/API connectors resolve metadata but not credentials',()=>{
  const gh=connectorAuthDecision({connector_id:'connector:github-actions',environment:'PREPROD',foundation});
  assert.equal(gh.ok,true);
  assert.equal(gh.integration_class,'OFFICIAL_INTEGRATION');
  assert.equal(gh.secret_values_returned,false);
  const sb=connectorAuthDecision({connector_id:'connector:supabase-prod-readonly-e2e',environment:'PROD_READONLY_E2E',foundation});
  assert.equal(sb.ok,true);
  assert.deepEqual(sb.credential_ref_ids,['credref:prod-supabase-publishable-key','credref:cerebro-e2e-user-jwt']);
  assert.equal(sb.secret_values_returned,false);
});

test('audit summary preserves 0 EUR strategy and surfaces lifecycle/session gaps',()=>{
  const s=identityCredentialAuditSummary({foundation});
  assert.equal(s.status,'IAM_FOUNDATION_AUDITED_FAIL_CLOSED');
  assert.equal(s.new_paid_vault_required,false);
  assert.equal(s.storage_strategy,'REUSE_EXISTING_PROVIDER_OR_GITHUB_SECRET_STORES');
  assert.ok(s.lifecycle_partial_ref_ids.includes('credref:cerebro-e2e-user-jwt'));
  assert.equal(s.browser_real_binding_state,'POR_AUDITAR_REAL_PROFILE_SESSION_BINDING');
  assert.equal(s.next_gate,'IAM001_LIFECYCLE_AND_REAL_SESSION_BINDING_V0');
});

test('connector preference order follows official/MCP/API/script/browser/factory policy',()=>{
  assert.deepEqual(foundation.connectors.preference_order,[
    'OFFICIAL_INTEGRATION','AUTHORIZED_MCP','API_OR_WEBHOOK','SCRIPT_CLI_OSS','BROWSER_COMPUTER_USE','FACT001_BUILD_CONNECTOR'
  ]);
  assert.equal(foundation.connectors.invariants.captcha_bypass_allowed,false);
  assert.equal(foundation.connectors.invariants.mfa_bypass_allowed,false);
  assert.equal(IDENTITY_CREDENTIAL_BROKER_V0_CONTRACT.browser_is_fallback_only,true);
  assert.equal(IDENTITY_CREDENTIAL_BROKER_V0_CONTRACT.new_paid_vault_required,false);
});

test('registry loader rejects a raw secret-value field even when other metadata looks valid',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iam-v0-'));
  const identityPath=path.join(dir,'identity.json');
  const credentialPath=path.join(dir,'credential.json');
  const connectorPath=path.join(dir,'connector.json');
  fs.writeFileSync(identityPath,JSON.stringify(foundation.identity));
  fs.writeFileSync(connectorPath,JSON.stringify(foundation.connectors));
  fs.writeFileSync(credentialPath,JSON.stringify({...foundation.credentials,references:[...foundation.credentials.references,{credential_ref_id:'credref:bad',provider:'x',secret_store:'x',symbolic_name:'X',credential_class:'X',allowed_environments:['LAB'],allowed_consumers:['x'],value:'do-not-store-me'}]}));
  assert.throws(()=>loadIdentityCredentialFoundation({identity_registry_path:identityPath,credential_registry_path:credentialPath,connector_registry_path:connectorPath}),/forbidden secret-value field/);
  fs.rmSync(dir,{recursive:true,force:true});
});
