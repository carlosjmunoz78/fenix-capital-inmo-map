import fs from 'node:fs';

const voice=fs.readFileSync('src/cerebroVoice.ts','utf8');
const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');

function must(haystack,needle,label){
 if(!haystack.includes(needle))throw new Error('Missing '+label+': '+needle);
}

must(voice,"export function spokenResponseText",'spoken summary transformer');
must(voice,".replace(/https?:\\/\\/[^\\s]+/gi,' ')",'URL removal before TTS');
must(voice,"Te dejo el enlace por escrito.",'spoken link replacement');
must(voice,".replace(/^\\s*(?:[-*•▪◦]|\\d+[.)])\\s+/u,'')",'numbered-list marker stripping');
must(voice,"function genericSummary(raw:string,units:SpokenUnit[],maxChars:number)",'semantic generic summary');
must(voice,"finalQuestion",'action confirmation preservation');
must(voice,"mode:CerebroSpokenMode='normal'",'spoken mode contract');
must(voice,'export type CerebroSpokenMeta','structured spoken metadata');
must(voice,"intent==='email_contact_selection'",'contact-selection spoken intent');
must(voice,"intent==='social_schedule_complete'",'social-schedule spoken intent');
must(voice,"intent==='conversation_memory'",'memory-recall spoken intent');
must(voice,"isTechnicalNoise",'technical-noise suppression');
must(voice,'VOICE_INTERRUPT_PHRASES','verbal interruption vocabulary');
must(voice,'voiceInterruptRequested','verbal interruption parser');
must(voice,'applyVoiceInterruptHints','verbal interruption recognition hints');
must(voice,'voiceActivityThreshold','local VAD adaptive threshold');
must(voice,'voiceActivityFrame','local VAD sustained-voice detector');
must(voice,'function intentDigestSummary','intent-aware spoken digest V3');
must(shell,"fullDetail?'action':'normal'",'action-aware TTS mode');
must(shell,'data??{}','structured response metadata passed to TTS');
must(shell,'startInterruptListening','dedicated barge-in listener fallback');
must(shell,'prepareVoiceActivityBargeIn','local microphone VAD barge-in');
must(shell,'echoCancellation:true','barge-in echo cancellation');
must(shell,'noiseSuppression:true','barge-in noise suppression');
must(shell,'autoGainControl:true','barge-in automatic gain control');
must(shell,'if(!vadReady)scheduleInterruptListening(120)','SpeechRecognition barge-in remains fallback only');
must(shell,'voiceInterruptRequested(transcript)','spoken stop command cancels TTS');
must(shell,'stopInterruptRecognition()','barge-in listener cleanup');
must(shell,"voicePreferencesRef.current.response_length==='concise'?420:560",'spoken summary budget');

if(voice.includes(".replace(/https?:\\/\\/[^\\s]+/gi,' enlace disponible en pantalla ')") && !voice.includes('spokenResponseText')){
 throw new Error('Legacy URL-speaking path is still the active TTS path');
}

console.log('GREEN cerebro spoken summary contract');