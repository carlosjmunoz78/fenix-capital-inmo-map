from pathlib import Path
p=Path('src/CerebroBrowserConsole.tsx')
s=p.read_text()
s=s.replace("import {parseBrowserCommand} from '../cerebro/runtime/browser-command-parser-v3';","import {evaluateBrowserPostcondition,parseBrowserCommand,type BrowserPostcondition} from '../cerebro/runtime/browser-command-parser-v3';")
needle=" async function waitForCommand(sessionId:string,commandId:string){for(let attempt=0;attempt<60;attempt++){const r=await fetchBrowserInteractiveApi<BrowserCommandStatusResponse>('/owner/command-status',{company_id:selectedCompany,session_id:sessionId,command_id:commandId});const c=r.data?.command;if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'No se pudo consultar la orden');if(c?.status==='COMPLETED')return;if(c?.status==='FAILED')throw new Error(c.error_code||'La orden del navegador falló');await new Promise(resolve=>window.setTimeout(resolve,250));}throw new Error('TIMEOUT_EJECUTANDO_ORDEN');}\n"
insert=needle+" async function waitForPostcondition(sessionId:string,postcondition:BrowserPostcondition|undefined){if(!postcondition)return;for(let attempt=0;attempt<24;attempt++){const r=await fetchBrowserInteractiveApi<BrowserStatusResponse>('/owner/status',{company_id:selectedCompany,session_id:sessionId});if(r.status!==200||!r.data?.ok)throw new Error(r.data?.error||'No se pudo verificar el resultado de la orden');const result=evaluateBrowserPostcondition(postcondition,r.data.session||{});if(result.state==='SATISFIED')return;if(result.state==='FAILED')throw new Error(result.error||'POSTCONDITION_FAILED');await new Promise(resolve=>window.setTimeout(resolve,250));}throw new Error('POSTCONDITION_NOT_MET');}\n"
if needle not in s: raise SystemExit('waitForCommand anchor not found')
s=s.replace(needle,insert,1)
old="await waitForCommand(session.session_id,queued.data.command.command_id);}setVisibleCommand({text:clean,status:'COMPLETADA'});"
new="await waitForCommand(session.session_id,queued.data.command.command_id);}await waitForPostcondition(session.session_id,parsed.postcondition);setVisibleCommand({text:clean,status:'COMPLETADA'});"
if old not in s: raise SystemExit('submit completion anchor not found')
s=s.replace(old,new,1)
p.write_text(s)
print('POSTCONDITION_UI_PATCH_APPLIED')
