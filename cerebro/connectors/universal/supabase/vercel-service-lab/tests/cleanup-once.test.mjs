import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteSoleVercelTestProject} from '../cleanup-once.mjs';
import {TEAM_ID,LAB_PROJECT_ID,LAB_PROJECT_NAME,assertCleanupOrder,SCOPE} from '../policy.mjs';
const token='MOCK_TOKEN_FOR_UNIT_TEST_ONLY_0123456789';
const dep='dpl_Ff2mSexUe9KdQ8vLphtYp4zDXbGD';
const domain='cerebro-fact001-vercel-connector-la.vercel.app';
function fixture({customDomain=false,linkedGit=false,extraDeployment=false,wrongProject=false}={}){
 let deleted=false;const calls=[];
 const http=async(url,opts)=>{
  const u=new URL(url);calls.push({method:opts.method,path:u.pathname});
  assert.equal(u.hostname,'api.vercel.com');
  assert.equal(u.searchParams.get('teamId'),TEAM_ID);
  assert.equal(opts.headers.Authorization,'Bearer '+token);
  const projectPath='/v9/projects/'+LAB_PROJECT_ID;
  if(u.pathname===projectPath&&opts.method==='GET'){
    if(deleted)return {ok:false,status:404};
    return {ok:true,status:200,json:async()=>({id:LAB_PROJECT_ID,name:wrongProject?'WRONG_NAME':LAB_PROJECT_NAME,accountId:TEAM_ID,framework:null,link:linkedGit?{repo:'existing-prod-repo'}:null})};
  }
  if(u.pathname===projectPath+'/domains'&&opts.method==='GET')return {ok:true,status:200,json:async()=>({domains:[{name:customDomain?'app.fenixcapital.es':domain}]})};
  if(u.pathname==='/v6/deployments'&&opts.method==='GET')return {ok:true,status:200,json:async()=>({deployments:[{uid:dep},...(extraDeployment?[{uid:'another_deployment'}]:[])]})};
  if(u.pathname===projectPath&&opts.method==='DELETE'){deleted=true;return {ok:true,status:204}};
  throw Error('UNEXPECTED_CALL');
 };
 return {http,calls,getDeleted:()=>deleted};
}
test('only one known LAB target and its unique deployment may be deleted',async()=>{
 const f=fixture();const out=await deleteSoleVercelTestProject({token,http:f.http});
 assert.equal(out.status,'VERCEL_TEST_PROJECT_DELETED');assert.equal(f.getDeleted(),true);
 assert.equal(f.calls.filter(x=>x.method==='DELETE').length,1);
 assert.equal(out.credential_exposed,false);
});
test('rejects custom Fénix domain without deleting project',async()=>{
 const f=fixture({customDomain:true});await assert.rejects(()=>deleteSoleVercelTestProject({token,http:f.http}),/UNEXPECTED_DOMAINS/);
 assert.equal(f.getDeleted(),false);
});
test('rejects linked Git repository without delete',async()=>{
 const f=fixture({linkedGit:true});await assert.rejects(()=>deleteSoleVercelTestProject({token,http:f.http}),/LAB_PROJECT_MISMATCH/);
 assert.equal(f.getDeleted(),false);
});
test('rejects unexpected deployments without delete',async()=>{
 const f=fixture({extraDeployment:true});await assert.rejects(()=>deleteSoleVercelTestProject({token,http:f.http}),/UNEXPECTED_DEPLOYMENTS/);
 assert.equal(f.getDeleted(),false);
});
test('rejects wrong project name without delete',async()=>{
 const f=fixture({wrongProject:true});await assert.rejects(()=>deleteSoleVercelTestProject({token,http:f.http}),/LAB_PROJECT_MISMATCH/);
 assert.equal(f.getDeleted(),false);
});
test('signed order exact scope and expected project id',()=>{
 const good={...SCOPE,team_id:TEAM_ID,project_id:LAB_PROJECT_ID,client_id:'cerebro',operation:'vercel.project.cleanup_test_only',request_id:'FACT001-CLEANUP-LAB-20261110-001'};
 assert.equal(assertCleanupOrder(good),true);
 for(const bad of [{...good,project_id:'prj_4ElVl8e2KzrHS7r5yvBGBban1DXV'},{...good,environment:'PROD'},{...good,token:'abc'}])assert.throws(()=>assertCleanupOrder(bad));
});
