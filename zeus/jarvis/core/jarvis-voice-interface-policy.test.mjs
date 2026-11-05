import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCerebroVoiceSurface} from '../../../src/jarvisVoiceSurfacePolicy.ts';

for(const companyId of ['fenix','aion','captacasa'])for(const view of ['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR','V0']){
  test('JARVIS V2 in '+companyId+' / '+view,()=>{
    const r=resolveCerebroVoiceSurface({pathname:'/cerebro/',view,host:'FENIX_APP',companyId});
    assert.equal(r.owner,'JARVIS_V2');
    assert.equal(r.rate,1.10);
    assert.equal(r.pitchSemitones,0.6);
    assert.equal(r.canSynthesize,false);
    assert.equal(r.providerCalled,false);
    assert.equal(r.spentEuro,0);
    assert.equal(r.prodAuthorized,false);
    assert.equal(Object.isFrozen(r),true);
  });
}
for(const path of ['/inicio','/expedientes','/chat','/perfil']){
  test('ANA preserved on Fenix App '+path,()=>{
    const r=resolveCerebroVoiceSurface({pathname:path,view:'JARVIS',host:'FENIX_APP',companyId:'fenix'});
    assert.equal(r.owner,'ANA');assert.equal(r.canSynthesize,false);
  });
}
for(const input of [
  {pathname:'/cerebro-malicious',view:'JARVIS',host:'CEREBRO_CONSOLE',companyId:'fenix'},
  {pathname:'/cerebro',view:'UNKNOWN',host:'FENIX_APP',companyId:'fenix'},
  {pathname:'/cerebro',view:'JARVIS',host:'OTHER',companyId:'fenix'},
  {pathname:'/cerebro',view:'JARVIS',host:'FENIX_APP',companyId:'fenix;drop'},
  {pathname:'https://evil.example/cerebro',view:'JARVIS',host:'FENIX_APP',companyId:'fenix'},
  {pathname:'/inicio',view:'JARVIS',host:'OTHER',companyId:'fenix'},
  {pathname:'//cerebro',view:'JARVIS',host:'FENIX_APP',companyId:'fenix'},
])test('unknown / unsafe surface denied '+JSON.stringify(input),()=>{
  const r=resolveCerebroVoiceSurface(input);
  assert.equal(r.owner,'DENY');assert.equal(r.canSynthesize,false);assert.equal(r.spentEuro,0);
});
