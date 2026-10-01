import fs from 'node:fs';

const voice=fs.readFileSync('src/cerebroVoice.ts','utf8');
const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');

function must(haystack,needle,label){
 if(!haystack.includes(needle))throw new Error('Missing '+label+': '+needle);
}

must(voice,"export function spokenResponseText",'spoken summary transformer');
must(voice,".replace(/https?:\\/\\/[^\\s]+/gi,' ')",'URL removal before TTS');
must(voice,"Te dejo el enlace por escrito.",'spoken link replacement');
must(voice,".replace(/(?:^|\\s)\\d+[.)]\\s+/g,' ')",'numbered-list marker stripping');
must(voice,"conciseSpokenUnits(units,maxChars,2)",'normal spoken summary cap');
must(voice,"finalQuestion",'action confirmation preservation');
must(voice,"mode:CerebroSpokenMode='normal'",'spoken mode contract');
must(shell,"fullDetail?'action':'normal'",'action-aware TTS mode');
must(shell,"voicePreferencesRef.current.response_length==='concise'?360:520",'short spoken budget');

if(voice.includes(".replace(/https?:\\/\\/[^\\s]+/gi,' enlace disponible en pantalla ')") && !voice.includes('spokenResponseText')){
 throw new Error('Legacy URL-speaking path is still the active TTS path');
}

console.log('GREEN cerebro spoken summary contract');