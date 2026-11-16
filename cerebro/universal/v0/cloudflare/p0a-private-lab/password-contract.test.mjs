import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {runLabP0ACycle,LAB_REF} from './cycle.mjs';
const synthetic='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role:'service_role',ref:LAB_REF})).toString('base64url')+'.mock';
const env={CEREBRO_P0A_ENABLED:'true',CEREBRO_LAB_PROJECT_REF:LAB_REF,
 CEREBRO_LAB_SERVICE_ROLE_KEY:synthetic,
 CEREBRO_LAB_PUBLISHABLE_KEY:'sb_publishable_'+'X'.repeat(40)};
test('LAB temporary credential complies with Supabase Auth password length',async()=>{
 let captured=0;
 const fake=async(url,opt)=>{
  const p=new URL(url).pathname;
  if(p.includes('/rpc/cerebro_operativa_session_guard_lab_v0'))return Response.json(false);
  if(p.endsWith('/admin/users')&&opt.method==='POST'){
   const b=JSON.parse(opt.body);
   assert.equal(b.password.length,48);
   assert.ok(new TextEncoder().encode(b.password).length<=72);
   assert.match(b.password,/[A-Z]/);assert.match(b.password,/[a-z]/);
   assert.match(b.password,/[0-9]/);assert.match(b.password,/[^A-Za-z0-9]/);
   assert.match(b.email,/^cerebro-p0a-[a-f0-9]+@fenixcapital\.es$/);
   assert.equal(b.email_confirm,true);
   captured++;
   return Response.json({}); // fail closed; mock never creates real user
  }
  throw Error('unexpected route');
 };
 const v=await runLabP0ACycle(env,fake);
 assert.equal(captured,1);
 assert.equal(v.status,'FAIL_CLOSED');assert.equal(v.stage,'CREATE');
 assert.equal(v.temp_user_cleanup,'NOT_NEEDED');
});
test('disabled LAB creates no temporary credentials',async()=>{
 let calls=0;
 const v=await runLabP0ACycle({...env,CEREBRO_P0A_ENABLED:'false'},async()=>{calls++;});
 assert.equal(v.status,'BLOCKED_DISABLED');assert.equal(calls,0);
});
