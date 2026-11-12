import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../src/CerebroOperativeConsole.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/cerebro-operative-console.css',import.meta.url),'utf8');

test('one chat composer is nested inside the conversation, preceding the list',()=>{
 const chat=ui.indexOf('<section className="operativa-dialogue"');
 const dock=ui.indexOf('<section className="operativa-jarvis-composer"');
 const stage=ui.indexOf('<section className="operativa-stage"');
 assert.ok(chat>0&&dock>chat&&stage>dock);
 assert.equal(ui.split('<section className="operativa-jarvis-composer"').length-1,1);
 assert.ok(css.includes('.operativa-dialogue>.operativa-jarvis-composer{position:relative;'));
 assert.ok(css.includes('.operativa-dialogue .operativa-dictation-error{position:static;'));
 assert.ok(css.includes('bottom:auto'));
});
test('sending button is visible, messages auto-scroll and browser voice is retained',()=>{
 assert.ok(ui.includes('aria-label="Enviar mensaje"'));
 assert.ok(ui.includes("disabled={!snapshot.ready||snapshot.sending||!composer.trim()}"));
 assert.ok(ui.includes('placeholder="Escribe o dicta a CEREBRO…"'));
 assert.ok(ui.includes('log.scrollTop=log.scrollHeight'));
 assert.ok(ui.includes('chat.sendText(clean)'));
 assert.ok(ui.includes('chat.toggleVoice()'));
 assert.ok(ui.includes('toggleDictation'));
 assert.ok(!ui.includes('requestSubmit('));
});
test('rapid clicks cannot send conflicting mode changes or falsely imply outages',()=>{
 for(const name of ['Concentración','Esta noche','Emergencia'])assert.ok(ui.includes("onClick={()=>activateMode('"+name+"')} disabled={!snapshot.ready||snapshot.sending}"),name);
 assert.ok(ui.includes("onClick={()=>changePower(item)} disabled={!snapshot.ready||snapshot.sending}"));
 assert.ok(!ui.includes("No se ha podido enviar la solicitud al Gateway."));
 assert.ok(ui.includes('Solicitud no confirmada. Revisa si ya aparece en la conversación antes de repetirla.'));
});
test('no tenant, Gateway, JARVIS V2 or CRM authorization change',()=>{
 assert.ok(ui.includes("disabled={value!=='fenix'}"));
 assert.ok(ui.includes("if(company!=='fenix')return false"));
 assert.ok(ui.includes('fetchCerebroActivity()'));
 assert.ok(!ui.includes('service_role'));
});
