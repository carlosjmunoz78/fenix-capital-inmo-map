export const VOICE_CONFIRMATION_CONFIDENCE_MIN=0.85;
export const VOICE_CONFIRMATION_PHRASES=new Set(['si','si adelante','adelante','confirmo','activalo','activarlo','hazlo','procede']);
export const CEREBRO_VOICE_CONTEXT_HINTS=[
 'CEREBRO','Fénix','Fénix Capital','Fénix Inmobiliaria','Belén','SEO','SEO local',
 'Supabase','Notion','Brevo','Buffer','Facebook','Instagram','LinkedIn',
 'hipoteca','hipotecas','inmobiliaria','inmobiliarias','expediente','expedientes'
];

export type CerebroSpeechRecognitionResult={
 transcript:string;
 confidence:number|null;
};

type RecognitionAlternative={transcript:string;confidence?:number};
type RecognitionResult={length:number;isFinal?:boolean;[index:number]:RecognitionAlternative};
type RecognitionEventLike=Event&{results:{length:number;[index:number]:RecognitionResult}};
type RecognitionErrorEventLike=Event&{error?:string;message?:string};

export type CerebroSpeechRecognition={
 lang:string;
 continuous:boolean;
 interimResults:boolean;
 maxAlternatives:number;
 onstart:((event:Event)=>void)|null;
 onresult:((event:RecognitionEventLike)=>void)|null;
 onerror:((event:RecognitionErrorEventLike)=>void)|null;
 onend:((event:Event)=>void)|null;
 start:()=>void;
 stop:()=>void;
 abort:()=>void;
};

type RecognitionCtor=new()=>CerebroSpeechRecognition;
type SpeechRecognitionPhraseCtor=new(phrase:string,boost?:number)=>unknown;
type VoiceWindow=Window&typeof globalThis&{
 SpeechRecognition?:RecognitionCtor;
 webkitSpeechRecognition?:RecognitionCtor;
 SpeechRecognitionPhrase?:SpeechRecognitionPhraseCtor;
};

function voiceWindow(){
 return window as VoiceWindow;
}

export function voiceRecognitionSupported(){
 if(typeof window==='undefined')return false;
 const target=voiceWindow();
 return Boolean(target.SpeechRecognition||target.webkitSpeechRecognition);
}

export function createVoiceRecognition(){
 if(typeof window==='undefined')return null;
 const target=voiceWindow();
 const Ctor=target.SpeechRecognition||target.webkitSpeechRecognition;
 return Ctor?new Ctor():null;
}

export function applyVoiceContextHints(recognition:CerebroSpeechRecognition){
 if(typeof window==='undefined')return false;
 const target=voiceWindow();
 const PhraseCtor=target.SpeechRecognitionPhrase;
 if(!PhraseCtor||!('phrases' in recognition))return false;
 try{
  (recognition as CerebroSpeechRecognition&{phrases:unknown[]}).phrases=CEREBRO_VOICE_CONTEXT_HINTS.map(phrase=>new PhraseCtor(phrase,5));
  return true;
 }catch{return false}
}

export function speechSynthesisSupported(){
 return typeof window!=='undefined'&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';
}

export function spanishVoices(){
 if(!speechSynthesisSupported())return [] as SpeechSynthesisVoice[];
 return window.speechSynthesis.getVoices().filter(voice=>String(voice.lang||'').toLowerCase().startsWith('es'));
}

export function normalizeVoiceConfirmation(text:string){
 return text.trim().toLocaleLowerCase('es-ES')
  .replace(/[áàäâ]/g,'a')
  .replace(/[éèëê]/g,'e')
  .replace(/[íìïî]/g,'i')
  .replace(/[óòöô]/g,'o')
  .replace(/[úùüû]/g,'u')
  .replace(/[¿?¡!.,;:]/g,'')
  .replace(/\s+/g,' ');
}

