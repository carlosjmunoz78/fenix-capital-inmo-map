import { CLOUDFLARE_ACCOUNT_ID, FACEBOOK_D1 } from './catalog.mjs';
// Fail-closed demonstration. Production must supply durable grants from IAM-001 per client and per resource.
export function labFacebookPolicy({identity,scope,action,input}){
 const approvedActor=identity?.identity_ref==='iam:fenix-owner-lab';
 const validScope=scope?.company_id==='fenix-capital'&&scope.environment==='LAB';
 const accountMatches= !('account_id' in input)||input.account_id===CLOUDFLARE_ACCOUNT_ID;
 if(!approvedActor||!validScope||!accountMatches)return false;
 if(action.id==='cloudflare.d1.create-facebook-lab-eu')return input.name===FACEBOOK_D1&&input.jurisdiction==='eu'&&input.confirm_isolated===true;
 if(action.id==='cloudflare.d1.query-facebook-readonly')return true;
 return action.sideEffect===false; // ALL other Cloudflare resources: inventory/read, no arbitrary mutation.
}
export async function cloudflareFreeCostGuard({action,scope,input}){
 // NO self-attestation from the caller: a trusted quota checker must replace this in live deployment.
 void action;void scope;void input;
 return false;
}
