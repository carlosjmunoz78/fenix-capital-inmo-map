import test from 'node:test';
import assert from 'node:assert/strict';
import {assertClaims,WORKFLOW_REF,BRANCH} from '../policy.mjs';
const now=Math.floor(Date.now()/1000);
const valid={iss:'https://token.actions.githubusercontent.com',aud:'cerebro-fact001-provider-headless-lab-v1',repository:'carlosjmunoz78/fenix-capital-inmo-map',ref:BRANCH,workflow_ref:WORKFLOW_REF,event_name:'push',actor:'carlosjmunoz78',iat:now,exp:now+120};
test('restricts identity to EXACT single-use workflow and branch',()=>{assert.equal(assertClaims(valid,now).environment,'LAB');assert.match(WORKFLOW_REF,/fact001-notion-content-export-once-lab.yml/);});
test('refuses other workflow despite signed-looking claims',()=>{assert.throws(()=>assertClaims({...valid,workflow_ref:valid.workflow_ref.replace('content-export-once','headless-provider-service')},now),/OIDC_SCOPE_DENIED/);});
test('refuses PROD/main/foreign actor/replay',()=>{for(const replacement of [{ref:'refs/heads/main'},{actor:'other'},{event_name:'workflow_dispatch'},{aud:'wrong'}])assert.throws(()=>assertClaims({...valid,...replacement},now),/OIDC_SCOPE_DENIED/);assert.throws(()=>assertClaims({...valid,exp:now-1},now),/OIDC_TIME_DENIED/);});