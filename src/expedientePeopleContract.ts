export type ApiResult<T>={status:number;data:T|null};
export type GatewaySender=<T>(path:string,init?:RequestInit)=>Promise<ApiResult<T>>;

export function expedientePeoplePath(expediente:string){return `/expedientes/${encodeURIComponent(expediente)}/people`}
export function getExpedientePeople<T>(send:GatewaySender,expediente:string){return send<T>(expedientePeoplePath(expediente))}
export function createExpedientePerson<T>(send:GatewaySender,expediente:string,payload:Record<string,unknown>){return send<T>(expedientePeoplePath(expediente),{method:'POST',body:JSON.stringify({action:'create',payload})})}
export function updateExpedientePerson<T>(send:GatewaySender,expediente:string,id:string,changes:Record<string,unknown>){return send<T>(expedientePeoplePath(expediente),{method:'POST',body:JSON.stringify({action:'update',client_code:id,changes})})}
