import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { KokoroTTS } from 'kokoro-js';

const out=process.env.CEREBRO_VOICE_SCOUT_OUT||'/tmp/cerebro-voice-scout-v1';
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const text='Te encanta. Ya te ves dentro. Y aparece: hay que reservar hoy. Freno. Primero mira si encaja contigo. ¿Encaja? Perfecto. Aceleramos contigo.';
function runInput(cmd,args,input){return new Promise((resolve,reject)=>{const c=spawn(cmd,args,{stdio:['pipe','pipe','pipe']});let err='';c.stderr.on('data',d=>err+=d);c.on('error',reject);c.on('close',code=>code===0?resolve():reject(new Error(`PROCESS_FAILED:${path.basename(cmd)}:${code}:${err.slice(-1600)}`)));c.stdin.end(input)})}
const piperBin=process.env.CEREBRO_PIPER_BIN,piperModel=process.env.CEREBRO_PIPER_MODEL,piperConfig=process.env.CEREBRO_PIPER_CONFIG;
if(!piperBin||!piperModel||!piperConfig)throw new Error('PIPER_ENV_REQUIRED');
const piperOut=path.join(out,'piper-es-female.wav');
await runInput(piperBin,['--model',piperModel,'--config',piperConfig,'--speaker','1','--noise_scale','0.78','--length_scale','0.90','--noise_w','0.90','--sentence_silence','0.07','--output_file',piperOut],`${text}\n`);
const modelId='onnx-community/Kokoro-82M-v1.0-ONNX';
const tts=await KokoroTTS.from_pretrained(modelId,{dtype:'q8',device:'cpu'});
const voices=tts.list_voices();
if(!Object.prototype.hasOwnProperty.call(voices,'ef_dora')&&!Array.isArray(voices))throw new Error('KOKORO_SPANISH_VOICE_NOT_FOUND');
if(Array.isArray(voices)&&!voices.some(v=>String(v?.id||v?.name||v)==='ef_dora'))throw new Error('KOKORO_SPANISH_VOICE_NOT_FOUND');
const audio=await tts.generate(text,{voice:'ef_dora',speed:1.03});
const kokoroOut=path.join(out,'kokoro-ef-dora.wav');audio.save(kokoroOut);
const manifest={schema_version:'1.0.0',environment:'PREPROD',engine_id:'CREATIVE-STUDIO-001',purpose:'VOICE_DIRECTOR_AB_COMPARISON',text,voices:[{id:'PIPER_ES_FEMALE',file:path.basename(piperOut),runtime:'PIPER',state:'CONFIRMED_COMPONENT'},{id:'KOKORO_EF_DORA',file:path.basename(kokoroOut),runtime:'kokoro-js@1.2.1',model:modelId,state:'PHYSICAL_SCOUT'}],automatic_winner:null,human_listening_required:true,publish_authorized:false,additional_cost_eur:0};
await fs.writeFile(path.join(out,'VOICE_SCOUT_MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,out,voices:manifest.voices.map(x=>x.id),human_listening_required:true}));
