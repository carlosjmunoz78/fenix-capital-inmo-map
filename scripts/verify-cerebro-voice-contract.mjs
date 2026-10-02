import fs from 'node:fs';

const voice=fs.readFileSync('src/cerebroVoice.ts','utf8');
const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');

function must(haystack,needle,label){
 if(!haystack.includes(needle))throw new Error('Missing '+label+': '+needle);
}

function normalize(value){
  return value.trim().toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[¿?¡!.,;:]/g,'')
    .replace(/\s+/g,' ');
}

const voiceMatch=voice.match(/VOICE_CONFIRMATION_PHRASES=new Set\(\[([^\]]+)\]\)/);
if(!voiceMatch)throw new Error('VOICE_CONFIRMATION_PHRASES not found');
const voicePhrases=[...voiceMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match=>normalize(match[1]));

const gatewayMatch=gateway.match(/if\(\/\^\(([^)]+)\)\$\/\.test\(text\)\)\{/);
if(!gatewayMatch)throw new Error('Gateway confirmation regex not found');
const gatewayPhrases=gatewayMatch[1].split('|').map(normalize);

const frontend=new Set(voicePhrases);
const accepted=new Set(gatewayPhrases);
const missing=[...accepted].filter(item=>!frontend.has(item));
if(missing.length){
  throw new Error('Voice safety gate is missing Gateway confirmations: '+missing.join(', '));
}

const stale=[...frontend].filter(item=>!accepted.has(item));
if(stale.length){
  throw new Error('Voice confirmation vocabulary drifted beyond Gateway: '+stale.join(', '));
}

if(!voice.includes('VOICE_CONFIRMATION_CONFIDENCE_MIN=0.85')){
  throw new Error('Voice confirmation confidence threshold changed unexpectedly');
}

console.log('CEREBRO voice confirmation contract parity: GREEN');
console.log('Accepted confirmations:',[...accepted].join(', '));

must(voice,"VOICE_RESUME_PHRASES",'resume phrases');
must(voice,"function voiceResumeRequested",'resume parser');
must(shell,"function pauseSpeech()",'pause speech');
must(shell,"function resumeSpeech()",'resume speech');
must(shell,"speechCursorRef",'speech cursor state');
must(shell,"utterance.onboundary",'speech cursor boundary tracking');
must(shell,"speechRunTokenRef.current+=1",'speech cancellation token');
must(shell,"window.speechSynthesis.cancel()",'portable pause cancellation');
must(shell,"playSpeechPlan(segmentIndex,charIndex)",'cursor-based resume playback');
must(shell,"voiceResumeRequested(clean)",'resume command routing');
must(shell,"speech_rate:'1.08'",'faster durable frontend baseline');
