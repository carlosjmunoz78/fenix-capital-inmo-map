import {useEffect} from 'react';

export type CerebroVisualVoiceEventType=
 |'VOICE_SESSION_START'
 |'VOICE_LISTEN_START'
 |'VOICE_INTENT'
 |'VOICE_RESPONSE_START'
 |'VOICE_RESPONSE_READY'
 |'VOICE_SPEAK_START'
 |'VOICE_INTERRUPT'
 |'VOICE_ARTIFACT_READY'
 |'VOICE_END';

export type CerebroVisualVoiceEventDetail={
 type:CerebroVisualVoiceEventType;
 source:'CEREBRO_CONSOLE_DOM_V1';
 at:number;
 text?:string;
 targetCluster?:number;
 targetReason?:'VOICE_CHANNEL_COMMS_DEFAULT';
 artifact?:{type:'image';href:string};
};

type BridgeWindow=Window&typeof globalThis&{
 CEREBRO_VOICE_VISUAL_EVENT_BRIDGE?:{
  version:'v1';
  prod_authorized:false;
  authority:'OBSERVE_ONLY';
  source:'CEREBRO_CONSOLE_DOM_V1';
  emitted:number;
  last_event:CerebroVisualVoiceEventDetail|null;
 };
};

function textOf(node:Element|undefined|null){
 return node?.textContent?.replace(/\s+/g,' ').trim()??'';
}

export default function CerebroVisualVoiceEventBridge(){
 useEffect(()=>{
  const target=window as BridgeWindow;
  let emitted=0,lastEvent:CerebroVisualVoiceEventDetail|null=null;
  let active=false,listening=false,processing=false,speaking=false,paused=false;
  let userCount=0,cerebroCount=0,mediaCount=0;

  const expose=()=>{
   target.CEREBRO_VOICE_VISUAL_EVENT_BRIDGE={
    version:'v1',prod_authorized:false,authority:'OBSERVE_ONLY',source:'CEREBRO_CONSOLE_DOM_V1',emitted,last_event:lastEvent
   };
  };
  const emit=(type:CerebroVisualVoiceEventType,extra:Omit<Partial<CerebroVisualVoiceEventDetail>,'type'|'source'|'at'>={})=>{
   const detail:CerebroVisualVoiceEventDetail={type,source:'CEREBRO_CONSOLE_DOM_V1',at:performance.now(),...extra};
   lastEvent=detail;emitted+=1;expose();
   window.dispatchEvent(new CustomEvent(type,{detail}));
   window.dispatchEvent(new CustomEvent('CEREBRO_VOICE_VISUAL_EVENT',{detail}));
  };
  const resetCounts=(root:Element)=>{
   userCount=root.querySelectorAll('.cerebro-chat-user').length;
   cerebroCount=root.querySelectorAll('.cerebro-chat-cerebro').length;
   mediaCount=root.querySelectorAll('.cerebro-media-link').length;
  };
  const scan=()=>{
   const root=document.querySelector('main.cerebro-console');
   if(!root){active=false;listening=false;processing=false;speaking=false;paused=false;return}
   const button=root.querySelector('.cerebro-voice-main');
   const session=button?.getAttribute('aria-pressed')==='true';
   const voiceBox=root.querySelector('.cerebro-voice-session');
   const nextListening=Boolean(session&&voiceBox?.classList.contains('is-listening'));
   const nextSpeaking=Boolean(session&&voiceBox?.classList.contains('is-speaking'));
   const status=textOf(root.querySelector('.cerebro-voice-status')).toLocaleLowerCase('es-ES');
   const nextProcessing=Boolean(session&&status.includes('procesando tu petición'));
   const nextPaused=Boolean(session&&status.includes('respuesta pausada'));

   if(session&&!active){active=true;resetCounts(root);emit('VOICE_SESSION_START')}
   if(!session&&active){emit('VOICE_END');active=false;listening=false;processing=false;speaking=false;paused=false;resetCounts(root);return}
   if(!session){resetCounts(root);return}

   if(nextListening&&!listening)emit('VOICE_LISTEN_START');
   listening=nextListening;

   const users=[...root.querySelectorAll('.cerebro-chat-user')];
   if(users.length>userCount){
    for(const line of users.slice(userCount)){
     const text=textOf(line.querySelector('span'));
     emit('VOICE_INTENT',{text,targetCluster:4,targetReason:'VOICE_CHANNEL_COMMS_DEFAULT'});
    }
   }
   userCount=users.length;

   if(nextProcessing&&!processing)emit('VOICE_RESPONSE_START');
   processing=nextProcessing;

   const responses=[...root.querySelectorAll('.cerebro-chat-cerebro')];
   if(responses.length>cerebroCount){
    for(const line of responses.slice(cerebroCount))emit('VOICE_RESPONSE_READY',{text:textOf(line.querySelector('span'))});
   }
   cerebroCount=responses.length;

   if(nextSpeaking&&!speaking)emit('VOICE_SPEAK_START');
   speaking=nextSpeaking;

   if(nextPaused&&!paused)emit('VOICE_INTERRUPT');
   paused=nextPaused;

   const media=[...root.querySelectorAll<HTMLAnchorElement>('.cerebro-media-link')];
   if(media.length>mediaCount){
    for(const link of media.slice(mediaCount))emit('VOICE_ARTIFACT_READY',{artifact:{type:'image',href:link.href}});
   }
   mediaCount=media.length;
  };

  expose();scan();
  const observer=new MutationObserver(()=>queueMicrotask(scan));
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-pressed']});
  return()=>{observer.disconnect();delete target.CEREBRO_VOICE_VISUAL_EVENT_BRIDGE};
 },[]);
 return null;
}
