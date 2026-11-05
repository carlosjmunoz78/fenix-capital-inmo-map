import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUniversalDeviceEnvelopeV2,
  authorizeUniversalDeviceEnvelopeV2,
  claimUniversalDeviceEnvelopeV2
} from '../runtime/universal-device-command-envelope-v2.mjs';
import {
  buildOwnerHealthCanaryRow,
  PC001_HEALTH_CANARY_V0,
  validateLivePc001Device
} from '../../supabase/functions/cerebro-pc001-health-issuer-preprod-v1/core.mjs';

const owner='11111111-1111-4111-8111-111111111111';
const req='22222222-2222-4222-8222-222222222222';
const now=new Date('2026-11-05T13:00:00.000Z');
const opts={now:now.toISOString(),identity:{canonical_device_id:PC001_HEALTH_CANARY_V0.device_id},expected_company_id:'fenix'};
const copy=x=>structuredClone(x);

async function row(){return buildOwnerHealthCanaryRow({request_id:req,auth_user_id:owner,now});}

test('real V2 validator accepts issuer row under exact canonical scope',async()=>{
 const c=await row();
 const checked=validateUniversalDeviceEnvelopeV2(c.payload,{now:now.toISOString()});
 assert.equal(checked.ok,true,checked.errors.join(','));
 assert.equal(authorizeUniversalDeviceEnvelopeV2(c.payload,opts).decision,'AUTHORIZED_PREPROD');
 assert.equal(claimUniversalDeviceEnvelopeV2(c.payload,new Map(),opts).decision,'CLAIMED');
});

test('real V2 validator forbids promotion to PROD',async()=>{
 const c=await row(); c.payload.environment='PROD';
 assert.equal(validateUniversalDeviceEnvelopeV2(c.payload,{now:now.toISOString()}).ok,false);
 assert.equal(authorizeUniversalDeviceEnvelopeV2(c.payload,opts).decision,'HOLD');
});

test('real V2 rejects policy wildcard and raw secrets',async()=>{
 const c=await row();
 c.payload.policy.allowed_actions=['*'];
 assert.equal(validateUniversalDeviceEnvelopeV2(c.payload,{now:now.toISOString()}).ok,false);
 const c2=await row(); c2.payload.access_token='must-not-be-accepted';
 assert.equal(validateUniversalDeviceEnvelopeV2(c2.payload,{now:now.toISOString()}).ok,false);
});

test('real V2 prevents wrong device and wrong company',async()=>{
 const c=await row();
 const wrongDevice={...opts,identity:{canonical_device_id:'other-device'}};
 assert.equal(authorizeUniversalDeviceEnvelopeV2(c.payload,wrongDevice).decision,'HOLD');
 const wrongCompany={...opts,expected_company_id:'other-company'};
 assert.equal(authorizeUniversalDeviceEnvelopeV2(c.payload,wrongCompany).decision,'HOLD');
});

test('real V2 replay detection blocks repeated request id',async()=>{
 const c=await row();const ledger=new Map();
 assert.equal(claimUniversalDeviceEnvelopeV2(c.payload,ledger,opts).decision,'CLAIMED');
 assert.equal(claimUniversalDeviceEnvelopeV2(c.payload,ledger,opts).decision,'HOLD');
});

test('device proof requires real recent heartbeat and null revocation',()=>{
 const d={device_id:PC001_HEALTH_CANARY_V0.device_id,company_id:'fenix',environment:'PREPROD',version:'pc001-windows-v1',status:'ONLINE',revoked_at:null,last_seen_at:now.toISOString()};
 assert.equal(validateLivePc001Device(d,now).ok,true);
 assert.equal(validateLivePc001Device({...d,last_seen_at:null},now).ok,false);
 assert.equal(validateLivePc001Device({...d,revoked_at:'2026-11-05T12:00:00Z'},now).ok,false);
});