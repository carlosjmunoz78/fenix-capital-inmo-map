import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBrowserPostcondition,parseBrowserCommand} from '../runtime/browser-command-parser-v3.ts';

test('multi-tab natural language order creates one OPEN_TAB per URL',()=>{
  const parsed=parseBrowserCommand('Abre 5 pestañas en tu navegador. Entra en example.com, fenixcapital.es, wikipedia.org, openai.com y google.es. Déjalas todas abiertas y confirma cuando estén cargadas.');
  assert.equal(parsed.ok,true);
  if(!parsed.ok)return;
  assert.equal(parsed.commands.length,5);
  assert.deepEqual(parsed.commands.map(command=>command.command_type),['OPEN_TAB','OPEN_TAB','OPEN_TAB','OPEN_TAB','OPEN_TAB']);
  assert.deepEqual(parsed.commands.map(command=>command.payload.url),[
    'https://example.com/',
    'https://fenixcapital.es/',
    'https://wikipedia.org/',
    'https://openai.com/',
    'https://google.es/',
  ]);
  assert.deepEqual(parsed.postcondition,{
    kind:'URLS_OPEN',
    urls:['https://example.com/','https://fenixcapital.es/','https://wikipedia.org/','https://openai.com/','https://google.es/'],
  });
});

test('URLS_OPEN only completes when all requested destinations are present',()=>{
  const postcondition={kind:'URLS_OPEN',urls:['https://example.com/','https://fenixcapital.es/','https://openai.com/']};
  assert.deepEqual(evaluateBrowserPostcondition(postcondition,{tabs:[{url:'https://example.com/'},{url:'https://fenixcapital.es/'},{url:'https://openai.com/es-ES/'}]}),{state:'SATISFIED'});
  assert.deepEqual(evaluateBrowserPostcondition(postcondition,{tabs:[{url:'https://example.com/'},{url:'https://fenixcapital.es/'}]}),{state:'PENDING'});
});

test('Google anti-automation remains fail-closed',()=>{
  assert.deepEqual(
    evaluateBrowserPostcondition({kind:'URLS_OPEN',urls:['https://google.es/']},{tabs:[{url:'https://www.google.com/sorry/index?continue=x'}]}),
    {state:'FAILED',error:'EXTERNAL_SITE_AUTOMATION_BLOCKED'},
  );
});

test('existing Google search command remains supported',()=>{
  const parsed=parseBrowserCommand('Abre una pestaña nueva, entra en https://www.google.es/, busca “Fénix Capital Córdoba” y deja los resultados abiertos.');
  assert.equal(parsed.ok,true);
  if(!parsed.ok)return;
  assert.equal(parsed.commands.length,1);
  assert.equal(parsed.commands[0].command_type,'OPEN_TAB');
  assert.equal(parsed.commands[0].payload.url,'https://www.google.es/search?q=F%C3%A9nix%20Capital%20C%C3%B3rdoba');
  assert.deepEqual(parsed.postcondition,{kind:'GOOGLE_RESULTS',query:'Fénix Capital Córdoba'});
});

test('numeric tab count must match the URL list',()=>{
  assert.deepEqual(parseBrowserCommand('Abre 5 pestañas y entra en example.com y fenixcapital.es'),{ok:false,error:'NUMERO_PESTANAS_NO_COINCIDE_CON_URLS'});
});

test('single-tab command remains supported',()=>{
  const parsed=parseBrowserCommand('Abre una pestaña nueva y entra en https://example.com/');
  assert.equal(parsed.ok,true);
  if(!parsed.ok)return;
  assert.deepEqual(parsed.commands,[{command_type:'OPEN_TAB',payload:{url:'https://example.com/'}}]);
  assert.deepEqual(parsed.postcondition,{kind:'URLS_OPEN',urls:['https://example.com/']});
});
