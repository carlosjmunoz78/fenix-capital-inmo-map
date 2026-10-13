import {test,expect} from '@playwright/test';

const URL='/lab/cerebro-visual/candidate-v1427-voice.html';

test('VOICE-001 live-source contract drives Motion V2 and arrival-gated artifact reveal',async({page})=>{
 await page.goto(`${URL}#voiceadapterqa=1`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!(window as any).CEREBRO_V1427_VOICE&&!!(window as any).CEREBRO_VOICE_001_ADAPTER_V1&&!!(window as any).CEREBRO_CONVERSATION_MOTION_V2&&!!(window as any).CEREBRO_AFFECT_V1&&!!(window as any).CEREBRO_ARTIFACT_VIEWER_V2,null,{timeout:20_000});
 const metadata=await page.evaluate(()=>({candidate:(window as any).CEREBRO_V1427_VOICE,adapter:(window as any).CEREBRO_VOICE_001_ADAPTER_V1,failed:!!document.querySelector('#v1427-fail')}));
 expect(metadata.failed).toBeFalsy();
 expect(metadata.candidate.environment).toBe('LAB_PREPROD');
 expect(metadata.candidate.visual_base).toBe('v1.4.25');
 expect(metadata.candidate.motion_base).toBe('v1.4.26-motion');
 expect(metadata.candidate.authority).toBe('VISUAL_CONSUMER_ONLY');
 expect(metadata.candidate.prod_authorized).toBe(false);
 expect(metadata.candidate.additional_cost_eur).toBe(0);
 expect(metadata.adapter.live_source_contract).toBe('CEREBRO_CONSOLE_DOM_V1');
 expect(metadata.adapter.prod_authorized).toBe(false);
 expect(metadata.adapter.authority).toBe('VISUAL_CONSUMER_ONLY');

 await page.evaluate(()=>{
  const emit=(type:string,extra:any={})=>window.dispatchEvent(new CustomEvent(type,{detail:{type,source:'CEREBRO_CONSOLE_DOM_V1',...extra}}));
  emit('VOICE_SESSION_START');
  emit('VOICE_LISTEN_START');
  emit('VOICE_INTENT',{text:'consulta hablada exacta',targetCluster:4,targetReason:'VOICE_CHANNEL_COMMS_DEFAULT'});
  emit('VOICE_RESPONSE_START');
  emit('VOICE_ARTIFACT_READY',{artifact:{type:'image',id:'voice-qa-image',title:'QA image',href:'https://example.invalid/voice-qa.jpg'}});
 });
 await page.waitForFunction(()=>Boolean((window as any).CEREBRO_VOICE_001_ADAPTER_V1.getState().lastArtifactGate?.revealed),null,{timeout:8_000});
 const state=await page.evaluate(()=>({
  adapter:(window as any).CEREBRO_VOICE_001_ADAPTER_V1.getState(),
  motion:{mode:(window as any).CEREBRO_MOTION_V2.getMode(),stage:(window as any).CEREBRO_MOTION_V2.getStage(),settled:(window as any).CEREBRO_MOTION_V2.isSettled()},
  conversation:{phase:(window as any).CEREBRO_CONVERSATION_MOTION_V2.getPhase(),gate:(window as any).CEREBRO_CONVERSATION_MOTION_V2.getLastArtifactGate()},
  affect:(window as any).CEREBRO_AFFECT_V1.getProfile(),
  artifact:(window as any).CEREBRO_ARTIFACT_VIEWER_V2.getCurrent()
 }));
 expect(state.adapter.source).toBe('LIVE_CONTRACT_EVENT');
 expect(state.adapter.phase).toBe('RESPOND');
 expect(state.adapter.eventsSeen).toBeGreaterThanOrEqual(5);
 expect(state.adapter.live_connected??true).toBeTruthy();
 expect(state.motion.mode).toBe('CONVERSATIONAL');
 expect(state.motion.stage).toBe(3);
 expect(state.motion.settled).toBeTruthy();
 expect(state.conversation.phase).toBe('RESPOND');
 expect(state.conversation.gate.revealed).toBeTruthy();
 expect(state.conversation.gate.reason).toBe('CAMERA_ARRIVED');
 expect(state.artifact.type).toBe('image');
 expect(state.artifact.id).toBe('voice-qa-image');

 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('VOICE_INTERRUPT',{detail:{type:'VOICE_INTERRUPT',source:'CEREBRO_CONSOLE_DOM_V1'}})));
 const interrupted=await page.evaluate(()=>({adapter:(window as any).CEREBRO_VOICE_001_ADAPTER_V1.getState(),mode:(window as any).CEREBRO_MOTION_V2.getMode(),affect:(window as any).CEREBRO_AFFECT_V1.getProfile()}));
 expect(interrupted.adapter.phase).toBe('INTERRUPTED');
 expect(interrupted.mode).toBe('MANUAL');
 expect(interrupted.affect).toBe('ATTENTIVE');

 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('VOICE_END',{detail:{type:'VOICE_END',source:'CEREBRO_CONSOLE_DOM_V1'}})));
 const ended=await page.evaluate(()=>({adapter:(window as any).CEREBRO_VOICE_001_ADAPTER_V1.getState(),mode:(window as any).CEREBRO_MOTION_V2.getMode(),affect:(window as any).CEREBRO_AFFECT_V1.getProfile()}));
 expect(ended.adapter.phase).toBe('IDLE');
 expect(ended.mode).toBe('MANUAL');
 expect(ended.affect).toBe('CALM');
});

test('unverified or synthetic source never upgrades the adapter to live connected',async({page})=>{
 await page.goto(URL,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!(window as any).CEREBRO_VOICE_001_ADAPTER_V1,null,{timeout:20_000});
 const result=await page.evaluate(()=>{
  const adapter=(window as any).CEREBRO_VOICE_001_ADAPTER_V1;
  adapter.handle({type:'VOICE_LISTEN_START',source:'SYNTHETIC_QA'});
  return{state:adapter.getState(),live:adapter.live_connected()};
 });
 expect(result.state.source).toBe('SYNTHETIC_QA');
 expect(result.live).toBeFalsy();
});