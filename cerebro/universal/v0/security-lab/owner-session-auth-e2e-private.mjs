/** CEREBRO P0-A · official Supabase Auth test cycle · LAB ONLY.
 * DISARMED BY DEFAULT. Never run in CI automatically. Never log credentials,
 * session IDs, JWTs, user IDs or email. No PROD instance/keys.
 * Execute only in a secure temporary runner with isolated LAB-only keys.
 */
import {randomBytes} from 'node:crypto';


const REF='hnqlnvakzaywtafeiybt';
const URL='https://'+REF+'.supabase.co';
const ARM='CEREBRO-LAB-SESSION-E2E-ONE-SHOT-'+REF;
const HOSTILE=/\s/;
const armed=process.env.CEREBRO_LAB_SESSION_E2E_ARM===ARM;
if(!armed){
 console.log('CEREBRO_LAB_SESSION_E2E=DISARMED_NO_ACTION');
} else {
 const adminKey=process.env.CEREBRO_LAB_SERVICE_ROLE_KEY||'';
 const publicKey=process.env.CEREBRO_LAB_PUBLISHABLE_KEY||'';
 const suppliedRef=process.env.CEREBRO_LAB_PROJECT_REF||'';
 const ready=suppliedRef===REF&&adminKey.length>=30&&publicKey.length>=20&&
   !HOSTILE.test(adminKey)&&!HOSTILE.test(publicKey)&&adminKey!==publicKey;
 if(!ready){
  console.log('CEREBRO_LAB_SESSION_E2E=BLOCKED_MISSING_LAB_ONLY_CREDENTIALS');
  process.exitCode=2;
 }else{
  // Lazy import: DISARMED mode must run without dependencies or any network.
  // A secure, armed runner installs the already declared supabase-js dependency.
  const {createClient}=await import('@supabase/supabase-js');
  const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
  const admin=createClient(URL,adminKey,options);
  const userClient=createClient(URL,publicKey,options);
  const email='cerebro-p0a-'+randomBytes(16).toString('hex')+'@example.invalid';
  const password=randomBytes(40).toString('base64url')+'aA7!';
  let createdUserId=null, sessionOpened=false,sessionRevoked=false,cleanupOk=true;
  let stage='create',pass=false;
  const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  async function mustRead(sessionId,userId){
   const {data,error}=await admin.rpc('cerebro_operativa_session_guard_lab_v0',
     {p_session_id:sessionId,p_user_id:userId});
   if(error||typeof data!=='boolean')throw Error('PRIVATE_READER_UNAVAILABLE');
   return data;
  }
  try{
   // Use the official admin API, not direct SQL inserts into auth.users/sessions.
   const made=await admin.auth.admin.createUser({email,password,email_confirm:true,
     app_metadata:{cerebro_lab_only_test:'p0a_auth_session_v1'}});
   // Record even a partial response with a valid user ID, so cleanup can run on error.
   if(uuid(made.data?.user?.id))createdUserId=made.data.user.id;
   if(made.error||!createdUserId)throw Error('OFFICIAL_USER_CREATE_FAILED');
   stage='sign_in';
   const signed=await userClient.auth.signInWithPassword({email,password});
   const accessToken=signed.data?.session?.access_token;
   if(signed.error||typeof accessToken!=='string')throw Error('OFFICIAL_SIGN_IN_FAILED');
   sessionOpened=true;
   stage='jwt_claims';
   const claimRead=await userClient.auth.getClaims(accessToken);
   const claims=claimRead.data?.claims;
   if(claimRead.error||!claims||claims.iss!==URL+'/auth/v1'||
      claims.sub!==createdUserId||!uuid(claims.session_id)||
      claims.aud!=='authenticated'||!Number.isFinite(claims.exp)||
      claims.exp*1000<=Date.now())throw Error('JWT_NOT_VERIFIED');
   stage='owner_bypass_negative';
   // Read via private service-role RPC only. User must never be allowed to
   // call this RPC directly (independently proven by SQL ACL tests).
   const missingSession='00000000-0000-4000-8000-000000000002';
   if(await mustRead(missingSession,createdUserId)!==false)throw Error('MISSING_SESSION_ACCEPTED');
   const wrongOwner='00000000-0000-4000-8000-000000000001';
   if(await mustRead(claims.session_id,wrongOwner)!==false)throw Error('WRONG_OWNER_ACCEPTED');
   stage='active_session';
   if(await mustRead(claims.session_id,createdUserId)!==true)
    throw Error('REAL_SESSION_NOT_RECOGNIZED');
   stage='official_logout';
   const signedOut=await userClient.auth.signOut({scope:'local'});
   if(signedOut.error)throw Error('OFFICIAL_SIGNOUT_FAILED');
   sessionRevoked=true;
   stage='revocation_readback';
   let revoked=false;
   for(let i=0;i<3;i++){
    if(await mustRead(claims.session_id,createdUserId)===false){revoked=true;break}
    // bounded propagation allowance; never turn a failure into a success
    if(i<2)await new Promise(resolve=>setTimeout(resolve,300));
   }
   if(!revoked)throw Error('REVOKED_SESSION_STILL_ACCEPTED');
   pass=true;
  }catch{
   console.log('CEREBRO_LAB_SESSION_E2E=FAILED_CLOSED_STAGE_'+stage.toUpperCase());
   process.exitCode=1;
  }finally{
   // Cleanup ALWAYS, restricted to exactly the user created in this run.
   if(sessionOpened&&!sessionRevoked){
    try{await userClient.auth.signOut({scope:'local'})}catch{}
   }
   if(createdUserId){
    try{const removed=await admin.auth.admin.deleteUser(createdUserId);
     cleanupOk=!removed.error;
    }catch{cleanupOk=false}
   }
   if(!cleanupOk){console.log('CEREBRO_LAB_SESSION_E2E=CLEANUP_FAILED');
    process.exitCode=1;
   }else if(pass){console.log('CEREBRO_LAB_SESSION_E2E=PASS_LAB_ISSUER_ONLY');
    console.log('PROOF=OFFICIAL_SIGN_IN_THEN_PRIVATE_RPC_TRUE_THEN_OFFICIAL_SIGNOUT_THEN_PRIVATE_RPC_FALSE');
    console.log('TEST_USER_CLEANUP=SUCCESS');
   }else console.log('CEREBRO_LAB_SESSION_E2E=NO_PASS');
  }
 }
}