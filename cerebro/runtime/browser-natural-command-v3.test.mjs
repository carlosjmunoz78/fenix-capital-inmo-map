import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseBrowserCommand} from '../../src/cerebroBrowserCommand.ts';

test('exact Carlos command becomes one governed Google results tab',()=>{
 const p=parseBrowserCommand('Abre una pestaña nueva, entra en https://www.google.es/, busca “Fénix Capital Córdoba” y deja los resultados abiertos.');
 assert.equal(p.ok,true);if(!p.ok)return;assert.equal(p.commands.length,1);assert.equal(p.commands[0].command_type,'OPEN_TAB');assert.match(String(p.commands[0].payload.url),/^https:\/\/www\.google\.es\/search\?q=/);assert.equal(new URL(String(p.commands[0].payload.url)).searchParams.get('q'),'Fénix Capital Córdoba');
});
test('basic browser commands stay deterministic',()=>{for(const [text,type] of [['abre una pestaña nueva','OPEN_TAB'],['cierra la pestaña','CLOSE_TAB'],['ve atrás','BACK'],['adelante','FORWARD'],['recarga la página','RELOAD']]){const p=parseBrowserCommand(text);assert.equal(p.ok,true);if(p.ok)assert.equal(p.commands[0].command_type,type);}});
test('browser console cannot silently bridge to hidden general chat',()=>{const src=fs.readFileSync('src/CerebroBrowserConsole.tsx','utf8');assert.doesNotMatch(src,/setReactTextareaValue\(/);assert.doesNotMatch(src,/\.cerebro-chat-form/);assert.match(src,/owner\/command/);assert.match(src,/commandStatus/);assert.match(src,/COMPLETADA/);});
test('edge supports CEREBRO queue and segregates actors',()=>{const src=fs.readFileSync('supabase/functions/cerebro-browser-interactive-v3/index.ts','utf8');assert.match(src,/owner\/command/);assert.match(src,/owner\/command-status/);assert.match(src,/actor:'CEREBRO'/);assert.match(src,/\.eq\('actor',actor\)/);assert.match(src,/AI_ACTION/);assert.match(src,/AI_ACTION_RESULT/);});
