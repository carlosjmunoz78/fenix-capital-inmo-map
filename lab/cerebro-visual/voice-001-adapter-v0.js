(()=>{
  'use strict';
  // Event adapter only. Synthetic QA events are not live VOICE-001 evidence and THINK is an operational UI phase only.
  const conv=window.CEREBRO_CONVERSATION_MOTION_V1,affect=window.CEREBRO_AFFECT_V1,viewer=window.CEREBRO_ARTIFACT_VIEWER_V2;
  if(!conv||!affect){console.warn('VOICE-001 ADAPTER V0: visual controllers unavailable');return}
  let source='UNBOUND',phase='IDLE',lastEvent=null;
  const badge=document.createElement('div');
  Object.assign(badge.style,{position:'fixed',right:'18px',top:'122px',zIndex:'26',padding:'6px 9px',border:'1px solid rgba(100,210,238,.18)',borderRadius:'8px',background:'rgba(0,10,15,.68)',color:'#7bd9ef',font:'9px monospace',letterSpacing:'.08em',pointerEvents:'none'});
  document.body.appendChild(badge);
  function show(extra=''){badge.textContent='VOICE-001 ADAPTER · '+source+' · '+phase+(extra?' · '+extra:'')}
  function handle(evt){
    if(!evt||!evt.type)return false;lastEvent={...evt};
    if(evt.type==='VOICE_LISTEN_START'){phase='LISTEN';affect.setProfile('ATTENTIVE');show('EVENT')}
    else if(evt.type==='VOICE_INTENT'){phase='THINK';affect.setProfile('FOCUSED');conv.run(Number.isFinite(evt.targetCluster)?evt.targetCluster:4);show(evt.intent||'INTENT')}
    else if(evt.type==='VOICE_RESPONSE_START'){phase='RESPOND';affect.setProfile('FOCUSED');show('EVENT')}
    else if(evt.type==='VOICE_ARTIFACT_READY'){phase='RESPOND';if(viewer&&evt.artifact==='facebook_demo')viewer.demoFacebook();show('ARTIFACT')}
    else if(evt.type==='VOICE_END'){phase='IDLE';affect.setProfile('CALM');show('END')}
    return true
  }
  function bindLive(dispatcher){
    if(!dispatcher||typeof dispatcher.addEventListener!=='function')return false;
    ['VOICE_LISTEN_START','VOICE_INTENT','VOICE_RESPONSE_START','VOICE_ARTIFACT_READY','VOICE_END'].forEach(t=>dispatcher.addEventListener(t,e=>handle(e.detail||{type:t})));
    source='LIVE_BOUND';show();return true
  }
  function syntheticFacebookQA(){
    source='SYNTHETIC_QA';show('NOT LIVE VOICE');
    const seq=[
      [0,{type:'VOICE_LISTEN_START'}],
      [700,{type:'VOICE_INTENT',intent:'FACEBOOK_NEXT_POST',targetCluster:4}],
      [3100,{type:'VOICE_RESPONSE_START'}],
      [3900,{type:'VOICE_ARTIFACT_READY',artifact:'facebook_demo'}],
      [6200,{type:'VOICE_END'}]
    ];
    seq.forEach(([ms,e])=>setTimeout(()=>handle(e),ms));
  }
  window.CEREBRO_VOICE_001_ADAPTER=Object.freeze({version:'voice-001-adapter-v0',prod_authorized:false,live_connected:()=>source==='LIVE_BOUND',bindLive,handle,syntheticFacebookQA,getState:()=>({source,phase,lastEvent})});
  show('NOT CONNECTED');
  if(location.hash.includes('voiceqa=1'))setTimeout(syntheticFacebookQA,450);
})();