export function voiceNeedsManualConfirmation(text:string,confidence:number|null,hasPendingAction:boolean){
 if(!hasPendingAction)return false;
 if(!VOICE_CONFIRMATION_PHRASES.has(normalizeVoiceConfirmation(text)))return false;
 return confidence===null||!Number.isFinite(confidence)||confidence<VOICE_CONFIRMATION_CONFIDENCE_MIN;
}

export function voiceSpeechProfile(preferences:Record<string,string>={}){
 const rawRate=Number(preferences.speech_rate??0.96);
 const rawPitch=Number(preferences.speech_pitch??1.04);
 return{
  rate:Number.isFinite(rawRate)?Math.min(1.3,Math.max(0.75,rawRate)):0.96,
  pitch:Number.isFinite(rawPitch)?Math.min(1.25,Math.max(0.8,rawPitch)):1.04
 };
}

export function speechText(text:string,maxChars=700){
 const clean=text
  .replace(/https?:\/\/[^\s]+/gi,' enlace disponible en pantalla ')
  .replace(/\s+/g,' ')
  .trim();
 if(clean.length<=maxChars)return clean;
 const clipped=clean.slice(0,maxChars);
 const boundaries=[clipped.lastIndexOf('. '),clipped.lastIndexOf('? '),clipped.lastIndexOf('! '),clipped.lastIndexOf('; ')];
 const boundary=Math.max(...boundaries);
 const end=boundary>=Math.floor(maxChars*0.55)?boundary+1:maxChars;
 return `${clipped.slice(0,end).trim()} Tengo más detalle en pantalla.`;
}

export type CerebroSpokenMode='normal'|'action';

export type CerebroSpokenMeta={
 status?:string;
 intent?:string;
 executed?:boolean;
 action?:{
  action_type?:string;
  summary?:string;
  scope?:Record<string,string>;
 }|null;
 read_context?:{
  kind?:string;
  network?:string;
  content_key?:string;
  scheduled_at?:string;
  caption?:string;
  public_media_url?:string|null;
  media_urls?:string[];
 }|null;
};

type SpokenUnit={
 text:string;
 bullet:boolean;
 question:boolean;
 technical:boolean;
};

const SPOKEN_STATUS_LABELS=new Set([
 'hecho','existente','parcial','definido','planificado','por auditar',
 'estado','resultado','evidencia','fuentes','detalle técnico','detalle tecnico'
]);

