import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateOrder,planIntake,decideImage,videoGate,HOLD_CODES} from "../runtime/ums001_image_autonomous_intake_lab_v1.mjs";
const root="cerebro/media-studio/v2/";
const get=x=>JSON.parse(readFileSync(root+x,"utf8"));
const master=get("requests/UMS001_MULTICHANNEL_IMAGE_11_20261111.json");
const hist=get("qa/UMS001_MULTICHANNEL_IMAGE_GATE_REAL_20261111_V5.json");
const order=get("requests/autonomous-inbox/UMS001-LAB-SEO-BODY-20261111-01.json");
const clone=o=>JSON.parse(JSON.stringify(o));
test("valid autonomous intake is deterministic, CEREBRO-owned and free",()=>{
 const a=planIntake(order,master,hist),b=planIntake(order,master,hist);
 assert.deepEqual(a,b);assert.equal(a.status,"LAB_INTAKE_ACCEPTED_CREATIVE_PLANNING_ONLY");
 assert.equal(a.item_id,"SEO-BODY-01");assert.equal(a.channel,"SEO");
 assert.equal(a.generator_native_aspect,"4:3");
 assert.deepEqual(a.requested_pixels,[1200,900]);
 assert.equal(a.attempts_remaining,2);
 assert.equal(a.paid_provider_calls_authorized,false);
 assert.equal(a.delivery_allowed,false);
 assert.equal(a.video_enabled,false);
 assert.equal(a.additional_spend_eur,0);
});
test("real exhausted Instagram Story (two failed) is frozen automatically",()=>{
 const x={...order,item_id:"IG-STORY-01",consumer_engine_id:master.pieces.find(x=>x.item_id==="IG-STORY-01").consumer_engine_id};
 const p=planIntake(x,master,hist);
 assert.equal(p.status,"HUMAN_REQUIRED");assert.equal(p.human_required_reason,"LOW_CONFIDENCE");
 assert.equal(p.attempts_remaining,0);assert.equal(p.paid_provider_calls_authorized,false);
});
test("reject unsafe scopes, changed brand owner, paid calls, publishing, video and changed caps",()=>{
 for(const [key,value] of [["company_id","other"],["environment","PROD"],["max_attempts_per_piece",5],
 ["max_model_usd_per_attempt",10],["max_additional_cost_eur",1],["paid_execution_enabled",true],
 ["prepaid_only",false],["automatic_publication",true],["auto_recharge",true],
 ["video_enabled",true],["creative_owner","DEEPSEEK"],["provider","openai/unknown"]]){
  const j={...order,[key]:value};assert.throws(()=>validateOrder(j,master),/UMS001_AUTONOMY/);
 }
});
test("do not permit unknown schema or missing attempt ledger",()=>{
 assert.throws(()=>validateOrder({...order,secret:"do_not_execute"},master),/ORDER_SCHEMA/);
 const h=clone(hist);delete h.attempts_by_item;
 assert.throws(()=>planIntake(order,master,h),/HISTORY_MISSING/);
});
test("real Linkedin 90 score is still not approved without signed rights and images",()=>{
 const x={...order,item_id:"LI-FEED-01",consumer_engine_id:master.pieces.find(y=>y.item_id==="LI-FEED-01").consumer_engine_id};
 const verdict=decideImage(x,master,hist,null,null,null);
 assert.equal(verdict.status,"HUMAN_REQUIRED");
 assert.equal(verdict.delivery_allowed,false);
});
test("invalid rubric cannot be passed with one invented scalar",()=>{
 const qa={pass:true,score:90,violations:[],rubric_scores:{human_presence_and_cast:20}};
 const verdict=decideImage(order,master,hist,qa,{},{});assert.equal(verdict.status,"HUMAN_REQUIRED");
 assert.equal(verdict.reason,"VISION_SCHEMA_INVALID");
});
test("even a valid graded candidate requires verified brand, source, editorial and rights",()=>{
 const rubric={human_presence_and_cast:18,camera_and_composition:14,lighting_and_realism:15,
 contrast_and_color:9,surreal_creativity:13,typography_and_brand_integrity:13,context_and_claims:9};
 assert.equal(Object.values(rubric).reduce((a,b)=>a+b,0),91);
 const qa={pass:true,score:91,violations:[],rubric_scores:rubric};
 const verdict=decideImage(order,master,hist,qa,{},{});assert.equal(verdict.status,"HUMAN_REQUIRED");
 assert.equal(verdict.code,"HIGH_RISK");assert.equal(verdict.delivery_allowed,false);
});
test("video remains blocked until all 11 distinct accepted signed delivered rights-cleared images",()=>{
 assert.equal(videoGate(hist,[]).status,"VIDEO_HOLD");
 const fake={...hist,image_gate_green:true};
 assert.equal(videoGate(fake,[]).status,"VIDEO_HOLD");
 const values=Array(11).fill({item_id:"DUP",source_verified:true,independent_editorial_signed:true,rights_verified:true,delivery_verified:true,rollback_verified:true,final_score:90});
 assert.equal(videoGate(fake,values).status,"VIDEO_HOLD");
 assert.ok(HOLD_CODES.includes("LEGAL_REQUIRED"));
});
