// CONSOLE-001 · strict single-tenant gate (non-voice).
// No tenant may be enabled by client-side selection or request claims alone.
// Multi-company activation requires an authorized server-side Company Registry.
export const CONSOLE_COMPANY_ID = "fenix" as const;

export function authorizedCompanyScope(requested:unknown):boolean{
  return requested===undefined||requested===CONSOLE_COMPANY_ID;
}

export function authorizedCompanies(){
  return [{company_id:CONSOLE_COMPANY_ID,label:"Fénix Capital",authorized:true}] as const;
}
