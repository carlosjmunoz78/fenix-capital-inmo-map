/** B6 CUT01 — allowlisted GitHub read adapter for LAB-only REAL connector probe.
 * No generic web navigation, write verbs, user-selected URLs, tokens in results, or PROD.
 * Trusted CI worker supplies its own short-lived read-only GITHUB_TOKEN and pinned SHA.
 */
import {createHash} from 'node:crypto';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const PATH='zeus/jarvis/STATE_B5_CUT04_2026-11-04.json';
const COMMIT=/^[0-9a-f]{40}$/;
const BLOB=/^[0-9a-f]{40}$/;
const MAX_BYTES=20000;
const sha=x=>createHash('sha1').update(Buffer.from('blob '+x.length+'\0')).update(x).digest('hex');
const evidence=x=>createHash('sha256').update(x).digest('hex');
export function createJarvisB6AllowlistedGitHubRead({token,commitSha,fetchImpl=fetch}={}){
 if(typeof token!=='string'||token.length<10||!COMMIT.test(commitSha)||
   typeof fetchImpl!=='function')throw Error('B6_TRUSTED_GITHUB_CONFIG_REQUIRED');
 // Absolute trusted URL. No URL, path, ref, repository or credential taken from mission text.
 const url='https://api.github.com/repos/'+REPO+'/contents/'+PATH+'?ref='+commitSha;
 return Object.freeze({
  id:'jarvis-b6-allowlisted-github-read',companyId:'fenix',environment:'LAB',
  capability:'GITHUB_FILE_READ',route:'API',operation:'READ',
  estimatedEuro:0,sideEffectFree:true,dataBoundary:'LOCAL_PRIVATE',
  async read({companyId,environment,capability,connectorId}={}){
   if(companyId!=='fenix'||environment!=='LAB'||capability!=='GITHUB_FILE_READ'||
     connectorId!=='jarvis-b6-allowlisted-github-read')
    throw Error('B6_CONNECTOR_SCOPE_DENIED');
   const response=await fetchImpl(url,{method:'GET',redirect:'error',
    signal:AbortSignal.timeout(12000),
    headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
      'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'ZEUS-JARVIS-B6-CI-LAB'}});
   if(response?.ok!==true||response.status!==200)throw Error('B6_GITHUB_READ_UNAVAILABLE');
   const raw=await response.json();
   if(raw?.type!=='file'||raw.path!==PATH||!BLOB.test(raw.sha)||
     raw.encoding!=='base64'||typeof raw.content!=='string'||
     raw.size<1||raw.size>MAX_BYTES)throw Error('B6_GITHUB_FILE_CONTRACT_INVALID');
   const bytes=Buffer.from(raw.content.replace(/\s+/g,''),'base64');
   if(bytes.length!==raw.size||bytes.length>MAX_BYTES||sha(bytes)!==raw.sha)
    throw Error('B6_GITHUB_BLOB_INTEGRITY_FAILED');
   const decoder=new TextDecoder('utf-8',{fatal:true});
   return Object.freeze({repository:REPO,path:PATH,commitSha,blobSha:raw.sha,
     contentUtf8:decoder.decode(bytes),size:bytes.length});
  }
 });
}
export function createJarvisB6GitHubStateVerifier({commitSha}={}){
 if(!COMMIT.test(commitSha))throw Error('B6_EXPECTED_COMMIT_REQUIRED');
 return Object.freeze({async verify({result,companyId,environment,capability,connectorId}={}){
  if(companyId!=='fenix'||environment!=='LAB'||capability!=='GITHUB_FILE_READ'||
    connectorId!=='jarvis-b6-allowlisted-github-read'||result?.repository!==REPO||
    result?.path!==PATH||result?.commitSha!==commitSha||
    typeof result?.contentUtf8!=='string'||result.contentUtf8.length>MAX_BYTES)
   return{verified:false};
  const bytes=Buffer.from(result.contentUtf8,'utf8');
  if(bytes.length!==result.size||sha(bytes)!==result.blobSha)return{verified:false};
  let parsed;
  try{parsed=JSON.parse(result.contentUtf8);}catch{return{verified:false};}
  if(parsed?.project_id!=='PRJ-SUPERAGENT-001'||parsed?.cut!=='B5_CUT_04_REMOTE'||
    parsed?.status!=='PARCIAL_LAB_CI_GREEN_PROD_OFF')
   return{verified:false};
  return Object.freeze({verified:true,evidenceHash:evidence(bytes),
    summary:'Verified pinned GitHub JARVIS B5 CUT04 state via read-only API (synthetic LAB identity).'});
 }});
}
