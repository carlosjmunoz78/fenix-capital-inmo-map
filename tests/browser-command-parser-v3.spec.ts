import {expect,test} from '@playwright/test';
import {evaluateBrowserPostcondition,parseBrowserCommand} from '../cerebro/runtime/browser-command-parser-v3';

test('parses a multi-tab natural language order into one OPEN_TAB command per URL',()=>{
 const parsed=parseBrowserCommand('Abre 5 pestañas en tu navegador. Entra en example.com, fenixcapital.es, wikipedia.org, openai.com y google.es. Déjalas todas abiertas y confirma cuando estén cargadas.');
 expect(parsed.ok).toBeTruthy();
 if(!parsed.ok)return;
 expect(parsed.commands).toHaveLength(5);
 expect(parsed.commands.map(command=>command.command_type)).toEqual(['OPEN_TAB','OPEN_TAB','OPEN_TAB','OPEN_TAB','OPEN_TAB']);
 expect(parsed.commands.map(command=>command.payload.url)).toEqual([
  'https://example.com/',
  'https://fenixcapital.es/',
  'https://wikipedia.org/',
  'https://openai.com/',
  'https://google.es/',
 ]);
 expect(parsed.postcondition).toEqual({
  kind:'URLS_OPEN',
  urls:['https://example.com/','https://fenixcapital.es/','https://wikipedia.org/','https://openai.com/','https://google.es/'],
 });
});

test('URLS_OPEN postcondition only completes when every requested destination is present',()=>{
 const postcondition={kind:'URLS_OPEN' as const,urls:['https://example.com/','https://fenixcapital.es/','https://openai.com/']};
 expect(evaluateBrowserPostcondition(postcondition,{tabs:[{url:'https://example.com/'},{url:'https://fenixcapital.es/'},{url:'https://openai.com/es-ES/'}]})).toEqual({state:'SATISFIED'});
 expect(evaluateBrowserPostcondition(postcondition,{tabs:[{url:'https://example.com/'},{url:'https://fenixcapital.es/'}]})).toEqual({state:'PENDING'});
});

test('keeps Google anti-automation fail-closed for URLS_OPEN',()=>{
 const result=evaluateBrowserPostcondition({kind:'URLS_OPEN',urls:['https://google.es/']},{tabs:[{url:'https://www.google.com/sorry/index?continue=x'}]});
 expect(result).toEqual({state:'FAILED',error:'EXTERNAL_SITE_AUTOMATION_BLOCKED'});
});

test('preserves the existing Google search parser and postcondition',()=>{
 const parsed=parseBrowserCommand('Abre una pestaña nueva, entra en https://www.google.es/, busca “Fénix Capital Córdoba” y deja los resultados abiertos.');
 expect(parsed.ok).toBeTruthy();
 if(!parsed.ok)return;
 expect(parsed.commands).toHaveLength(1);
 expect(parsed.commands[0].command_type).toBe('OPEN_TAB');
 expect(parsed.commands[0].payload.url).toBe('https://www.google.es/search?q=F%C3%A9nix%20Capital%20C%C3%B3rdoba');
 expect(parsed.postcondition).toEqual({kind:'GOOGLE_RESULTS',query:'Fénix Capital Córdoba'});
});

test('rejects a numeric tab count that does not match the URL list',()=>{
 expect(parseBrowserCommand('Abre 5 pestañas y entra en example.com y fenixcapital.es')).toEqual({ok:false,error:'NUMERO_PESTANAS_NO_COINCIDE_CON_URLS'});
});

test('keeps the single-tab command working',()=>{
 const parsed=parseBrowserCommand('Abre una pestaña nueva y entra en https://example.com/');
 expect(parsed.ok).toBeTruthy();
 if(!parsed.ok)return;
 expect(parsed.commands).toEqual([{command_type:'OPEN_TAB',payload:{url:'https://example.com/'}}]);
 expect(parsed.postcondition).toEqual({kind:'URLS_OPEN',urls:['https://example.com/']});
});
