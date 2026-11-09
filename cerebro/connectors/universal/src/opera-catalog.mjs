// FACT-001 provider extension: capability != deployment, and browser use != new authority.
// IMPLEMENTED_LAB means adapter has local Node tests, NOT a live CEREBRO or ChatGPT MCP binding.
const op = (id, status, sideEffect=false, permission='BROWSER_READ', command=null) => Object.freeze({
  id, method:sideEffect?'BROWSER_ACTION':'BROWSER_READ', path:'opera-connector://'+id.replace(/^opera\./,''),
  permission,status,sideEffect,provider:'opera',command
});
export const OPERA_CAPABILITIES=Object.freeze([
  op('opera.tabs.list','IMPLEMENTED_LAB'),
  op('opera.tabs.read','IMPLEMENTED_LAB'),
  op('opera.tabs.history','IMPLEMENTED_LAB',false,'BROWSER_HISTORY'),
  op('opera.tabs.screenshot','IMPLEMENTED_LAB',false,'BROWSER_SCREENSHOT'),
  op('opera.tabs.navigate','IMPLEMENTED_LAB',true,'BROWSER_NAVIGATE'),
  op('opera.tabs.close','IMPLEMENTED_LAB',true,'BROWSER_CLOSE'),
  // These exist as commands in canonical BROWSER-1 but are not accessible from the
  // currently connected ChatGPT Opera MCP tool inventory. Never silently claim them live.
  op('opera.browser.click','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','click'),
  op('opera.browser.double-click','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','double_click'),
  op('opera.browser.fill','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','fill'),
  op('opera.browser.type','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','type'),
  op('opera.browser.press','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','press'),
  op('opera.browser.select','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','select'),
  op('opera.browser.scroll','PARTIAL_NOT_ENABLED',false,'BROWSER_READ','scroll'),
  op('opera.browser.upload','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','upload'),
  op('opera.browser.download','PARTIAL_NOT_ENABLED',true,'BROWSER_MUTATE','download_click'),
  op('opera.browser.back','PARTIAL_NOT_ENABLED',true,'BROWSER_NAVIGATE','back'),
  op('opera.browser.forward','PARTIAL_NOT_ENABLED',true,'BROWSER_NAVIGATE','forward'),
  op('opera.browser.reload','PARTIAL_NOT_ENABLED',true,'BROWSER_NAVIGATE','reload'),
  op('opera.browser.switch-tab','PARTIAL_NOT_ENABLED',true,'BROWSER_NAVIGATE','switch_tab'),
  op('opera.browser.open-tab','PARTIAL_NOT_ENABLED',true,'BROWSER_NAVIGATE','open_tab'),
  op('opera.browser.credentials','PLANNED_NOT_ENABLED',true,'BROWSER_CREDENTIAL_BROKER'),
  op('opera.browser.mfa-handback','PLANNED_NOT_ENABLED',true,'HUMAN_SIGNATURE_OR_MFA')
]);