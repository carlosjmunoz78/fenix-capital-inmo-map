import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/CerebroOperativeConsole.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/cerebro-operative-console.css',import.meta.url),'utf8');
test('real workflow names, statuses and audit IDs',()=>{
 assert.ok(ui.includes("return run.workflow_name.trim()||"));
 assert.ok(!ui.includes("return'Trabajo en curso'"));
 assert.ok(ui.includes('En cola de GitHub Actions; todavía no está ejecutándose.'));
 assert.ok(ui.includes('GitHub Actions confirma la ejecución, pero no ha publicado un paso verificable.'));
 assert.ok(ui.includes('run.run_id'));
});
test('chat before jobs and deterministic five-row expansion',()=>{
 assert.ok(ui.indexOf('<section className="operativa-dialogue"')<ui.indexOf('<section className="operativa-stage"'));
 for(const x of ['visibleRuns.slice(0,5)','setExpandedRuns(value=>!value)','setExpandedRuns(false)','displayedRuns.map(','chat.sendText(clean)','transcript.map('])assert.ok(ui.includes(x),x);
 assert.ok(css.includes('.operativa-show-all:focus-visible'));
});
test('owner-only tenant scope and generic native browser voice preserved',()=>{
 for(const x of ["disabled={value!=='fenix'}","if(company!=='fenix')return false",'fetchCerebroActivity()','chat.toggleVoice()'])assert.ok(ui.includes(x),x);
 assert.ok(!ui.includes('requestSubmit('));
});
