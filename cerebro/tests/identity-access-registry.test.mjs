import test from 'node:test';import assert from 'node:assert/strict';import {registerIdentityAccount} from '../identity/identity-access-registry.mjs';
const base={context:{company_id:'fenix',environment:'LAB',version:'0.1.0'},identity_id:'id-1',account_id:'acc-1',owner_type:'company',owner_id:'fenix',provider:'linkedin',login_method:'oauth',status:'ACTIVE'};
test('registers identity/account metadata without secrets',()=>{const r=registerIdentityAccount(base);assert.equal(r.status,'REGISTERED');assert.equal(r.secret_stored,false)});
test('blocks secret payload in registry',()=>{assert.equal(registerIdentityAccount({...base,secret_value:'x'}).reason,'SECURITY_INCIDENT')});
test('rejects unknown login method',()=>{assert.throws(()=>registerIdentityAccount({...base,login_method:'magic_unknown'}))});
