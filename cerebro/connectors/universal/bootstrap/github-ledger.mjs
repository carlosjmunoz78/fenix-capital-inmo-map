/**
 * FACT-001 GitHub git-ref ledger: persistent, atomic create-once claim for a single
 * Cloudflare LAB resource. Does not use Supabase, existing D1, or paid services.
 * No automatic retry after an unknown result. This implementation is scoped to
 * the fixed Facebook EU D1 intent ref until full registry support is certified.
 */
import { createHash } from 'node:crypto';

const REF='refs/heads/cerebro-ledger/facebook-d1-eu-create-v0';
const PREFIX='CEREBRO_D1_EU_LEDGER_V1';
const API='https://api.github.com';
const FINGERPRINT_RE=/^[0-9a-f]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const EXPECTED_KEY='github-actions:iam:fenix-owner-lab:fenix-capital:LAB:facebook-eu-create-v0';

export function fingerprintOf(value){ return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export class LedgerError extends Error {constructor(code){super(code);this.code=code;}}

export class GitHubRefLedger {
  constructor({token,repo,baseCommit,http=fetch}={}){
    if(typeof token!=='string'||!token.trim())throw new LedgerError('GITHUB_TOKEN_MISSING');
    if(repo!=='carlosjmunoz78/fenix-capital-inmo-map')throw new LedgerError('REPO_MISMATCH');
    if(!/^[a-f0-9]{40}$/.test(baseCommit??''))throw new LedgerError('INVALID_BASE_COMMIT');
    if(typeof http!=='function')throw new LedgerError('INVALID_HTTP');
    this.token=token;this.repo=repo;this.baseCommit=baseCommit;this.http=http;this.durable=true;
  }
  async #request(method,path,body,{accept404=false,accept422=false}={}){
    const r=await this.http(`${API}/repos/${this.repo}${path}`,{
      method,redirect:'error',headers:{'Authorization':`Bearer ${this.token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)
    });
    if(r.status===404&&accept404)return {notFound:true};
    if(r.status===422&&accept422)return {alreadyExists:true};
    if(!r.ok)throw new LedgerError(`GITHUB_HTTP_${r.status}`);
    return r.json();
  }
  async #getState(){
    const result=await this.#request('GET',`/git/ref/${REF.slice(5)}`,undefined,{accept404:true});
    if(result.notFound)return null;
    const sha=result?.object?.sha;
    if(!/^[0-9a-f]{40}$/.test(sha??''))throw new LedgerError('INVALID_LEDGER_REF');
    const commit=await this.#request('GET',`/git/commits/${sha}`);
    const message=commit?.message??'';
    if(!message.startsWith(`${PREFIX}\n`))throw new LedgerError('UNRECOGNIZED_LEDGER_CONTENT');
    let value;
    try{value=JSON.parse(message.slice(PREFIX.length+1));}catch{throw new LedgerError('INVALID_LEDGER_CONTENT');}
    if(!FINGERPRINT_RE.test(value?.fingerprint??'')||!['CLAIMED','COMPLETE'].includes(value?.status)||value?.key!==EXPECTED_KEY)throw new LedgerError('LEDGER_SCHEMA_CONFLICT');
    return {sha,...value};
  }
  async claim(key,fingerprint){
    if(key!==EXPECTED_KEY||!FINGERPRINT_RE.test(fingerprint??''))throw new LedgerError('UNEXPECTED_CLAIM');
    const existing=await this.#getState();
    if(existing)return this.#decision(existing,fingerprint);
    const base=await this.#request('GET',`/git/commits/${this.baseCommit}`);
    if(!/^[0-9a-f]{40}$/.test(base?.tree?.sha??''))throw new LedgerError('BASE_TREE_UNTRUSTED');
    const commit=await this.#request('POST','/git/commits',{
      message:`${PREFIX}\n${JSON.stringify({key,fingerprint,status:'CLAIMED',target:'cerebro-facebook-autoqual-lab',jurisdiction:'eu'})}`,
      tree:base.tree.sha,parents:[this.baseCommit]
    });
    if(!/^[a-f0-9]{40}$/.test(commit?.sha??''))throw new LedgerError('INTENT_COMMIT_INVALID');
    const created=await this.#request('POST','/git/refs',{ref:REF,sha:commit.sha},{accept422:true});
    if(created.alreadyExists){const competing=await this.#getState();if(!competing)throw new LedgerError('CLAIM_RACE_UNRESOLVED');return this.#decision(competing,fingerprint);}
    if(created.ref!==REF)throw new LedgerError('CLAIM_NOT_VERIFIED');
    return {status:'CLAIMED'};
  }
  #decision(state,fingerprint){
    if(state.fingerprint!==fingerprint)return {status:'CONFLICT'};
    if(state.status==='COMPLETE')return {status:'REPLAY',result:state.result};
    return {status:'PENDING'}; // fail-closed; no second POST after any uncertain result
  }
  async complete(key,fingerprint,result){
    if(key!==EXPECTED_KEY||!FINGERPRINT_RE.test(fingerprint??'')||!['COMPLETED','ALREADY_EXISTS_VERIFIED'].includes(result?.status)||result?.name!=='cerebro-facebook-autoqual-lab'||result?.jurisdiction!=='eu'||!UUID.test(result?.uuid??''))throw new LedgerError('INVALID_COMPLETION');
    const existing=await this.#getState();
    if(!existing||existing.fingerprint!==fingerprint||existing.status!=='CLAIMED')throw new LedgerError('CLAIM_STATE_CONFLICT');
    const parent=await this.#request('GET',`/git/commits/${existing.sha}`);
    const commit=await this.#request('POST','/git/commits',{
      message:`${PREFIX}\n${JSON.stringify({key,fingerprint,status:'COMPLETE',result:{status:result.status,name:result.name,jurisdiction:result.jurisdiction,uuid:result.uuid}})}`,
      tree:parent.tree.sha,parents:[existing.sha]
    });
    if(!/^[a-f0-9]{40}$/.test(commit?.sha??''))throw new LedgerError('COMPLETION_COMMIT_INVALID');
    const changed=await this.#request('PATCH',`/git/refs/${REF.slice(5)}`,{sha:commit.sha,force:false});
    if(changed?.object?.sha!==commit.sha)throw new LedgerError('COMPLETION_NOT_VERIFIED');
    const final=await this.#getState();
    if(final?.status!=='COMPLETE'||final?.result?.uuid!==result.uuid)throw new LedgerError('COMPLETION_READBACK_FAILED');
  }
}