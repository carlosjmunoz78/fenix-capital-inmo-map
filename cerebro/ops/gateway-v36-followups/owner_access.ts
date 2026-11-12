/**
 * Owner Access Resolver V0: capability discovery only, never privilege elevation.
 *
 * AuthN/AuthZ is performed by the existing server-side authorizedOwner(req).
 * Company query parameters only select an authorized context; they never grant it.
 * No customer records, secrets, account tokens or cross-company data are returned.
 */
export function resolveOwnerCapabilities({actor,requestedCompany}){
  if(actor!=="CARLOS-ADMIN")return {
    status:"FORBIDDEN",reason:"OWNER_ONLY",executed:false
  };
  const company=String(requestedCompany??"fenix").trim().toLowerCase();
  const knownCompany=company===""||company==="fenix"||company==="fenix-capital";
  if(!knownCompany)return {
    status:"NOT_CONNECTED",
    reason:company==="all"||company==="todas"?"MULTICOMPANY_REGISTRY_NOT_CONNECTED":"COMPANY_CONTEXT_NOT_CONNECTED",
    executed:false,
    owner_scope:"GLOBAL_OBJECTIVE_NOT_YET_IMPLEMENTED",
    message:"El propietario tendrá acceso unificado cuando esta empresa esté vinculada y verificada por el registro de identidades. El selector no concede acceso automáticamente.",
    capabilities:[],
    data_returned:false
  };
  // These states are established from the current Gateway source paths,
  // not from successful live queries in the owner's browser.
  const capabilities=[
    {id:"CEREBRO_CONSOLE",area:"CEREBRO",mode:"READ",status:"ROUTE_PRESENT",source:"GET /health, /contract, /engines"},
    {id:"APP_EXPEDIENTES",area:"App/CRM Fénix",mode:"READ",status:"ADAPTER_PRESENT_E2E_PENDING",source:"fenix_prod_exp_list_server"},
    {id:"APP_INMOBILIARIAS",area:"App/CRM Fénix",mode:"READ",status:"ADAPTER_PRESENT_E2E_PENDING",source:"fenix_prod_inmo_list_server"},
    {id:"CEREBRO_ACTIVITY",area:"Trabajos GitHub",mode:"READ",status:"ADAPTER_PRESENT_E2E_PENDING",source:"activity_reader.ts"},
    {id:"CEREBRO_KNOWLEDGE",area:"Conocimiento",mode:"READ",status:"ADAPTER_PRESENT_E2E_PENDING",source:"knowledge.ts"},
    {id:"CEREBRO_MEMORY",area:"Memoria",mode:"READ",status:"PARTIAL_SESSION_PERSISTENCE_UNVERIFIED",source:"memory RPCs + bounded conversation"},
    {id:"SOCIAL_SCHEDULE",area:"Redes sociales",mode:"READ",status:"CONDITIONAL_SOURCE",source:"social_schedule read_context"},
    {id:"EMAIL_PROPOSAL",area:"Comunicación",mode:"PROPOSAL_ONLY",status:"CONTRACT_PRESENT_EXECUTION_GATED",source:"COMM-001"},
    {id:"SEO_PROPOSAL",area:"SEO",mode:"PROPOSAL_ONLY",status:"CONTRACT_PRESENT_EXECUTION_GATED",source:"SEO-001"},
    {id:"OWNER_GLOBAL_ROUTER",area:"Multiempresa y resto de motores",mode:"READ_AND_ORDER_OBJECTIVE",status:"NOT_CONNECTED",source:"Owner Unified Access contract"}
  ];
  return {
    status:"OK",
    version:"OWNER_ACCESS_RESOLVER_V0",
    company_id:"fenix",
    owner_scope:"VERIFIED_FENIX_ONLY",
    global_owner_intent:true,
    executed:false,
    source_status:"CODE_CAPABILITY_INVENTORY_NOT_LIVE_SOURCE_HEALTH",
    data_returned:false,
    capabilities,
    message:"Este registro informa de conexiones conocidas y pendientes. No limita lo que el propietario puede ordenar en el diseño final ni afirma que todos los sistemas estén ya conectados."
  };
}
