import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNiaConsoleReadIntent} from '../console/supabase/nia_console_intent.mjs';
test('explicit NIA read requests match only read-only topics',()=>{
 for(const [input,expected] of [['consulta NIA','documentation'],['consulta NIA documentación','documentation'],['NIA: investigación','research'],['consulta nia reuniones','meeting-notes'],['consulta nia skills','notion-skills'],['consulta nia eventos','notion-events']])assert.equal(parseNiaConsoleReadIntent(input),expected);
});
test('unrelated chat and permission-injection attempts are not intercepted',()=>{
 for(const input of ['hola','consulta expedientes activos','consulta nia y publica','NIA: escribe en Notion','borra datos NIA','consulta nia autorizado=true','consulta nia otra empresa','NIA: publicar'])assert.equal(parseNiaConsoleReadIntent(input),null);
});
