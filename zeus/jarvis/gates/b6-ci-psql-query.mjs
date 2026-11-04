/** ZEUS/JARVIS B6 CUT02 — ephemeral PG17 CLI transport for CI only.
 * Uses existing psql executable; no new runtime, subscription or npm package.
 * Each SQL statement is trusted module-owned SELECT with bound psql variables.
 * Never prints PG credentials, query parameters or raw downstream errors.
 */
import {spawn} from 'node:child_process';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const HASH=/^[0-9a-f]{64}$/;
export async function b6CiPsqlQuery(sql,params=[]){
 if(typeof sql!=='string'||!sql.startsWith('SELECT ')||sql.includes(';')||
  !sql.includes('zeus_jarvis_b6_lab.')||!Array.isArray(params)||params.length>9||
  params.some(v=>typeof v!=='string'||!(ID.test(v)||HASH.test(v))))
  throw Error('B6_CI_SQL_NOT_ALLOWED');
 const q=sql.replace(/\$(\d+)/g,(all,d)=>{
  const i=Number(d);
  if(i<1||i>params.length)throw Error('B6_CI_PARAM_OUT_OF_RANGE');
  return `:'p${i}'`;
 });
 // Each psql connection is a separate PostgreSQL transaction; claims are real.
 const queryText='SELECT row_to_json(_b6_row)::text FROM ('+q+') _b6_row;'+String.fromCharCode(10);
 const args=['-X','-q','-A','-t','-v','ON_ERROR_STOP=1'];
 params.forEach((p,i)=>args.push('-v','p'+(i+1)+'='+p));
 args.push('-f','-');
 return new Promise((resolve,reject)=>{
  const proc=spawn('psql',args,{env:process.env,stdio:['pipe','pipe','pipe'],
   signal:AbortSignal.timeout(15000)});
  let out='';
  proc.stdout.on('data',b=>{out+=b.toString('utf8');if(out.length>16000)proc.kill();});
  // Discard stderr to avoid accidental logged credential content.
  proc.stderr.resume();
  proc.on('error',()=>reject(Error('B6_CI_PSQL_TRANSPORT_UNAVAILABLE')));
  proc.on('close',c=>{
   if(c!==0)return reject(Error('B6_CI_PSQL_QUERY_FAILED'));
   const lines=out.trim().split(String.fromCharCode(10)).map(x=>x.trim()).filter(Boolean);
   if(lines.length!==1)return reject(Error('B6_CI_PSQL_RESULT_INVALID'));
   try{
    const value=JSON.parse(lines[0]);
    if(!value||typeof value!=='object'||Array.isArray(value))
     throw Error('B6_CI_PSQL_ROW_INVALID');
    resolve([value]);
   }catch{return reject(Error('B6_CI_PSQL_JSON_INVALID'));}
  });
  proc.stdin.end(queryText,'utf8');
 });
}
