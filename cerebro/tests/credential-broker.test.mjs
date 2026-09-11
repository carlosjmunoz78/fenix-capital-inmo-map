import test from 'node:test';import assert from 'node:assert/strict';import {resolveCredentialRef} from '../identity/credential-broker.mjs';
const base={context:{company_id:'fenix',identity_id:'id-1',account_id:'acc-1',environment:'LAB',version:'0.1.0'},credential_ref_id:'cred-1',vault_provider:'existing-vault',secret_ref:'vault://acc-1',rotation_policy:'provider-default',scopes:['read'],revoked:false,expired:false};
test('returns only credential reference metadata',()=>{const r=resolveCredentialRef(base);assert.equal(r.status,'CREDENTIAL_REF_READY');assert.equal(r.secret_material_returned,false)});
test('blocks raw secret material',()=>{assert.equal(resolveCredentialRef({...base,secret_value:'x'}).reason,'SECURITY_INCIDENT')});
test('escalates revoked credential safely',()=>{assert.equal(resolveCredentialRef({...base,revoked:true}).renewal_required,true)});
