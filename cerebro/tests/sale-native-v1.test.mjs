import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeSaleNativeAction,qualifyOpportunity,buildSalesNextAction,buildSalesCadence,
  classifySalesObjection,buildDeliveryIntent,verifySaleAction,SALE_NATIVE_V1_CONTRACT
} from '../runtime/sale-native-v1.mjs';
import {planCustomerDelivery} from '../communication/com-delivery-router-v1.mjs';

const context={company_id:'fenix',engine_id:'SALE-001',environment:'PREPROD',version:'1.0.0'};
const snapshot={opportunity_ref:'opp-001',lead_ref:'lead-hot',lead_priority:.92,probability_conversion:.9,fit:.88,urgency:.91,confidence:.95,estimated_value_eur:3500};

function chain(){
  const qualification=qualifyOpportunity({context,opportunity_snapshot:snapshot});
  const action=buildSalesNextAction({context,qualification});
  const cadence=buildSalesCadence({context,action});
  const intent=buildDeliveryIntent({context,action,base_time_ms:1792195200000});
  return {qualification,action,cadence,intent};
}

test('SALE native contract is PREPROD, deterministic-first and zero-cost',()=>{
  assert.equal(SALE_NATIVE_V1_CONTRACT.owner_engine_id,'SALE-001');
  assert.equal(SALE_NATIVE_V1_CONTRACT.environment,'PREPROD');
  assert.equal(SALE_NATIVE_V1_CONTRACT.ai_required,false);
  assert.equal(SALE_NATIVE_V1_CONTRACT.additional_cost_target_eur,0);
  assert.equal(SALE_NATIVE_V1_CONTRACT.prod_authorized,false);
  assert.equal(SALE_NATIVE_V1_CONTRACT.direct_dispatch_authorized,false);
});

test('hot lead becomes deterministic CONTACT_NOW sales action',()=>{
  const {qualification,action,cadence,intent}=chain();
  assert.equal(qualification.status,'QUALIFIED');
  assert.equal(qualification.next_action,'CONTACT_NOW');
  assert.equal(action.action,'CONTACT_NOW');
  assert.equal(cadence.steps.length,3);
  assert.equal(cadence.steps[0].offset_minutes,0);
  assert.equal(cadence.dispatch_authorized,false);
  assert.equal(intent.target_engine,'COM-001');
  assert.equal(intent.dispatch_authorized,false);
  assert.equal(intent.external_side_effect_executed,false);
  assert.equal(intent.raw_contact_data_present,false);
});

test('SALE action replay is idempotent',()=>{
  const {qualification,action}=chain();
  const replay=verifySaleAction(action,qualification);
  assert.equal(replay.replay_green,true);
  assert.equal(replay.status,'REPLAY_GREEN');
  const again=chain();
  assert.equal(again.qualification.qualification_id,qualification.qualification_id);
  assert.equal(again.action.action_id,action.action_id);
  assert.equal(again.intent.delivery_intent_id,buildDeliveryIntent({context,action,base_time_ms:1792195200000}).delivery_intent_id);
});

test('cross-company opportunity is denied',()=>{
  assert.throws(()=>qualifyOpportunity({context,opportunity_snapshot:{...snapshot,company_id:'other'}}),/CROSS_COMPANY_SALE_DENIED/);
});

test('low confidence and high risk fail closed to canonical human exceptions',()=>{
  const low=qualifyOpportunity({context,opportunity_snapshot:{...snapshot,confidence:.4}});
  assert.equal(low.status,'HUMAN_REQUIRED');
  assert.equal(low.human_required,'LOW_CONFIDENCE');
  const risk=qualifyOpportunity({context,opportunity_snapshot:{...snapshot,high_risk_flag:true}});
  assert.equal(risk.status,'HUMAN_REQUIRED');
  assert.equal(risk.human_required,'HIGH_RISK');
});

test('gateway, write, spend and Trading gates remain fail-closed',()=>{
  assert.equal(authorizeSaleNativeAction({...context,operation:'QUALIFY_OPPORTUNITY'}).authorized,false);
  const write=authorizeSaleNativeAction({...context,operation:'QUALIFY_OPPORTUNITY',gateway_authorized:true,crm_write_requested:true});
  assert.equal(write.authorized,false); assert.equal(write.human_required,'HIGH_RISK');
  const spend=authorizeSaleNativeAction({...context,operation:'QUALIFY_OPPORTUNITY',gateway_authorized:true,requested_spend_eur:1});
  assert.equal(spend.authorized,false); assert.equal(spend.human_required,'MONEY_LIMIT');
  const trading=authorizeSaleNativeAction({...context,operation:'QUALIFY_OPPORTUNITY',gateway_authorized:true,trading_requested:true});
  assert.equal(trading.authorized,false); assert.equal(trading.reason,'TRADING_ISOLATION_DENIED');
});

test('objections are classified without free-text AI',()=>{
  const out=classifySalesObjection({context,lead_ref:'lead-hot',opportunity_ref:'opp-001',objection_code:'PRICE'});
  assert.equal(out.status,'CLASSIFIED');
  assert.equal(out.objection_code,'PRICE');
  assert.equal(out.recovery_action,'OBJECTION_RECOVERY');
  assert.equal(out.additional_cost_eur,0);
});

test('SALE delivery intent plugs into existing COM-001 router without dispatching',()=>{
  const {intent}=chain();
  const route=planCustomerDelivery({
    context:{company_id:'fenix',engine_id:'COM-001',environment:'PREPROD',version:'1.0.0'},
    delivery_intent:intent,
    contact_permission:'ALLOWED',
    suppressed:false,
    policy:{minute_of_day:600,quiet_start_minute:1260,quiet_end_minute:540,timezone:'Europe/Madrid'},
    channel_preferences:['WHATSAPP','PHONE'],
    channel_bindings:[{
      channel_id:'WHATSAPP',company_id:'fenix',environment:'PREPROD',status:'PREPROD_AUTHORIZED',access_profile:'CUSTOMER_OPERATIONAL',
      adapter_ref:'adapter:whatsapp:preprod',customer_scope:true,supports_actions:['CONTACT_NOW','FOLLOW_UP_FAST','FOLLOW_UP','NURTURE','OBJECTION_RECOVERY','RECOVER_NO_SHOW']
    }],
    seen_delivery_intent_ids:[]
  });
  assert.equal(route.route_status,'READY_FOR_ADAPTER_GATE');
  assert.equal(route.selected_channel,'WHATSAPP');
  assert.equal(route.dispatch_authorized,false);
  assert.equal(route.adapter_dispatch_authorized,false);
  assert.equal(route.external_side_effect_executed,false);
  assert.equal(route.additional_cost_eur,0);
});
