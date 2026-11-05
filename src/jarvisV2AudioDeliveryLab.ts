/** JARVIS V2 browser audio delivery, LAB-only. This receives authenticated
 * private audio from a trusted Gateway; it does not know provider credentials,
 * generate voices, or alter the existing speechSynthesis/ANA pathways.
 * The caller MUST verify authenticated OWNER_ROOT and use the B5 server port.
 */
export type JarvisV2AudioTicket=Readonly<{
 state:'AUDIO_READY';audioRef:string;voiceProfileId:'JARVIS_V2_CLARA_ES_ES';
 rate:1.10;pitchSemitones:0.6;mimeType:'audio/mpeg';ttlSeconds:number;
 prodAuthorized:false
}>;
export type JarvisV2PlaybackState='IDLE'|'PREPARING'|'SPEAKING'|'PAUSED'|'ENDED'|'STOPPED'|'ERROR';
type Player={
 onended:(()=>void)|null;onerror:(()=>void)|null;
 play:()=>Promise<void>;pause:()=>void;currentTime:number;playbackRate:number
};
type Deps={
 synthesize:(text:string,signal:AbortSignal)=>Promise<unknown>;
 download:(audioRef:string,signal:AbortSignal)=>Promise<Blob>;
 createObjectUrl:(blob:Blob)=>string;
 revokeObjectUrl:(url:string)=>void;
 createPlayer:(url:string)=>Player;
 onState?:(state:JarvisV2PlaybackState)=>void
};
const validRef=(v:unknown)=>typeof v==='string'&&
 /^[A-Za-z][A-Za-z0-9_-]{2,127}$/.test(v);
export function validateJarvisV2Ticket(raw:unknown):raw is JarvisV2AudioTicket{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
 const r=raw as Record<string,unknown>;
 return r.state==='AUDIO_READY'&&validRef(r.audioRef)&&
  r.voiceProfileId==='JARVIS_V2_CLARA_ES_ES'&&r.rate===1.10&&
  r.pitchSemitones===0.6&&r.mimeType==='audio/mpeg'&&
  r.prodAuthorized===false&&typeof r.ttlSeconds==='number'&&
  Number.isFinite(r.ttlSeconds)&&r.ttlSeconds>0&&r.ttlSeconds<=600;
}
export function createJarvisV2LabAudioController(deps:Deps){
 if(typeof deps?.synthesize!=='function'||typeof deps?.download!=='function'||
  typeof deps?.createObjectUrl!=='function'||typeof deps?.revokeObjectUrl!=='function'||
  typeof deps?.createPlayer!=='function')throw Error('TRUSTED_AUDIO_DELIVERY_DEPENDENCIES_REQUIRED');
 let state:JarvisV2PlaybackState='IDLE',version=0;
 let abort:AbortController|null=null,player:Player|null=null,objectUrl:string|null=null;
 const emit=(s:JarvisV2PlaybackState)=>{state=s;deps.onState?.(s)};
 function release(){
  abort?.abort();abort=null;
  if(player){player.onended=null;player.onerror=null;try{player.pause()}catch{};player=null}
  if(objectUrl){const u=objectUrl;objectUrl=null;deps.revokeObjectUrl(u)}
 }
 function stop(){++version;release();emit('STOPPED')}
 async function speak(text:string){
  stop();
  if(typeof text!=='string'||!text.trim()||text.length>900){emit('ERROR');return false}
  const ticketVersion=version;abort=new AbortController();const signal=abort.signal;
  emit('PREPARING');
  try{
   const ticket=await deps.synthesize(text,signal);
   if(signal.aborted||ticketVersion!==version)return false;
   if(!validateJarvisV2Ticket(ticket))throw Error('VOICE_TICKET_DENIED');
   const blob=await deps.download(ticket.audioRef,signal);
   if(signal.aborted||ticketVersion!==version)return false;
   if(!(blob instanceof Blob)||blob.type!=='audio/mpeg'||blob.size<100||blob.size>5_000_000)
    throw Error('AUDIO_BYTES_INVALID');
   objectUrl=deps.createObjectUrl(blob);
   if(typeof objectUrl!=='string'||!objectUrl.startsWith('blob:'))throw Error('AUDIO_URL_INVALID');
   player=deps.createPlayer(objectUrl);
   // The server already applied the approved 1.10x / +0.6 semitone preset.
   player.playbackRate=1;
   player.onended=()=>{if(ticketVersion!==version)return;release();emit('ENDED')};
   player.onerror=()=>{if(ticketVersion!==version)return;release();emit('ERROR')};
   await player.play();
   if(signal.aborted||ticketVersion!==version)return false;
   emit('SPEAKING');
   return true;
  }catch{
   if(ticketVersion===version){release();emit('ERROR')}
   return false;
  }
 }
 async function resume(){
  if(state!=='PAUSED'||!player)return false;
  try{await player.play();emit('SPEAKING');return true}
  catch{release();emit('ERROR');return false}
 }
 function pause(){if(state!=='SPEAKING'||!player)return false;player.pause();emit('PAUSED');return true}
 return Object.freeze({speak,pause,resume,stop,getState:()=>state});
}
