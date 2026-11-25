// Public synthetic egress boundary. No private content, free-text inputs or credentials accepted.
const catalog=Object.freeze({
 'synthetic-arithmetic-01':Object.freeze({question:'Synthetic exercise: planned value 100, earned value 80, actual cost 120, budget at completion 240. Assuming constant CPI, return JSON with cpi rounded to six decimals and eac. Fields: cpi, eac.',oracle:Object.freeze({cpi:0.666667,eac:360})}),
 'synthetic-sampling-01':Object.freeze({question:'Synthetic exercise: stratum A population 60 and sample mean 2; stratum B population 40 and sample mean 5. Return JSON with weighted_mean, treating populations as fixed weights.',oracle:Object.freeze({weighted_mean:3.2})}),
 'synthetic-recovery-01':Object.freeze({question:'Synthetic exercise: allowed recovery time 120 minutes, observed recovery time 90; allowed data loss 15 minutes, observed data loss 20. Return JSON booleans rto_met and rpo_met.',oracle:Object.freeze({rto_met:true,rpo_met:false})})
});
export const neutral='Resolve the public synthetic exercise using only the provided data. Return a JSON object with the requested fields. No tools, external actions, private context, or real-world authorization.';
export const modelId='nvidia/nemotron-3-ultra-550b-a55b:free',tag='nvidia';
export const zero=x=>x===0||(typeof x==='string'&&/^0+(?:\.0+)?$/.test(x));
export function validatePublicRequest(r){
 return r!==null&&typeof r==='object'&&Object.getPrototypeOf(r)===Object.prototype&&Object.keys(r).length===5&&['version','id','case_id','approved','mode'].every(k=>Object.hasOwn(r,k))&&r.version===2&&typeof r.id==='string'&&/^eval-[a-z0-9-]{5,90}$/.test(r.id)&&typeof r.case_id==='string'&&Object.hasOwn(catalog,r.case_id)&&r.approved===true&&r.mode==='OWNER_AUTHORIZED_PUBLIC_SYNTHETIC_REFERENCE';
}
export function publicCase(caseId){
 if(typeof caseId!=='string'||!Object.hasOwn(catalog,caseId))throw Error('HOLD_PUBLIC_CATALOG');
 return catalog[caseId];
}
export function buildPublicBody(caseId){
 const c=publicCase(caseId);
 return {model:modelId,messages:[{role:'system',content:neutral},{role:'user',content:c.question}],max_tokens:1536,stream:false,provider:{only:[tag],allow_fallbacks:false,data_collection:'deny',max_price:{prompt:0,completion:0},require_parameters:true}};
}
