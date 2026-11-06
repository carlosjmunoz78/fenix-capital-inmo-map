import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {closeOwnerGreeting} from '../supabase/functions/cerebro-console-gateway-v0/owner-greeting.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('CUT45 greeting to owner uses formal JARVIS address, no familiarity',()=>{
  const response=closeOwnerGreeting();
  assert.match(response,/señor/i);
  assert.doesNotMatch(response,/guapo|cariño|colega|crack|bro|carlos/i);
  assert.equal(response,closeOwnerGreeting());
});

test('CUT45 consecutive greetings rotate predictably without time or randomness',()=>{
  const first=closeOwnerGreeting();
  const second=closeOwnerGreeting([{role:'cerebro',text:first}]);
  const third=closeOwnerGreeting([{role:'cerebro',text:first},{role:'cerebro',text:second}]);
  const fourth=closeOwnerGreeting([{role:'cerebro',text:first},{role:'cerebro',text:second},{role:'cerebro',text:third}]);
  assert.equal(new Set([first,second,third]).size,3);
  assert.equal(first,fourth);
  for(const item of [second,third])assert.match(item,/señor/i);
});

test('CUT45 user-authored input cannot impersonate assistant greeting count',()=>{
  const first=closeOwnerGreeting();
  assert.equal(closeOwnerGreeting([{role:'user',text:first}]),first);
});

test('CUT45 Gateway imports isolated persona and removes ten hardcoded slang greetings',()=>{
  const source=read('supabase/functions/cerebro-console-gateway-v0/index.ts');
  assert.match(source,/import \{closeOwnerGreeting\} from "\.\/owner-greeting\.ts";/);
  assert.match(source,/intent:"greeting",executed:false,message:closeOwnerGreeting\(conversationContext\)/);
  assert.doesNotMatch(source,/¿Qué tal guapo\?|Hola guapo\.|Aquí estoy guapo|Buenas guapo\./);
  const pref=source.match(/const DEFAULT_PREFERENCES:Record<string,string>=\{([\s\S]*?)\};/)?.[1]||'';
  assert.match(pref,/tone:"executive_formal"/);
  assert.match(pref,/speech_rate:"1\.10"/);
  assert.match(pref,/speech_pitch:"0\.98"/);
});

test('CUT45 no backend security/identity or execution rights are modified',()=>{
  const source=read('supabase/functions/cerebro-console-gateway-v0/index.ts');
  assert.match(source,/auth\.auth\.getUser\(bearer\.slice\(7\)\)/);
  assert.match(source,/actor==="CARLOS-ADMIN"/);
  assert.match(source,/prod_execution_enabled: false/);
  assert.match(source,/trading_access: false/);
  assert.match(source,/confirmation_mode: "EXACT_PROPOSAL_SINGLE_EXPLICIT_YES"/);
  const greeting=read('supabase/functions/cerebro-console-gateway-v0/owner-greeting.ts');
  assert.doesNotMatch(greeting,/fetch\(|createClient|Deno\.env|service_role/i);
});
