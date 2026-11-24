// Candidate pure adapter for existing CP08 pipeline. No network, ledger writes or dispatch.
import {createHash,createPublicKey,publicEncrypt,privateDecrypt,randomBytes,createCipheriv,createDecipheriv,constants} from 'node:crypto';
import {AUTH,score} from './skill-oracle.mjs';
export const config=Object.freeze({model:'nvidia/nemotron-3-ultra-550b-a55b:free',provider:'nvidia',max_tokens:1536,temperature:0,neutral:'Resuelve el caso sintético proporcionado. No tienes herramientas ni autorización de ejecutar acciones externas. Distingue propuestas de hechos verificados; explica tu decisión y sus límites.'});
const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])):x;
const canonical=x=>JSON.stringify(sorted(x));
export const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const shaText=x=>createHash('sha256').update(x,'utf8').digest('hex');
const check=(ok,reason)=>{if(!ok)throw Error(reason)};
const exact=(x,keys)=>x&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const secret=/sk-or-v1-[a-fA-F0-9]{64}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sb_secret_[a-zA-Z0-9_-]{12,}/;
const arms=new Set(['GPT_BASE','CHAMPION','EXTERNAL','CHALLENGER']);
function validate(p,a){
 check(exact(p,['version','id','arm','skill_text','question','synthetic_only','authorization','public_key']),'PACKET_FIELDS');
 check(p.version===2&&typeof p.id==='string'&&/^eval-[a-z0-9-]{5,90}$/.test(p.id)&&arms.has(p.arm)&&p.synthetic_only===true&&p.authorization===AUTH,'PACKET_SCOPE');
 check(typeof p.skill_text==='string'&&(p.arm==='GPT_BASE'?p.skill_text==='':p.skill_text.trim().length>=50&&p.skill_text.length<=24000)&&typeof p.question==='string'&&p.question.trim().length>=20&&p.question.length<=16000&&!secret.test(p.skill_text+'\n'+p.question),'PACKET_CONTENT');
 check(typeof p.public_key==='string'&&p.public_key.length<=4096&&p.public_key.startsWith('-----BEGIN PUBLIC KEY-----'),'PUBLIC_KEY_FORMAT');
 const key=createPublicKey(p.public_key);check(key.asymmetricKeyType==='rsa'&&key.asymmetricKeyDetails.modulusLength>=2048,'PUBLIC_KEY_TYPE');
 // a must originate from trusted, authenticated controller; this pure function cannot prove that provenance.
 check(exact(a,['id','packet_sha256','config_sha256','reservation_id','reservation_confirmed','private_preview','environment'])&&a.id===p.id&&a.reservation_id===p.id&&a.reservation_confirmed===true&&a.private_preview===true&&a.environment==='LAB'&&a.packet_sha256===hash(p)&&a.config_sha256===hash(config),'CONTROLLER_BINDING');return key;
}
export function makeRequest(p,a){validate(p,a);return {model:config.model,messages:[{role:'system',content:config.neutral+(p.skill_text?'\n\n'+p.skill_text:'')},{role:'user',content:p.question}],max_tokens:config.max_tokens,temperature:config.temperature,stream:false,provider:{only:[config.provider],allow_fallbacks:false,data_collection:'allow',max_price:{prompt:0,completion:0},require_parameters:true}}}
// Strict flat JSON primitive oracle, compatible with V1 expected types. Reject duplicate decoded keys.
export function scoreStrict(content,expected){
 const fail={schema:false,checks:0,passed:0,all_pass:false};
 if(typeof content!=='string'||content.length>10000)return fail;
 const s=content;let i=0;const ws=()=>{while(i<s.length&&/[\x20\t\r\n]/.test(s[i]))i++};
 const consume=c=>{ws();if(s[i]!==c)throw Error('syntax');i++};
 const token=()=>{ws();const m=s.slice(i).match(/^(?:"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/);if(!m)throw Error('token');i+=m[0].length;const v=JSON.parse(m[0]);if(typeof v==='number'&&!Number.isFinite(v))throw Error('number');return v};
 try{consume('{');ws();const seen=new Set();if(s[i]!=='}'){for(;;){const k=token();if(typeof k!=='string'||seen.has(k))return fail;seen.add(k);consume(':');token();ws();if(s[i]!==',')break;i++}}consume('}');ws();if(i!==s.length)return fail;return score(content,expected)}catch{return fail}
}
const count=x=>Number.isSafeInteger(x)&&x>=0;
export function sealResponse(p,a,r){const key=validate(p,a);const c=r?.choices?.[0];const t=c?.message?.content;check(r?.model===config.model&&typeof r?.provider==='string'&&r.provider.toLowerCase()===config.provider&&r.usage?.cost===0&&count(r.usage.prompt_tokens)&&count(r.usage.completion_tokens)&&r.usage.completion_tokens<=config.max_tokens&&Array.isArray(r.choices)&&r.choices.length===1&&c.finish_reason==='stop'&&typeof t==='string'&&t.trim().length>0&&Buffer.byteLength(t)<=100000&&!secret.test(t)&&!c.message.tool_calls&&!c.message.function_call,'RESPONSE_HOLD');
 const metadata={id:p.id,packet_sha256:hash(p),config_sha256:hash(config),model:r.model,provider:config.provider,cost:0,prompt_tokens:r.usage.prompt_tokens,completion_tokens:r.usage.completion_tokens,output_sha256:shaText(t)};
 const aes=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',aes,iv);cipher.setAAD(Buffer.from(canonical(metadata)));const ciphertext=Buffer.concat([cipher.update(t,'utf8'),cipher.final()]);const enc=b=>b.toString('base64');return {metadata,iv:enc(iv),tag:enc(cipher.getAuthTag()),ciphertext:enc(ciphertext),wrapped_key:enc(publicEncrypt({key,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},aes))};}
export function openResponse(e,p,a,privateKey){validate(p,a);check(exact(e,['metadata','iv','tag','ciphertext','wrapped_key']),'ENVELOPE_FIELDS');const m=e.metadata;check(exact(m,['id','packet_sha256','config_sha256','model','provider','cost','prompt_tokens','completion_tokens','output_sha256'])&&m.id===p.id&&m.packet_sha256===hash(p)&&m.config_sha256===hash(config)&&m.model===config.model&&m.provider===config.provider&&m.cost===0&&count(m.prompt_tokens)&&count(m.completion_tokens)&&m.completion_tokens<=config.max_tokens&&/^[a-f0-9]{64}$/.test(m.output_sha256),'ENVELOPE_BINDING');
 const decode=x=>{check(typeof x==='string'&&x.length<=140000&&/^[A-Za-z0-9+/]+={0,2}$/.test(x),'ENCODING');const b=Buffer.from(x,'base64');check(b.toString('base64')===x,'ENCODING');return b};const iv=decode(e.iv),tag=decode(e.tag);check(iv.length===12&&tag.length===16,'AEAD_PARAMS');const aes=privateDecrypt({key:privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},decode(e.wrapped_key));check(aes.length===32,'KEY_LENGTH');const d=createDecipheriv('aes-256-gcm',aes,iv);d.setAAD(Buffer.from(canonical(m)));d.setAuthTag(tag);const t=Buffer.concat([d.update(decode(e.ciphertext)),d.final()]).toString('utf8');check(shaText(t)===m.output_sha256&&!secret.test(t),'OUTPUT_HASH');return t;}
