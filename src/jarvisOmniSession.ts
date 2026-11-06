/**
 * JARVIS CUT39: tab-memory-only UI projection of the existing authenticated
 * conversation. No LLM calls, backend writes, privilege escalation or storage.
 * The Gateway remains the only authority for answers and real actions.
 */
export const JARVIS_OMNI_EVENT='fenix:jarvis-omni-state';
export const JARVIS_OMNI_INTERFACE_EVENT='fenix:jarvis-omni-interface';
export type JarvisOmniInterface='JARVIS'|'OPERATIVA'|'NEURONAL'|'NAVEGADOR';
export type JarvisOmniTurn={role:'user'|'cerebro';text:string;mediaUrl?:string|null};
export type JarvisOmniState={
 ready:boolean;
 sending:boolean;
 voiceActive:boolean;
 voiceListening:boolean;
 voiceSpeaking:boolean;
 turns:JarvisOmniTurn[];
 observedAt:number;
};
const EMPTY:JarvisOmniState={ready:false,sending:false,voiceActive:false,voiceListening:false,voiceSpeaking:false,turns:[],observedAt:0};
let current:JarvisOmniState=EMPTY;
let activeInterface:JarvisOmniInterface='JARVIS';
const permitted=new Set(['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR']);

function sanitizeState(state:JarvisOmniState):JarvisOmniState{
 return {
  ready:state.ready===true,
  sending:state.sending===true,
  voiceActive:state.voiceActive===true,
  voiceListening:state.voiceListening===true,
  voiceSpeaking:state.voiceSpeaking===true,
  turns:Array.isArray(state.turns)?state.turns.slice(-24)
   .filter(t=>t&&(t.role==='user'||t.role==='cerebro')&&typeof t.text==='string')
   .map(t=>({role:t.role,text:t.text.slice(0,1500),
    mediaUrl:typeof t.mediaUrl==='string'&&t.mediaUrl.startsWith('https://')?t.mediaUrl:null})):[],
  observedAt:Number.isFinite(state.observedAt)?state.observedAt:Date.now()
 };
}
export function publishJarvisOmniState(state:JarvisOmniState){
 current=sanitizeState(state);
 if(typeof window!=='undefined')window.dispatchEvent(new Event(JARVIS_OMNI_EVENT));
}
export function clearJarvisOmniState(){
 current=EMPTY;
 if(typeof window!=='undefined')window.dispatchEvent(new Event(JARVIS_OMNI_EVENT));
}
export function getJarvisOmniState():JarvisOmniState{
 return {...current,turns:current.turns.map(turn=>({...turn}))};
}
export function setJarvisActiveInterface(value:JarvisOmniInterface){
 if(!permitted.has(value))throw Error('UNKNOWN_JARVIS_INTERFACE');
 if(activeInterface===value)return;
 activeInterface=value;
 if(typeof window!=='undefined')window.dispatchEvent(new Event(JARVIS_OMNI_INTERFACE_EVENT));
}
export function getJarvisActiveInterface():JarvisOmniInterface{return activeInterface}
export const JARVIS_OMNI_POLICY=Object.freeze({
 owner_only:true,storage:'MEMORY_ONLY',company_authority:'GATEWAY',
 actions_require_gateway:true,model_direct_access:false,
 live_writes_without_policy:false,
 persistent_full_history_verified:false
});
