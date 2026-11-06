import test from 'node:test';
import assert from 'node:assert/strict';
import {assessJarvisDialogue} from './jarvis-dialogue-quality-lab.mjs';

const candidate=(respuesta)=>({
  respuesta,
  intencion:'atender al propietario',
  verificaciones:[],
  human_required:false,
});
const scenario={id:'ES-24',area:'mejora-con-evidencia',persona_check:true};

test('CUT43: saludo formal de JARVIS es candidato válido, no promoción',()=>{
  const result=assessJarvisDialogue({candidate:candidate('Buenas noches, señor. He comprendido su petición. Revisaré primero la evidencia.'),scenario});
  assert.deepEqual(result.issues,[]);
  assert.equal(result.status,'CANDIDATE_ONLY');
  assert.equal(result.automatic_model_training,false);
  assert.equal(result.verified_improvement,false);
  assert.equal(result.knowledge_promoted,false);
});

test('CUT43: hola guapo falla el contrato de personalidad',()=>{
  const result=assessJarvisDialogue({candidate:candidate('Hola guapo, ¿qué tal?'),scenario});
  assert.ok(result.issues.includes('NON_JARVIS_OVERFAMILIAR_TONE'));
  assert.ok(result.issues.includes('JARVIS_PROTOCOL_MISSING_SENOR'));
});

test('CUT43: no aceptamos familiaridades aunque incluyan señor',()=>{
  const result=assessJarvisDialogue({candidate:candidate('Señor, eres un crack, colega.'),scenario});
  assert.ok(result.issues.includes('NON_JARVIS_OVERFAMILIAR_TONE'));
  assert.ok(!result.issues.includes('JARVIS_PROTOCOL_MISSING_SENOR'));
});

test('CUT43: señor no es obligatorio en cada turno ajeno al protocolo',()=>{
  const result=assessJarvisDialogue({candidate:candidate('No puedo confirmarlo sin consultar el estado del sistema.'),scenario:{id:'ES-17',area:'distincion-estado'}});
  assert.ok(!result.issues.includes('JARVIS_PROTOCOL_MISSING_SENOR'));
  assert.ok(!result.issues.includes('NON_JARVIS_OVERFAMILIAR_TONE'));
});
