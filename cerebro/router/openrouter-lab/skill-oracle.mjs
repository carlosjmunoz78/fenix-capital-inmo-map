// Pure data-only behavioral oracle. Never execute model output.
export const AUTH='OWNER_APPROVED_SKILL_TEXT_WITHOUT_ZDR; SYNTHETIC_TASK_ONLY; NO_CUSTOMER_DATA_OR_CREDENTIALS';
const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(x);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
export function validatePacket(p,expectedId){
 if(!plain(p)||p.version!==1||p.id!==expectedId||!safeId(p.id)||!safeId(p.skill_name)||!safeId(p.case_id)||p.authorization!==AUTH)return false;
 if(typeof p.skill_text!=='string'||p.skill_text.length<50||p.skill_text.length>24000||typeof p.question!=='string'||p.question.length<20||p.question.length>16000)return false;
 if(/sk-or-v1-[a-f0-9]{64}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sb_secret_[a-zA-Z0-9_-]{12,}/.test(p.skill_text+'\n'+p.question))return false;
 return plain(p.oracle)&&Object.keys(p.oracle).length>=1&&Object.keys(p.oracle).length<=40&&Object.entries(p.oracle).every(([k,v])=>/^[a-z][a-z0-9_]{0,63}$/.test(k)&&((typeof v==='string'&&v.length<=100)||(typeof v==='boolean')||(typeof v==='number'&&Number.isFinite(v))));
}
export function score(content,expected){
 if(typeof content!=='string'||content.length>10000)return{schema:false,checks:0,passed:0,all_pass:false};
 let actual;try{actual=JSON.parse(content.trim())}catch{return{schema:false,checks:0,passed:0,all_pass:false}}
 if(!plain(actual))return{schema:false,checks:0,passed:0,all_pass:false};
 const keys=Object.keys(expected),schema=Object.keys(actual).length===keys.length&&keys.every(k=>Object.hasOwn(actual,k)&&typeof actual[k]===typeof expected[k]);
 const passed=keys.filter(k=>Object.hasOwn(actual,k)&&actual[k]===expected[k]).length;
 return{schema,checks:keys.length,passed,all_pass:schema&&passed===keys.length,failed:keys.filter(k=>actual[k]!==expected[k])};
}
