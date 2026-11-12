import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerWithVerifiedActivity,classifyActivityQuestion} from '../cerebro/ops/gateway-v35-conversation/activity_reader.ts';

const repo='carlosjmunoz78/fenix-capital-inmo-map';
const now=new Date().toISOString(),past=new Date(Date.now()-3600000).toISOString();
const makeRun=(id,status,name,conclusion=null,created=now)=>({
 run_id:id,workflow_name:name,status,conclusion,company_id:'fenix',source:'GITHUB_ACTIONS',
 html_url:'https://github.com/'+repo+'/actions/runs/'+id,created_at:created,updated_at:now
});
const sample=()=>({status:'OK',source_status:'CACHED',observed_at:now,repository:repo,runs:[
 makeRun(101,'in_progress','CEREBRO Engine Factory'),
 makeRun(102,'in_progress','CEREBRO Browser'),
 makeRun(103,'queued','CEREBRO Social',null,past),
 makeRun(104,'completed','CEREBRO SEO Gate','success'),
 makeRun(105,'completed','CEREBRO Security Gate','failure'),
 {...makeRun(106,'queued','AION foreign job'),company_id:'aion'},
 {...makeRun(107,'queued','Invalid link'),html_url:'https://evil.example.com/'}
]});
const request=()=>new Request('https://example.com/health',{headers:{authorization:'Bearer owner_jwt_example',apikey:'sb_publishable_test'}});
function source(payload=sample()){
 return async(url,opts)=>{
  assert.equal(url,'https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/');
  assert.equal(opts.method,'GET');
  assert.equal(opts.headers.Authorization,'Bearer owner_jwt_example');
  assert.equal(opts.headers.apikey,'sb_publishable_test');
  assert.equal(opts.headers['service_role'],undefined);
  return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}});
 };
}
test('natural work questions have the right read-only intent, no action hijacks',()=>{
 const examples=[
  ['¿Cuántos trabajos hay ahora en ejecución, cuántos esperando y cuándo se comprobaron?','summary'],
  ['Dime los nombres reales de los tres trabajos más recientes que siguen ejecutándose.','running'],
  ['¿Qué trabajo lleva más tiempo esperando y por qué?','oldest'],
  ['¿Cuál fue el último trabajo terminado y dónde puedo ver su resultado?','recent'],
  ['¿Hay algún fallo, bloqueo o decisión que requiera mi intervención?','incidents'],
  ['¿Qué está haciendo CEREBRO ahora?','summary'],
 ];
 for(const [q,expected] of examples)assert.equal(classifyActivityQuestion(q),expected,q);
 for(const q of [
  'Activa todas las tareas','Borra los trabajos','Prepara nuevas tareas de esta noche',
  'Muéstrame los trabajos de AION','¿Cuántos trabajos de CAPTACASA hay?'
 ])assert.equal(classifyActivityQuestion(q),null,q);
});
test('live owner status derives exact counts and has timestamp; no fabricated work',async()=>{
 const result=await answerWithVerifiedActivity(request(),'¿Cuántos trabajos hay ahora en ejecución, cuántos esperando?',source());
 assert.equal(result.status,'OK');
 assert.equal(result.intent,'work_activity_summary');
 assert.equal(result.executed,false);
 assert.match(result.message,/2 ejecuciones en curso y 1 en cola/);
 assert.match(result.message,/no es streaming/);
 assert.equal(result.source.repository,repo);
 assert.equal(result.source.observed_at,now);
});
test('execution names, oldest queue, last result, and errors come from real rows',async()=>{
 const run=await answerWithVerifiedActivity(request(),'Dime los nombres de los trabajos en ejecución',source());
 assert.match(run.message,/CEREBRO Engine Factory/);
 assert.ok(!run.message.includes('AION foreign job'));
 const old=await answerWithVerifiedActivity(request(),'¿Qué trabajo lleva más tiempo esperando y por qué?',source());
 assert.match(old.message,/CEREBRO Social/);
 assert.match(old.message,/No dispongo de una causa verificada/);
 const recent=await answerWithVerifiedActivity(request(),'¿Cuál fue el último trabajo terminado?',source());
 assert.match(recent.message,/https:\/\/github.com\/carlosjmunoz78/);
 const incidents=await answerWithVerifiedActivity(request(),'¿Hay algún fallo, bloqueo o decisión que requiera mi intervención?',source());
 assert.match(incidents.message,/fuente NO cubre todas las decisiones/);
});
test('stale, invalid, unauthenticated and failing sources always fail closed',async()=>{
 const stale={...sample(),observed_at:new Date(Date.now()-25*60000).toISOString()};
 const s=await answerWithVerifiedActivity(request(),'¿Cuántos trabajos hay en curso?',source(stale));
 assert.equal(s.status,'ERROR');
 assert.equal(s.reason,'ACTIVITY_SNAPSHOT_STALE');
 assert.doesNotMatch(s.message,/2 ejecuciones/);
 const other={...sample(),repository:'other-org/other'};
 const wrong=await answerWithVerifiedActivity(request(),'¿Cuántos trabajos hay?',source(other));
 assert.equal(wrong.status,'ERROR');
 const unauthed=new Request('https://example.com/health');
 const blocked=await answerWithVerifiedActivity(unauthed,'¿Cuántos trabajos hay?',async()=>{throw Error('must not fetch')});
 assert.equal(blocked.status,'ERROR');
 assert.equal(blocked.reason,'OWNER_TOKEN_OR_PUBLIC_KEY_MISSING');
 const offline=await answerWithVerifiedActivity(request(),'¿Cuántos trabajos hay?',async()=>{throw Error('network')});
 assert.equal(offline.status,'ERROR');
});
