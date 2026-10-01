import fs from 'node:fs';

const voice=fs.readFileSync('src/cerebroVoice.ts','utf8');
const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');

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
