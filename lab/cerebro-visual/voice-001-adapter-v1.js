(()=>{
  'use strict';
  // Visual-only consumer. It has no network, model, action, credential or business authority.
  const conv=window.CEREBRO_CONVERSATION_MOTION_V2;
  const affect=window.CEREBRO_AFFECT_V1;
  const viewer=window.CEREBRO_ARTIFACT_VIEWER_V2;
  if(!conv||!affect){console.warn('VOICE-001 ADAPTER V1: visual controllers unavailable');return}
  const LIVE_SOURCE='CEREBRO_CONSOLE_DOM_V1';
  const eventTypes=['VOICE_SESSION_START','VOICE_LISTEN_START','VOICE_INTENT','VOICE_RESPONSE_START','VOICE_RESPONSE_READY','VOICE_SPEAK_START','VOICE_INTERRUPT','VOICE_ARTIFACT_READY','VOICE_END'];
  let bound=false,source='UNBOUND',phase='IDLE',lastEvent=null,lastArtifactGate=null,eventsSeen=0;
  const qa=location.hash.includes('voiceadapterqa=1');
  const badge=document.createElement('div');
  Object.assign(badge.style,{position:'fixed',right:'18px',top:'122px',zIndex:'26',padding:'6px 9px',border:'1px solid rgba(100,210,238,.18)',borderRadius:'8px',background:'rgba(0,10,15,.68)',color:'#7bd9ef',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  if(qa)document.body.appendChild(badge);
  function show(extra=''){if(qa)badge.textContent='VOICE-001 ADAPTER V1 · '+source+' · '+phase+(extra?' · '+extra:'')}
  function classify(evt){
    if(evt?.source===LIVE_SOURCE)source='LIVE_CONTRACT_EVENT';
    else if(evt?.source==='SYNTHETIC_QA')source='SYNTHETIC_QA';
    else if(source==='UNBOUND')source='UNVERIFIED_EVENT';
  }
  async function revealArtifact(evt){
    const artifact=evt?.artifact;
    return conv.onArtifactReady(async()=>{
      if(!viewer||!artifact)return;
      if(artifact.demo===true&&artifact.type==='social_post'){viewer.demoFacebook();return}
      if(artifact.type==='image'&&artifact.href){
        viewer.open({type:'image',id:artifact.id||'voice-image',title:artifact.title||'Artefacto asociado a la respuesta',channel:'CEREBRO VOICE-001',status:'READ_ONLY_REFERENCE',summary:artifact.href});
      }
    });
  }
  function handle(evt){
    if(!evt||!eventTypes.includes(evt.type))return false;
    classify(evt);eventsSeen+=1;lastEvent={...evt};
    if(evt.type==='VOICE_SESSION_START'){phase='IDLE';affect.setProfile('CALM');show('SESSION')}
    else if(evt.type==='VOICE_LISTEN_START'){phase='LISTEN';affect.setProfile('ATTENTIVE');conv.beginListen();show('LISTEN')}
    else if(evt.type==='VOICE_INTENT'){phase='THINK';affect.setProfile('FOCUSED');conv.onIntent(Number.isFinite(evt.targetCluster)?evt.targetCluster:4);show(evt.text?'INTENT':'THINK')}
    else if(evt.type==='VOICE_RESPONSE_START'){phase='RESPOND';affect.setProfile('FOCUSED');void conv.onResponseStart();show('CAMERA TO RESPONSE')}
    else if(evt.type==='VOICE_RESPONSE_READY'){phase='RESPOND';show('RESPONSE READY')}
    else if(evt.type==='VOICE_SPEAK_START'){phase='RESPOND';affect.setProfile('POSITIVE');show('SPEAK')}
    else if(evt.type==='VOICE_INTERRUPT'){phase='INTERRUPTED';conv.cancel();affect.setProfile('ATTENTIVE');show('HUMAN OVERRIDE')}
    else if(evt.type==='VOICE_ARTIFACT_READY'){
      phase='RESPOND';
      void revealArtifact(evt).then(ok=>{lastArtifactGate={revealed:Boolean(ok),at:performance.now(),source};show(ok?'ARTIFACT REVEALED':'ARTIFACT HELD')});
    }
    else if(evt.type==='VOICE_END'){phase='IDLE';conv.end();affect.setProfile('CALM');show('END')}
    return true;
  }
  function bindLive(dispatcher=window){
    if(bound||!dispatcher||typeof dispatcher.addEventListener!=='function')return bound;
    eventTypes.forEach(type=>dispatcher.addEventListener(type,event=>handle(event.detail||{type})));
    bound=true;source='BOUND_WAITING_FOR_EVENT';show();return true;
  }
  function unbind(){return false}
  function syntheticContractQA(){
    source='SYNTHETIC_QA';show('NOT LIVE');
    const emit=(type,extra={})=>handle({type,source:'SYNTHETIC_QA',...extra});
    emit('VOICE_SESSION_START');emit('VOICE_LISTEN_START');emit('VOICE_INTENT',{text:'facebook',targetCluster:4});emit('VOICE_RESPONSE_START');
    return conv.getPendingArrival().then(()=>{emit('VOICE_RESPONSE_READY',{text:'respuesta'});emit('VOICE_ARTIFACT_READY',{artifact:{demo:true,type:'social_post'}});return conv.getPendingArrival()});
  }
  window.CEREBRO_VOICE_001_ADAPTER_V1=Object.freeze({
    version:'voice-001-adapter-v1',environment:'LAB_PREPROD',prod_authorized:false,authority:'VISUAL_CONSUMER_ONLY',live_source_contract:LIVE_SOURCE,
    bindLive,unbind,handle,syntheticContractQA,
    live_connected:()=>bound&&source==='LIVE_CONTRACT_EVENT',
    getState:()=>({bound,source,phase,lastEvent,lastArtifactGate,eventsSeen})
  });
  bindLive(window);show('WAITING');
})();