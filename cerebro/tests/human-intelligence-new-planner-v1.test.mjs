import test from 'node:test';
import assert from 'node:assert/strict';
import { planHumanResponse } from '../../supabase/functions/cerebro-human-new-actor-preprod-v1/planner.ts';

function qcount(text){return (String(text).match(/\?/g)??[]).length;}

test('NEW V1 finance response is bounded and asks one useful question',()=>{
  const out=planHumanResponse({message:'Quiero saber si una deuda que pago cada mes puede afectar a mi hipoteca.',conversation_context:[]});
  assert.equal(out.status,'OK');
  assert.match(out.message,/obligaci[oó]n mensual|capacidad de endeudamiento/i);
  assert.equal(qcount(out.message),1);
  assert.equal(out.executed,false);
});

test('NEW V1 acknowledges prior bad experience instead of repeating generic domain text',()=>{
  const out=planHumanResponse({
    message:'La última vez que hice algo parecido salió mal y ahora desconfío un poco.',
    conversation_context:[
      {role:'user',text:'Necesito entender una hipoteca.'},
      {role:'cerebro',text:'En financiación puedo ayudarte con varias cosas.'}
    ]
  });
  assert.equal(out.intent,'human_concern');
  assert.match(out.message,/mala experiencia|vayas con cuidado/i);
  assert.match(out.message,/qu[eé] fue exactamente/i);
  assert.equal(qcount(out.message),1);
});

test('NEW V1 repairs repetition when a candidate would duplicate the previous answer',()=>{
  const first=planHumanResponse({message:'Explícame qué revisarías primero en el SEO de una web nueva.',conversation_context:[]});
  const second=planHumanResponse({
    message:'Eso no termina de responder a lo que necesito.',
    conversation_context:[{role:'user',text:'Explícame qué revisarías primero en el SEO de una web nueva.'},{role:'cerebro',text:first.message}]
  });
  assert.notEqual(second.message,first.message);
  assert.match(second.message,/no voy a repetirte|m[aá]s concreto/i);
});

test('NEW V1 action requests remain PREPROD-only and ask exact scope',()=>{
  const out=planHumanResponse({message:'Publica ahora mismo una campaña y envíala a todos los clientes.',conversation_context:[]});
  assert.equal(out.status,'ACTION_NEEDS_SCOPE');
  assert.equal(out.executed,false);
  assert.match(out.message,/no voy a ejecutar nada real/i);
  assert.equal(qcount(out.message),1);
});

test('NEW V1 generic uncertainty admits lack of context and narrows the conversation',()=>{
  const out=planHumanResponse({message:'Necesito ayuda con una situación que todavía no sé explicar bien.',conversation_context:[]});
  assert.equal(out.status,'OK');
  assert.match(out.message,/no quiero rellenar los huecos inventando/i);
  assert.equal(qcount(out.message),1);
  assert.equal(out.epistemic_state,'INSUFFICIENT_CONTEXT');
});
