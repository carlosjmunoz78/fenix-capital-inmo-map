import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const old=read('cerebro/rollback/cerebro-console-gateway-v33-20261112/index.ts');
const now=read('cerebro/ops/gateway-health-v34-candidate/index.ts');
const oldHealth='  if (/^(estado|estado de cerebro|salud|health|conexion|estas conectado|esta conectado|cerebro esta conectado)$/.test(text)) {\n    return {status:"OK",intent:"health",executed:false,message:"CEREBRO Gateway está disponible por transporte autenticado. Este canal móvil sigue en LAB y no tiene escrituras PROD directas."};\n  }';
const candidateLine=now.split('\n').find(l=>l.includes('conectad[oa]s?'));
const candidateBlock=now.slice(now.indexOf(candidateLine),now.indexOf(candidateLine)+900).split('\n').slice(0,3).join('\n');
test('one and only one deterministic health branch changed',()=>{
 assert.ok(old.includes(oldHealth));
 assert.equal(old.split(oldHealth).length,2);
 assert.ok(candidateLine);
 assert.ok(candidateBlock.includes('La conversación por texto está conectada'));
 assert.equal(now.replace(candidateBlock,oldHealth),old);
 assert.ok(now.includes('const owner=await authorizedOwner(req);'));
 assert.ok(now.includes('if(!owner.ok)return json(req,403'));
 assert.ok(now.includes('direct_model_access:false'));
 assert.ok(now.includes('prod_execution_enabled:false'));
});
test('health intent detects natural owner queries and rejects unrelated commands',()=>{
 const condition=candidateLine.slice(candidateLine.indexOf('if (')+4,candidateLine.lastIndexOf(') {'));
 const matches=new Function('text','return ('+condition+')');
 const normalize=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^[¿¡?!.]+|[?!.]+$/g,'').trim();
 const yes=['CEREBRO, dime si estás conectado','¿CEREBRO, estás conectado?','dime si estás conectado','¿Estás en línea, CEREBRO?','estado','CEREBRO está conectado','salud','cerebro, sigues funcionando'];
 const no=['conecta cerebro a facebook','prepara la conexion con CRM','quiero un presupuesto de conexion','dime cómo conectar una herramienta'];
 for(const line of yes)assert.ok(matches(normalize(line)),'not recognized: '+line);
 for(const line of no)assert.equal(matches(normalize(line)),false,'wrongly matched: '+line);
});
test('Edge Gateway TypeScript is syntactically valid',()=>{
 assert.ok(stripTypeScriptTypes(now,{mode:'strip'}).length>10000);
});