function naturalJoin(items:string[]){
 if(items.length<=1)return items[0]??'';
 if(items.length===2)return \`\${items[0]} y \${items[1]}\`;
 return \`\${items.slice(0,-1).join(', ')} y \${items[items.length-1]}\`;
}

function cleanSpokenUnit(value:string){
 return value
  .replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s+/u,'')
  .replace(/^\s*(?:HECHO|EXISTENTE|PARCIAL|DEFINIDO|PLANIFICADO|POR AUDITAR)\s*[:·-]?\s*/iu,'')
  .replace(/^\s*(?:estado|resultado|evidencia|fuentes?)\s*:\s*/iu,'')
  .replace(/[<>]/g,' ')
  .replace(/\s+/g,' ')
  .trim();
}

function isTechnicalNoise(value:string){
 const text=value.toLocaleLowerCase('es-ES');
 if(/\b(?:sha|commit|artifact|artefacto|runtime smoke|live deploy|build gate|regression guard|source sha|run #?|pr #?)\b/.test(text))return true;
 if(/\b[a-f0-9]{24,64}\b/i.test(value))return true;
 if(/\b(?:turn|file|ref)[a-z0-9_-]{8,}\b/i.test(value))return true;
 return false;
}

function spokenUnits(text:string){
 const withoutUnreadables=text
  .replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g,' ')
  .replace(/https?:\/\/[^\s]+/gi,' ')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,' ')
  .replace(/\b[a-f0-9]{32,64}\b/gi,' ')
  .replace(/[*_\x60#]/g,'')
  .replace(/\r/g,'');

 const rows=withoutUnreadables.split(/\n+/).map(row=>row.trim()).filter(Boolean);
 const units:SpokenUnit[]=[];
 for(const row of rows){
  const bullet=/^(?:[-*•▪◦]|\d+[.)])\s+/u.test(row);
  const cleanedRow=cleanSpokenUnit(row);
  if(!cleanedRow)continue;
  if(SPOKEN_STATUS_LABELS.has(cleanedRow.toLocaleLowerCase('es-ES')))continue;
  const parts=cleanedRow
   .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u)
   .map(cleanSpokenUnit)
   .filter(Boolean);
  for(const part of parts){
   if(!part)continue;
   if(/^propuesta exacta de env[ií]o:?$/i.test(part))continue;
   const lower=part.toLocaleLowerCase('es-ES');
   if(SPOKEN_STATUS_LABELS.has(lower))continue;
   units.push({
    text:part,
    bullet,
    question:/\?$/.test(part),
    technical:isTechnicalNoise(part)
   });
  }
 }
 return units;
}

function clipNatural(value:string,max=170){
 const text=value.trim();
 if(text.length<=max)return text;
 const clipped=text.slice(0,max);
 const boundary=Math.max(clipped.lastIndexOf('. '),clipped.lastIndexOf(', '),clipped.lastIndexOf('; '));
 return (boundary>=Math.floor(max*0.55)?clipped.slice(0,boundary):clipped).trim().replace(/[,:;.-]+$/,'')+'…';
}

function quotedTopic(text:string){
 return text.match(/[«“"]([^»”"]{2,100})[»”"]/u)?.[1]?.trim()??'';
}

function contactSelectionSummary(raw:string,meta:CerebroSpokenMeta){
 const scope=meta.action?.scope??{};
 const contact=String(scope.contact_query||quotedTopic(raw)||'ese contacto').trim();
 let count=0;
 try{
  const parsed=JSON.parse(String(scope.candidates_json||'[]'));
  if(Array.isArray(parsed))count=parsed.length;
 }catch{/* generic wording */}
 const howMany=count>1?\`\${count} opciones\`:count===1?'una opción':'varias opciones';
 return \`He encontrado \${howMany} para \${contact}. Te las dejo por escrito para que elijas.\`;
}

function emailProposalSummary(meta:CerebroSpokenMeta){
 const scope=meta.action?.scope??{};
 const name=String(scope.contact_name||'el destinatario').trim();
 const subject=String(scope.subject||'').trim();
 const subjectPart=subject?\` con el asunto «\${clipNatural(subject,90)}»\`:'';
 return \`He preparado el correo para \${name}\${subjectPart}. Te dejo el texto completo por escrito para que lo revises. ¿Confirmas el envío?\`;
}

function emailAcceptedSummary(raw:string){
 const name=raw.match(/Email enviado a\s+(.+?)(?:\s*<|\.|$)/i)?.[1]?.trim();
 return name
  ?\`Hecho. El correo se ha enviado a \${name}. Te dejo la evidencia por escrito.\`
  :'Hecho. El correo se ha enviado correctamente. Te dejo la evidencia por escrito.';
}

function socialScheduleSummary(meta:CerebroSpokenMeta){
 const ctx=meta.read_context;
 if(!ctx)return '';
 const network=String(ctx.network||'la red social');
 const rawWhen=String(ctx.scheduled_at||'').trim();
 let when='';
 if(rawWhen){
  const date=new Date(rawWhen);
  if(!Number.isNaN(date.getTime())){
   when=new Intl.DateTimeFormat('es-ES',{
    timeZone:'Europe/Madrid',
    weekday:'long',
    day:'numeric',
    month:'long',
    hour:'2-digit',
    minute:'2-digit'
   }).format(date);
  }
 }
 const key=String(ctx.content_key||'').trim();
 const keyPart=key?\` Es la publicación \${clipNatural(key,80)}.\`:'';
 const whenPart=when?\` está programada para \${when}\`:' está localizada';
 return \`La próxima publicación de \${network}\${whenPart}.\${keyPart} Te dejo el texto, la imagen y el resto de detalles por escrito.\`;
}

function memoryRecallSummary(units:SpokenUnit[]){
 const remembered=units
  .map(unit=>unit.text.replace(/\s*·\s*\d{1,2}\s+\p{L}+\s+\d{4}\s*$/u,'').trim())
  .filter(text=>!/^(en tu memoria conversacional|memoria conversacional relevante)/i.test(text))
  .filter(Boolean)
  .slice(0,2);
 if(!remembered.length)return 'Sí. Tengo recuerdos relacionados y te los dejo por escrito.';
 return \`Sí. Recuerdo \${naturalJoin(remembered.map(item=>item.replace(/[.]+$/,'')))}.\`;
}

function scoreUnit(unit:SpokenUnit,index:number){
 let score=0;
 if(index===0)score+=3;
 if(unit.question)score+=8;
 if(unit.bullet)score+=2;
 if(/\b(no |no he|error|fall|bloque|pendiente|requiere|necesito|confirm|riesgo|seguridad|firma|pago)\b/i.test(unit.text))score+=6;
 if(/\b(?:hoy|mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|\d{1,2}[:.]\d{2}|\d+\s*€)\b/i.test(unit.text))score+=3;
 if(isTechnicalNoise(unit.text))score-=8;
 if(unit.text.length>260)score-=2;
 return score;
}

function genericSummary(raw:string,units:SpokenUnit[],maxChars:number){
 if(!units.length)return '';

 const nonTechnical=units.filter(unit=>!unit.technical);
 const pool=nonTechnical.length?nonTechnical:units;
 const ranked=pool
  .map((unit,index)=>({unit,index,score:scoreUnit(unit,index)}))
  .sort((a,b)=>b.score-a.score||a.index-b.index);

 const picked:Array<{unit:SpokenUnit;index:number}>=[];
 let total=0;
 for(const candidate of ranked){
  const text=clipNatural(candidate.unit.text,190);
  if(!text)continue;
  if(picked.some(item=>normalizeVoiceConfirmation(item.unit.text)===normalizeVoiceConfirmation(text)))continue;
  const extra=(picked.length?1:0)+text.length;
  if(picked.length&&total+extra>maxChars)continue;
  picked.push({unit:{...candidate.unit,text},index:candidate.index});
  total+=extra;
  if(picked.length>=3)break;
 }
 picked.sort((a,b)=>a.index-b.index);
 const chosen=picked.map(item=>item.unit);

 const questions=chosen.filter(unit=>unit.question);
 const statements=chosen.filter(unit=>!unit.question);
 const bulletStatements=statements.filter(unit=>unit.bullet);
 const parts:string[]=[];

 if(bulletStatements.length>=2){
  const bulletSet=new Set(bulletStatements);
  const plain=statements.filter(unit=>!bulletSet.has(unit));
  parts.push(...plain.map(unit=>unit.text));
  parts.push(\`Lo principal es: \${naturalJoin(bulletStatements.map(unit=>unit.text.replace(/[.]+$/,'')))}.\`);
 }else{
  parts.push(...statements.map(unit=>unit.text));
 }

 for(const question of questions)parts.push(question.text);

 const hasLinks=(raw.match(/https?:\/\/[^\s]+/gi)??[]).length>0;
 const hasEmails=(raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)??[]).length>0;
 const omitted=units.length>chosen.length||units.some(unit=>unit.technical);
 if(hasLinks)parts.push('Te dejo el enlace por escrito.');
 if(hasEmails)parts.push('Te dejo los correos por escrito.');
 if(omitted&&!parts.some(part=>/detalle.*por escrito/i.test(part)))parts.push('Te dejo el detalle completo por escrito.');

 return parts.join(' ').replace(/\s+/g,' ').trim();
}

export function spokenResponseText(text:string,maxChars=440,mode:CerebroSpokenMode='normal',meta:CerebroSpokenMeta={}){
 const raw=text.trim();
 if(!raw)return '';
 const status=String(meta.status||'').toUpperCase();
 const intent=String(meta.intent||'').toLowerCase();
 const units=spokenUnits(raw);

 if(intent==='email_contact_selection')return contactSelectionSummary(raw,meta);
 if(intent==='email_send'&&status==='ACTION_PROPOSAL')return emailProposalSummary(meta);
 if(intent==='email_send_confirmation'&&meta.executed===true)return emailAcceptedSummary(raw);
 if(intent==='social_schedule_complete'&&meta.read_context)return socialScheduleSummary(meta);
 if(intent==='conversation_memory')return memoryRecallSummary(units);
 if(intent==='health')return 'CEREBRO está conectado y disponible. Te dejo el detalle técnico por escrito.';

 if(status==='ACTION_CONFIRMED'&&meta.executed===false){
  return genericSummary(raw,units,Math.max(maxChars,520));
 }

 if(mode==='action'){
  const finalQuestion=[...units].reverse().find(unit=>unit.question&&/(confirm|quieres|activo|env[ií]o|activar|ejecut)/i.test(unit.text));
  const actionSummary=meta.action?.summary?clipNatural(meta.action.summary,220):'';
  const parts:string[]=[];
  if(actionSummary)parts.push(actionSummary);
  else{
   const core=units.filter(unit=>unit!==finalQuestion&&!unit.technical);
   const first=core[0]?.text;
   if(first)parts.push(clipNatural(first,220));
  }
  if((raw.match(/https?:\/\/[^\s]+/gi)??[]).length)parts.push('Te dejo el enlace por escrito.');
  if(finalQuestion)parts.push(finalQuestion.text);
  else if(units.length>1)parts.push('Te dejo el detalle completo por escrito.');
  return parts.join(' ').replace(/\s+/g,' ').trim();
 }

 return genericSummary(raw,units,maxChars);
}

export type CerebroSpeechSegment={
 text:string;
 rate:number;
 pitch:number;
};

function clampVoice(value:number,min:number,max:number){
 return Math.min(max,Math.max(min,value));
}

export function speechSegments(text:string,maxChars=440,preferences:Record<string,string>={},mode:CerebroSpokenMode='normal',meta:CerebroSpokenMeta={}):CerebroSpeechSegment[]{
 const spoken=spokenResponseText(text,maxChars,mode,meta);
 if(!spoken)return [];
 const base=voiceSpeechProfile(preferences);
 const parts=(spoken.match(/[^.!?;:]+[.!?;:]?/g)||[spoken])
  .map(part=>part.trim())
  .filter(Boolean);
 return parts.map((part,index)=>{
  const normalized=normalizeVoiceConfirmation(part);
  let rate=base.rate;
  let pitch=base.pitch;

  // Keep the user's chosen overall rhythm; vary only locally for natural prosody.
  if(/^(vale|perfecto|bien|entendido|confirmado|hecho)\b/.test(normalized)&&part.length<140){
   rate+=0.035;
   pitch+=0.018;
  }
  if(part.endsWith('?')){
   rate+=0.012;
   pitch+=0.045;
  }
  if(/\b(no voy|no puedo|riesgo|seguridad|confirmas|firma|pago|bloqueado|error|human_required|atencion|atención)\b/.test(normalized)){
   rate-=0.035;
   pitch-=0.018;
  }
  if(/^\s*(?:\d+[.)]|[-•])/.test(part)||/\b(primero|segundo|tercero|paso \d+)\b/.test(normalized)){
   rate-=0.015;
  }
  if(part.length>180)rate-=0.012;
  if(index===parts.length-1&&!part.endsWith('?'))pitch-=0.008;

  return{
   text:part,
   rate:clampVoice(rate,0.82,1.18),
   pitch:clampVoice(pitch,0.88,1.16)
  };
 });
}

