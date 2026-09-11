import test from 'node:test';import assert from 'node:assert/strict';import {discoverSessionMetadata} from '../identity/session-discovery.mjs';
const base={context:{company_id:'fenix',identity_id:'id-1',account_id:'acc-1',environment:'LAB',version:'0.1.0'},provider:'linkedin',login_method:'oauth',session_status:'ACTIVE'};
test('records session metadata without secrets',()=>{const r=discoverSessionMetadata(base);assert.equal(r.status,'SESSION_METADATA_READY');assert.equal(r.secret_material,false)});
test('requires renewal for expired session',()=>{const r=discoverSessionMetadata({...base,session_status:'EXPIRED'});assert.equal(r.renewal_or_fallback_required,true)});
test('blocks secret payload',()=>{assert.equal(discoverSessionMetadata({...base,token_value:'x'}).reason,'SECURITY_INCIDENT')});
