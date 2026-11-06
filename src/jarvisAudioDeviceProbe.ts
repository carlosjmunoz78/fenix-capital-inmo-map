/**
 * JARVIS CUT47 · Explicit opt-in local audio hardware capability probe.
 * NO recording, NO upload, NO provider request, NO Gateway mutation.
 * Mic tracks are stopped before this resolves, including on failures.
 * Support/permission MUST NOT be confused with transcribed speech or heard audio.
 */
export type JarvisMicProbeStatus=
 'MIC_GRANTED'|'MIC_UNAVAILABLE'|'HTTPS_REQUIRED'|'MIC_PERMISSION_DENIED'|
 'MIC_NOT_FOUND'|'MIC_ERROR'|'NO_AUDIO_TRACK';

export type JarvisMicProbeResult=Readonly<{
 status:JarvisMicProbeStatus;
 permission_granted:boolean;
 speech_recognition_api_present:boolean;
 speech_synthesis_api_present:boolean;
 spanish_voice_count:number;
 physical_transcription_verified:false;
 audible_playback_verified:false;
 approved_clone_connected:false;
 source:'BROWSER_LOCAL_USER_GESTURE';
 message:string;
}>;

export type JarvisAudioTrack={kind?:string;stop:()=>void};
export type JarvisAudioStream={getTracks:()=>JarvisAudioTrack[]};
export type JarvisAudioProbeEnvironment={
 secureContext:boolean;
 getUserMedia:((constraints:{audio:true;video:false})=>Promise<JarvisAudioStream>)|null;
 speechRecognitionSupported:boolean;
 speechSynthesisSupported:boolean;
 spanishVoiceCount:number;
};

export function browserJarvisAudioEnvironment():JarvisAudioProbeEnvironment {
 const nav=typeof navigator!=='undefined'?navigator:null;
 const media=nav?.mediaDevices;
 const win=typeof window!=='undefined'?window:null;
 const speech=win as (Window&{SpeechRecognition?:unknown;webkitSpeechRecognition?:unknown})|null;
 const synth=Boolean(win&&'speechSynthesis' in win&&typeof SpeechSynthesisUtterance!=='undefined');
 let voiceCount=0;
 if(synth){
  try{voiceCount=win!.speechSynthesis.getVoices().filter(v=>/^es(?:-|$)/i.test(v.lang||'')).length}
  catch{/* Unsupported voices list: count remains zero. */}
 }
 return {
  secureContext:Boolean(win?.isSecureContext),
  getUserMedia:media?.getUserMedia
   ? constraints=>media.getUserMedia(constraints)
   : null,
  speechRecognitionSupported:Boolean(speech?.SpeechRecognition||speech?.webkitSpeechRecognition),
  speechSynthesisSupported:synth,
  spanishVoiceCount:voiceCount
 };
}

export async function inspectJarvisAudioDevice(env:JarvisAudioProbeEnvironment):Promise<JarvisMicProbeResult>{
 const create=(status:JarvisMicProbeStatus,message:string):JarvisMicProbeResult=>Object.freeze({
  status,permission_granted:status==='MIC_GRANTED',
  speech_recognition_api_present:env.speechRecognitionSupported===true,
  speech_synthesis_api_present:env.speechSynthesisSupported===true,
  spanish_voice_count:Number.isSafeInteger(env.spanishVoiceCount)&&env.spanishVoiceCount>0?env.spanishVoiceCount:0,
  physical_transcription_verified:false,audible_playback_verified:false,approved_clone_connected:false,
  source:'BROWSER_LOCAL_USER_GESTURE',message
 });
 if(!env.secureContext)return create('HTTPS_REQUIRED','El micrófono requiere una página HTTPS segura.');
 if(!env.getUserMedia)return create('MIC_UNAVAILABLE','El navegador no permite comprobar el micrófono mediante getUserMedia.');
 let tracks:JarvisAudioTrack[]=[];
 try{
  const stream=await env.getUserMedia({audio:true,video:false});
  tracks=stream.getTracks();
  if(!Array.isArray(tracks)||!tracks.some(t=>t&&t.kind==='audio'))
   return create('NO_AUDIO_TRACK','No se ha obtenido una pista de audio del dispositivo.');
  return create('MIC_GRANTED','Permiso de micrófono concedido y entrada de audio detectada. No se ha grabado ni enviado audio.');
 }catch(error){
  const name=error instanceof Error?error.name:String((error as {name?:unknown})?.name??'');
  if(name==='NotAllowedError'||name==='PermissionDeniedError'||name==='SecurityError')
   return create('MIC_PERMISSION_DENIED','El navegador ha denegado el acceso al micrófono.');
  if(name==='NotFoundError'||name==='DevicesNotFoundError'||name==='OverconstrainedError')
   return create('MIC_NOT_FOUND','No hay un micrófono compatible disponible.');
  return create('MIC_ERROR','No se pudo completar la comprobación local del micrófono.');
 }finally{
  if(Array.isArray(tracks))for(const track of tracks){try{track?.stop()}catch{/* always attempt all tracks */}}
 }
}
