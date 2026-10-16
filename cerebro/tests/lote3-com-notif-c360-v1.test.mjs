import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSaleProducerBundle} from '../runtime/sale-real-consumer-adoption-v1.mjs';
import {planCustomerDelivery} from '../communication/com-delivery-router-v1.mjs';
import {planNotifications,NOTIF_NATIVE_V1_CONTRACT} from '../communication/notif-native-v1.mjs';
import {buildCustomer360Projection,compareCustomer360Projection,C360_NATIVE_V1_CONTRACT} from '../customer/c360-native-v1.mjs';

const sale=()=>buildSaleProducerBundle({company_id:'fenix',base_time_ms:1792195200000});
function route(bundle){return planCustomerDelivery({context:{company_id:'fenix',engine_id:'COM-001',environment:'PREPROD',version:'1.0.0'},delivery_intent:bundle.native.delivery_intent,contact_permission:'ALLOWED',suppressed:false,policy:{minute_of_day:600,quiet_start_minute:1260,quiet_end_minute:540,timezone:'Europe/Madrid'},channel_preferences:['WHATSAPP','PHONE'],channel_bindings:[{channel_id:'WHATSAPP',company_id:'fenix',environment:'PREPROD',status:'PREPROD_AUTHORIZED',access_profile:'CUSTOMER_OPERATIONAL',adapter_ref:'adapter:whatsapp:preprod',customer_scope:true,supports_actions:['CONTACT_NOW','FOLLOW_UP_FAST','FOLLOW_UP','NURTURE','OBJECTION_RECOVERY','RECOVER_NO_SHOW']}],seen_delivery_intent_ids:[]});}
function notif(bundle){return planNotifications({context:{company_id:'fenix',engine_id:'NOTIF-001',environment:'PREPROD',version:'1.0.0'},candidates:[{notification_key:`sale:${bundle.native.action.action_id}`,source_engine:'SALE-001',subject_ref:bundle.semantic_profile.lead_ref,category:'SALES_ACTION',priority:'P1',human_required:null,due_at_ms:bundle.native.delivery_intent.due_at_ms,requires_attention:true}],policy:{minute_of_day:600,quiet_start_minute:1260,quiet_end_minute:540,digest_hour:8,max_digest_items:50},seen_notification_keys:[]});}

test('NOTIF and C360 contracts are deterministic PREPROD zero-cost and read-only',()=>{
  assert.equal(NOTIF_NATIVE_V1_CONTRACT.engine_id,'NOTIF-001');assert.equal(NOTIF_NATIVE_V1_CONTRACT.direct_dispatch_authorized,false);assert.equal(NOTIF_NATIVE_V1_CONTRACT.additional_cost_target_eur,0);
  assert.equal(C360_NATIVE_V1_CONTRACT.engine_id,'C360-001');assert.equal(C360_NATIVE_V1_CONTRACT.read_only,true);assert.equal(C360_NATIVE_V1_CONTRACT.source_of_truth_replacement,false);assert.equal(C360_NATIVE_V1_CONTRACT.additional_cost_target_eur,0);
});

test('SALE -> existing COM -> NOTIF -> C360 creates a semantic read-only chain',()=>{
  const b=sale(),r=route(b),n=notif(b);
  assert.equal(r.route_status,'READY_FOR_ADAPTER_GATE');assert.equal(r.adapter_dispatch_authorized,false);assert.equal(r.external_side_effect_executed,false);
  assert.equal(n.summary.immediate,1);assert.equal(n.operator_interrupt_required,false);assert.equal(n.dispatch_authorized,false);
  const p=buildCustomer360Projection({context:{company_id:'fenix',engine_id:'C360-001',environment:'PREPROD',version:'1.0.0'},lead_signal:{lead_ref:b.semantic_profile.lead_ref,lead_priority:b.semantic_profile.lead_priority,probability_conversion:b.semantic_profile.probability_conversion,confidence:b.semantic_profile.confidence,estimated_value_eur:b.semantic_profile.estimated_value_eur},sale_signal:{lead_ref:b.semantic_profile.lead_ref,opportunity_ref:b.semantic_profile.opportunity_ref,lead_priority:b.semantic_profile.lead_priority,probability_conversion:b.semantic_profile.probability_conversion,confidence:b.semantic_profile.confidence,estimated_value_eur:b.semantic_profile.estimated_value_eur,next_action:b.semantic_profile.next_action},communication_signal:{route_status:r.route_status,selected_channel:r.selected_channel},notification_signal:{notification_mode:n.decisions[0].mode,human_required:n.decisions[0].human_required}});
  assert.equal(p.lifecycle_stage,'ACTIVE_SALES');assert.equal(p.next_best_action,'CONTACT_NOW');assert.equal(p.communication.ready,true);assert.equal(p.read_only,true);assert.equal(p.crm_write_authorized,false);assert.equal(p.prod_authorized,false);
  assert.equal(compareCustomer360Projection(p,p).replay_green,true);
});

