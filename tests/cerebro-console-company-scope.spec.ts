import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import {CONSOLE_COMPANY_ID,authorizedCompanyScope,authorizedCompanies} from '../supabase/functions/cerebro-console-gateway-v0/companyScope';

test('JARVIS company scope: legacy request and explicit fenix accepted, foreign claims denied',()=>{
 expect(CONSOLE_COMPANY_ID).toBe('fenix');
 expect(authorizedCompanyScope(undefined)).toBe(true);
 expect(authorizedCompanyScope('fenix')).toBe(true);
 for(const invalid of ['other-company','FENIX','',null,0,{},['fenix'],true]){
   expect(authorizedCompanyScope(invalid)).toBe(false);
 }
 expect(authorizedCompanies()).toEqual([{company_id:'fenix',label:'Fénix Capital',authorized:true}]);
});

test('JARVIS company scope: Gateway enforces before chat side effects and stays owner-only',()=>{
 const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
 const owner=gateway.indexOf('const owner=await authorizedOwner(req)');
 const scope=gateway.indexOf('if(!authorizedCompanyScope(obj.company_id))');
 const dispatch=gateway.indexOf('return json(req,200,await chatReply(');
 expect(owner).toBeGreaterThan(-1);
 expect(scope).toBeGreaterThan(owner);
 expect(dispatch).toBeGreaterThan(scope);
 expect(gateway).toContain('reason:"COMPANY_SCOPE_NOT_AUTHORIZED"');
 expect(gateway).toContain('companies:authorizedCompanies(),multi_company_enabled:false');
 expect(gateway).toContain('if(suffix==="companies")return json(req,200,');
 const client=fs.readFileSync('src/cerebroConsoleApi.ts','utf8');
 expect(client).toContain("const CONSOLE_COMPANY_ID='fenix'");
 expect(client).toContain('body:JSON.stringify({company_id:CONSOLE_COMPANY_ID,message,');
});
