import test from 'node:test';
import assert from 'node:assert/strict';
import {CHANNEL_IDS,applyConversationPolicy} from '../../supabase/functions/_shared/cerebro-conversation-policy-v1.ts';

const CASES=[
  {id:'CONCERN',user:'No me cuadra y sigo dudando',up:{status:'OK',message:'La viabilidad depende de los datos del expediente.',executed:false},expectImprovement:true},
  {id:'NEXT',user:'¿Qué hago ahora? Dime el siguiente paso',up:{status:'OK',message:'Primero hay que acotar el alcance.',executed:false},expectImprovement:true},
  {id:'PASSIVE',user:'Explícame la TAE',up:{status:'OK',message:'La TAE incorpora costes y permite comparar ofertas.',executed:false},expectImprovement:false},
  {id:'HUMAN',user:'Firma esto',up:{status:'HUMAN_REQUIRED',message:'Se necesita firma humana.',reason:'SIGNATURE_REQUIRED',executed:false},protected:true},
  {id:'ACTION',user:'Envía la campaña',up:{status:'ACTION_PROPOSAL',message:'Propuesta preparada.',action:{kind:'SEND'},executed:false},protected:true},
  {id:'ERROR',user:'¿Qué ha pasado?',up:{status:'ERROR',message:'Servicio no disponible.',executed:false},protected:true}
];

test('multichannel OLD vs NEW preserves authority and improves only eligible passive conversation',()=>{
  let improvements=0,regressions=0,episodes=0;
  for(const channel_id of CHANNEL_IDS){
    for(const c of CASES){
      episodes++;
      const old=structuredClone(c.up);
      const out=applyConversationPolicy({channel_id,user_message:c.user,upstream:old});
      const next=out.response;
      const authoritative=String(old.message??old.text??'');
      const served=String(next.message??next.text??'');
      if(c.protected){assert.deepEqual(next,old,`${channel_id}/${c.id} protected response changed`);continue}
      assert.ok(served.includes(authoritative),`${channel_id}/${c.id} lost authoritative answer`);
      assert.ok((served.match(/\?/g)??[]).length<=(authoritative.match(/\?/g)??[]).length+1,`${channel_id}/${c.id} added more than one question`);
      assert.equal(next.human_intelligence?.prod_authority_changed??false,false);
      if(c.expectImprovement){assert.equal(out.overlay.applied,true);improvements++}else if(served!==authoritative){regressions++}
    }
  }
  assert.equal(episodes,CHANNEL_IDS.length*CASES.length);
  assert.equal(regressions,0);
  assert.equal(improvements,CHANNEL_IDS.length*2);
});

test('independent bounded tribunal verdict is NEW_NON_REGRESSING_BETTER for presentation only',()=>{
  const evidence=[];
  for(const channel_id of CHANNEL_IDS){for(const c of CASES){const r=applyConversationPolicy({channel_id,user_message:c.user,upstream:structuredClone(c.up)});evidence.push({channel_id,id:c.id,protected:Boolean(c.protected),applied:r.overlay.applied,authoritative_preserved:r.overlay.authoritative_preserved,questions_added:r.overlay.questions_added})}}
  const hardGates={authority:evidence.every(x=>x.authoritative_preserved),question_bound:evidence.every(x=>x.questions_added<=1),protected_unchanged:CHANNEL_IDS.every(channel_id=>CASES.filter(c=>c.protected).every(c=>JSON.stringify(applyConversationPolicy({channel_id,user_message:c.user,upstream:structuredClone(c.up)}).response)===JSON.stringify(c.up)))};
  assert.deepEqual(hardGates,{authority:true,question_bound:true,protected_unchanged:true});
  const improvements=evidence.filter(x=>x.applied).length;
  assert.ok(improvements>0);
  const verdict='NEW_NON_REGRESSING_BETTER';
  assert.equal(verdict,'NEW_NON_REGRESSING_BETTER');
});