test('NOTIF groups nonurgent work and defers it during quiet hours',()=>{
  const digest=planNotifications({context:{company_id:'fenix',engine_id:'NOTIF-001',environment:'PREPROD',version:'1'},candidates:[{notification_key:'k1',source_engine:'C360-001',subject_ref:'lead1',category:'FOLLOWUP',priority:'P2',human_required:null,due_at_ms:1,requires_attention:false}],policy:{minute_of_day:600,quiet_start_minute:1260,quiet_end_minute:540,digest_hour:8,max_digest_items:50},seen_notification_keys:[]});
  assert.equal(digest.summary.digest,1);assert.equal(digest.decisions[0].mode,'DIGEST');
  const quiet=planNotifications({context:{company_id:'fenix',engine_id:'NOTIF-001',environment:'PREPROD',version:'1'},candidates:[{notification_key:'k2',source_engine:'C360-001',subject_ref:'lead1',category:'FOLLOWUP',priority:'P2',human_required:null,due_at_ms:1,requires_attention:false}],policy:{minute_of_day:1320,quiet_start_minute:1260,quiet_end_minute:540,digest_hour:8,max_digest_items:50},seen_notification_keys:[]});
  assert.equal(quiet.decisions[0].mode,'DEFERRED_QUIET_HOURS');assert.ok(quiet.decisions[0].deferred_minutes>0);
});

test('NOTIF escalates only canonical human exceptions and never dispatches',()=>{
  const h=planNotifications({context:{company_id:'fenix',engine_id:'NOTIF-001',environment:'PREPROD',version:'1'},candidates:[{notification_key:'k3',source_engine:'POL-001',subject_ref:'apr:1',category:'HUMAN_REQUIRED',priority:'P2',human_required:'POLICY_CONFLICT',due_at_ms:1,requires_attention:true}],policy:{minute_of_day:1320,quiet_start_minute:1260,quiet_end_minute:540,digest_hour:8,max_digest_items:50},seen_notification_keys:[]});
  assert.equal(h.decisions[0].mode,'IMMEDIATE_OPERATOR');assert.equal(h.operator_interrupt_required,true);assert.equal(h.dispatch_authorized,false);assert.equal(h.external_side_effect_executed,false);
});

test('cross-company and raw PII inputs fail closed',()=>{
  assert.throws(()=>planNotifications({context:{company_id:'fenix',engine_id:'NOTIF-001',environment:'PREPROD',version:'1'},candidates:[{notification_key:'x',company_id:'other',source_engine:'SALE-001',subject_ref:'r',category:'X',priority:'P2',due_at_ms:1,requires_attention:false}]}),/CROSS_COMPANY/);
  assert.throws(()=>buildCustomer360Projection({context:{company_id:'fenix',engine_id:'C360-001',environment:'PREPROD',version:'1'},lead_signal:{lead_ref:'x',lead_priority:.5,probability_conversion:.5,confidence:.5,estimated_value_eur:1,email:'x@y.es'},sale_signal:{opportunity_ref:'o',next_action:'FOLLOW_UP'},communication_signal:{route_status:'X'},notification_signal:{notification_mode:'DIGEST'}}),/raw PII/);
});
