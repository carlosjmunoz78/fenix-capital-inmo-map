/** CEREBRO P0-A · official Auth live verification · LAB ONLY.
 * DISARMED by default. No automatic execution in CI, no user/secret output.
 * Use an ephemeral protected runner with credentials from THIS LAB only.
 */
import {randomBytes} from 'node:crypto';
import {runOfficialLabSessionCycle} from './owner-session-auth-cycle-core.mjs';
const REF='hnqlnvakzaywtafeiybt';
const URL='https://'+REF+'.supabase.co';
const ARM='CEREBRO-LAB-SESSION-E2E-ONE-SHOT-'+REF;
const armed=process.env.CEREBRO_LAB_SESSION_E2E_ARM===ARM;
if(!armed){
 console.log('CEREBRO_LAB_SESSION_E2E=DISARMED_NO_ACTION');
}else{
 const adminKey=process.env.CEREBRO_LAB_SERVICE_ROLE_KEY||'';
 const publicKey=process.env.CEREBRO_LAB_PUBLISHABLE_KEY||'';
 const ready=process.env.CEREBRO_LAB_PROJECT_REF===REF&&
  adminKey.length>=30&&publicKey.length>=20&&adminKey!==publicKey&&
  !/\s/.test(adminKey)&&!/\s/.test(publicKey);
 if(!ready){
  console.log('CEREBRO_LAB_SESSION_E2E=BLOCKED_MISSING_LAB_ONLY_CREDENTIALS');
  process.exitCode=2;
 }else{
  let createClient;
  try{({createClient}=await import('@supabase/supabase-js'))}
  catch{
   console.log('CEREBRO_LAB_SESSION_E2E=BLOCKED_SDK_UNAVAILABLE');
   process.exitCode=2;
  }
  if(createClient){
   const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
   const admin=createClient(URL,adminKey,options);
   const userClient=createClient(URL,publicKey,options);
   const email='cerebro-p0a-'+randomBytes(16).toString('hex')+'@example.invalid';
   const password=randomBytes(40).toString('base64url')+'aA7!';
   const result=await runOfficialLabSessionCycle({admin,userClient,email,password});
   if(result.status==='PASS'){
    console.log('CEREBRO_LAB_SESSION_E2E=PASS_LAB_ISSUER_ONLY');
    console.log('PROOF=OFFICIAL_SIGN_IN_THEN_PRIVATE_RPC_TRUE_THEN_OFFICIAL_SIGNOUT_THEN_PRIVATE_RPC_FALSE');
    console.log('TEST_USER_CLEANUP=SUCCESS');
   }else{
    console.log('CEREBRO_LAB_SESSION_E2E=FAILED_CLOSED_STAGE_'+result.stage);
    console.log('CEREBRO_LAB_SESSION_E2E_CLEANUP='+result.cleanup_status);
    process.exitCode=1;
   }
  }
 }
}
