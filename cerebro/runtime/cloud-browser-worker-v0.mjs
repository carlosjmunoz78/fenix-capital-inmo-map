import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluateBrowserExecution } from './browser-transversal-autonomy-v1.mjs';

const ACTIONS = new Set([
  'NAVIGATE','BACK','FORWARD','RELOAD','OPEN_TAB','CLOSE_TAB','SWITCH_TAB',
  'CLICK','DOUBLE_CLICK','HOVER','FILL','TYPE','PRESS','CHECK','UNCHECK','SELECT',
  'CLICK_POINT','DOUBLE_CLICK_POINT','MOVE_POINT','KEYBOARD_TYPE','KEYBOARD_PRESS',
  'UPLOAD','DRAG','SCROLL','WAIT','EXTRACT_TEXT','EXTRACT_HTML','SCREENSHOT','PDF',
  'DOWNLOAD_CLICK'
]);
const MAX_STORAGE_STATE_BYTES = 5 * 1024 * 1024;
const SENSITIVE_FIELD_SELECTOR = [
  'input[type="password" i]',
  'input[type="email" i]',
  'input[autocomplete="username" i]',
  'input[autocomplete="email" i]',
  'input[autocomplete="current-password" i]',
  'input[autocomplete="new-password" i]',
  'input[name*="email" i]',
  'input[id*="email" i]',
  'input[name*="user" i]',
  'input[id*="user" i]',
  'input[name*="login" i]',
  'input[id*="login" i]',
  'input[name*="pass" i]',
  'input[id*="pass" i]',
  'input[name*="correo" i]',
  'input[id*="correo" i]',
  'input[name*="usuario" i]',
  'input[id*="usuario" i]',
  'input[name*="contrasena" i]',
  'input[id*="contrasena" i]',
  'input[placeholder*="email" i]',
  'input[placeholder*="correo" i]',
  'input[placeholder*="usuario" i]',
  'input[placeholder*="password" i]',
  'input[placeholder*="contrasena" i]',
  '[data-cerebro-sensitive]'
].join(',');

let chromiumRuntime = null;

async function getChromiumRuntime() {
  if (chromiumRuntime) return chromiumRuntime;
  try {
    const playwright = await import('@playwright/test');
    chromiumRuntime = playwright.chromium;
    if (!chromiumRuntime) throw new Error('CHROMIUM_EXPORT_MISSING');
    return chromiumRuntime;
  } catch (cause) {
    const error = new Error('PLAYWRIGHT_CHROMIUM_RUNTIME_UNAVAILABLE');
    error.cause = cause;
    throw error;
  }
}

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`MISSING_${name}`);
  return value;
}

function safeSegment(value, fallback = 'unknown') {
  return String(value ?? fallback).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function requiresMaterializedSession(job = {}) {
  return job.operation?.kind === 'AUTHENTICATED_OBSERVE' || job.operation?.authenticated_session_required === true;
}

function locatorFor(page, target = {}) {
  if (target.test_id) return page.getByTestId(target.test_id);
  if (target.role) return page.getByRole(target.role, target.name ? { name: target.name, exact: target.exact === true } : undefined);
  if (target.label) return page.getByLabel(target.label, { exact: target.exact === true });
  if (target.placeholder) return page.getByPlaceholder(target.placeholder, { exact: target.exact === true });
  if (target.text) return page.getByText(target.text, { exact: target.exact === true });
  if (target.selector) return page.locator(target.selector);
  throw new Error('MISSING_TARGET');
}

function pointFor(page, action = {}) {
  const x = Number(action.x);
  const y = Number(action.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('INVALID_POINT');
  if (x < 0 || y < 0) throw new Error('POINT_OUTSIDE_VIEWPORT');
  const viewport = page.viewportSize();
  if (viewport && (x > viewport.width || y > viewport.height)) throw new Error('POINT_OUTSIDE_VIEWPORT');
  return Object.freeze({x,y});
}

function assertScope(job) {
  required(job.company_id, 'COMPANY_ID');
  required(job.identity_id, 'IDENTITY_ID');
  required(job.environment, 'ENVIRONMENT');
  if (job.profile_scope) {
    if (job.profile_scope.company_id !== job.company_id) throw new Error('CROSS_COMPANY_PROFILE_DENIED');
    if (job.profile_scope.identity_id !== job.identity_id) throw new Error('CROSS_IDENTITY_PROFILE_DENIED');
    if (job.profile_scope.environment !== job.environment) throw new Error('CROSS_ENVIRONMENT_PROFILE_DENIED');
  }
}

function assertAction(action = {}) {
  if (!ACTIONS.has(action.type)) throw new Error(`UNSUPPORTED_BROWSER_ACTION:${action.type ?? 'null'}`);
}

function validateStorageState(storageState) {
  if (!storageState || typeof storageState !== 'object' || Array.isArray(storageState)) throw new Error('INVALID_STORAGE_STATE');
  if (storageState.cookies !== undefined && !Array.isArray(storageState.cookies)) throw new Error('INVALID_STORAGE_STATE_COOKIES');
  if (storageState.origins !== undefined && !Array.isArray(storageState.origins)) throw new Error('INVALID_STORAGE_STATE_ORIGINS');
  const serialized = JSON.stringify(storageState);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_STORAGE_STATE_BYTES) throw new Error('STORAGE_STATE_TOO_LARGE');
  return {
    cookies: Array.isArray(storageState.cookies) ? storageState.cookies.length : 0,
    origins: Array.isArray(storageState.origins) ? storageState.origins.length : 0
  };
}

export function getCloudBrowserWorkerCapabilities() {
  return Object.freeze({
    schema_version: '0.3.3',
    backend: 'PLAYWRIGHT_CHROMIUM',
    persistent_profiles: true,
    governed_storage_state_restore: true,
    authenticated_jobs_require_physical_materialization: true,
    dom_and_accessibility_locators: true,
    coordinate_computer_use: true,
    global_keyboard_input: true,
    coordinates_bounded_to_viewport: true,
    screenshots: true,
    screenshot_sensitive_field_redaction: true,
    pdf: true,
    uploads: true,
    downloads: true,
    multi_tab: true,
    physical_tab_limit_enforced: true,
    popup_tab_limit_continuous: true,
    popups: true,
    iframe_via_selector: true,
    shadow_dom_via_playwright: true,
    audit_events: true,
    restartable: true,
    arbitrary_page_javascript: false,
    captcha_bypass: false,
    mfa_bypass: false,
    actions: [...ACTIONS]
  });
}

export function createCloudBrowserWorker({
  profiles_root = process.env.CEREBRO_BROWSER_PROFILES_ROOT || '.cerebro/browser-profiles',
  artifacts_root = process.env.CEREBRO_BROWSER_ARTIFACTS_ROOT || '.cerebro/browser-artifacts',
  headless = process.env.CEREBRO_BROWSER_HEADLESS !== 'false',
  launch_options = {},
  max_tabs = Number(process.env.CEREBRO_BROWSER_MAX_TABS || 32),
  audit_sink = async () => {}
} = {}) {
  if (!Number.isInteger(max_tabs) || max_tabs < 1) throw new Error('INVALID_BROWSER_MAX_TABS');
  let context = null;
  let activePage = null;
  let runningScope = null;
  let sessionMaterialization = null;
  let tabPolicyChain = Promise.resolve();
  let tabPolicyError = null;

  async function emit(event) {
    await audit_sink(Object.freeze({ at: new Date().toISOString(), ...event }));
  }

  async function enforceTabLimit() {
    if (!context) return;
    const pages = context.pages();
    if (pages.length <= max_tabs) return;
    const overflow = pages.slice(max_tabs);
    for (const page of overflow) await page.close().catch(() => {});
    activePage = context.pages().at(-1) || null;
    await emit({ type:'BROWSER_TAB_LIMIT_EXCEEDED', max_tabs, observed_tabs:pages.length, ...runningScope });
    throw new Error('BROWSER_TAB_LIMIT_EXCEEDED');
  }

  function scheduleTabLimitEnforcement() {
    tabPolicyChain = tabPolicyChain.then(async () => {
      try {
        await enforceTabLimit();
      } catch (error) {
        tabPolicyError ||= error;
      }
    });
    return tabPolicyChain;
  }

  async function settleTabLimitPolicy() {
    await new Promise(resolve => setImmediate(resolve));
    await tabPolicyChain;
    if (tabPolicyError) {
      const error = tabPolicyError;
      tabPolicyError = null;
      throw error;
    }
    await enforceTabLimit();
  }

  async function start(job) {
    assertScope(job);
    if (context) throw new Error('BROWSER_WORKER_ALREADY_STARTED');
    const profileId = safeSegment(job.browser_profile_id || `${job.company_id}-${job.identity_id}-${job.environment}`);
    const profileDir = path.resolve(profiles_root, profileId);
    await fs.mkdir(profileDir, { recursive: true });
    await fs.mkdir(path.resolve(artifacts_root), { recursive: true });

    const chromium = await getChromiumRuntime();
    context = await chromium.launchPersistentContext(profileDir, {
      headless,
      acceptDownloads: true,
      locale: job.locale || 'es-ES',
      timezoneId: job.timezone || 'Europe/Madrid',
      viewport: job.viewport || { width: 1440, height: 1000 },
      ...launch_options
    });
    activePage = context.pages()[0] || await context.newPage();
    runningScope = Object.freeze({
      company_id: job.company_id,
      identity_id: job.identity_id,
      environment: job.environment,
      browser_profile_id: profileId
    });
    sessionMaterialization = null;
    tabPolicyChain = Promise.resolve();
    tabPolicyError = null;
    context.on('page', page => {
      activePage = page;
      void scheduleTabLimitEnforcement();
    });
    await enforceTabLimit();
    await emit({ type: 'BROWSER_STARTED', max_tabs, ...runningScope });
    return runningScope;
  }

  async function restoreStorageState(storageState, proof = {}) {
    if (!context || !runningScope) throw new Error('BROWSER_WORKER_NOT_STARTED');
    if (proof.session_binding_authorized !== true) throw new Error('SESSION_BINDING_PROOF_REQUIRED');
    if (proof.company_id !== runningScope.company_id) throw new Error('SESSION_MATERIALIZATION_COMPANY_MISMATCH');
    if (proof.identity_id !== runningScope.identity_id) throw new Error('SESSION_MATERIALIZATION_IDENTITY_MISMATCH');
    if (proof.environment !== runningScope.environment) throw new Error('SESSION_MATERIALIZATION_ENVIRONMENT_MISMATCH');
    if (proof.browser_profile_id !== runningScope.browser_profile_id) throw new Error('SESSION_MATERIALIZATION_PROFILE_MISMATCH');
    required(proof.bundle_id, 'SESSION_BUNDLE_ID');
    required(proof.attestation_fingerprint, 'SESSION_ATTESTATION_FINGERPRINT');

    const counts = validateStorageState(storageState);
    if (typeof context.setStorageState !== 'function') throw new Error('PLAYWRIGHT_SET_STORAGE_STATE_UNAVAILABLE');
    await context.setStorageState(storageState);
    sessionMaterialization = Object.freeze({
      company_id: runningScope.company_id,
      identity_id: runningScope.identity_id,
      environment: runningScope.environment,
      browser_profile_id: runningScope.browser_profile_id,
      bundle_id: String(proof.bundle_id),
      attestation_fingerprint: String(proof.attestation_fingerprint)
    });
    await emit({
      type: 'BROWSER_STORAGE_STATE_RESTORED',
      ...runningScope,
      bundle_id: sessionMaterialization.bundle_id,
      cookies_count: counts.cookies,
      origins_count: counts.origins,
      secret_material_logged: false
    });
    return Object.freeze({restored:true,cookies_count:counts.cookies,origins_count:counts.origins});
  }

  async function stop(reason = 'NORMAL') {
    if (!context) return;
    const scope = runningScope;
    await tabPolicyChain.catch(() => {});
    await context.close();
    context = null;
    activePage = null;
    runningScope = null;
    sessionMaterialization = null;
    tabPolicyChain = Promise.resolve();
    tabPolicyError = null;
    await emit({ type: 'BROWSER_STOPPED', reason, ...scope });
  }

  async function evidence(job, label = 'evidence') {
    if (!activePage) throw new Error('BROWSER_WORKER_NOT_STARTED');
    const dir = path.resolve(
      artifacts_root,
      safeSegment(job.company_id),
      safeSegment(job.environment),
      safeSegment(job.audit_id || job.request_id || 'no-audit')
    );
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${safeSegment(label)}.png`);
    await activePage.screenshot({
      path: file,
      fullPage: !String(label).startsWith('live-'),
      mask: [activePage.locator(SENSITIVE_FIELD_SELECTOR)],
      maskColor: '#000000'
    });
    return file;
  }

  async function browserMetadata() {
    if (!context || !activePage) return {tabs:[],active_tab_index:null,current_title:'',viewport_width:null,viewport_height:null};
    const pages=context.pages().slice(0,max_tabs);
    const tabs=await Promise.all(pages.map(async (page,index)=>({
      index,
      url:page.url(),
      title:String(await page.title().catch(()=>'' )).slice(0,240),
      active:page===activePage
    })));
    const activeIndex=pages.indexOf(activePage);
    const viewport=activePage.viewportSize();
    const currentTitle=String(await activePage.title().catch(()=>'' )).slice(0,240);
    return {
      tabs,
      active_tab_index:activeIndex>=0?activeIndex:null,
      current_title:currentTitle,
      viewport_width:viewport?.width??null,
      viewport_height:viewport?.height??null
    };
  }

  async function doAction(job, action, index) {
    assertAction(action);
    if (!activePage) throw new Error('BROWSER_WORKER_NOT_STARTED');
    const page = activePage;
    const timeout = action.timeout_ms || job.action_timeout_ms || 30_000;
    const target = action.target ? locatorFor(page, action.target) : null;
    let result = null;

    switch (action.type) {
      case 'NAVIGATE':
        await page.goto(required(action.url, 'URL'), { waitUntil: action.wait_until || 'domcontentloaded', timeout });
        result = { url: page.url(), title: await page.title() };
        break;
      case 'BACK': await page.goBack({ timeout }); result = { url: page.url() }; break;
      case 'FORWARD': await page.goForward({ timeout }); result = { url: page.url() }; break;
      case 'RELOAD': await page.reload({ waitUntil: action.wait_until || 'domcontentloaded', timeout }); result = { url: page.url() }; break;
      case 'OPEN_TAB':
        if (context.pages().length >= max_tabs) throw new Error('BROWSER_TAB_LIMIT_EXCEEDED');
        activePage = await context.newPage();
        if (action.url) await activePage.goto(action.url, { waitUntil: 'domcontentloaded', timeout });
        result = { tab_index: context.pages().indexOf(activePage), url: activePage.url() };
        break;
      case 'CLOSE_TAB': {
        const pages = context.pages();
        await page.close();
        activePage = context.pages()[Math.max(0, Math.min(pages.indexOf(page) - 1, context.pages().length - 1))] || null;
        result = { tabs: context.pages().length };
        break;
      }
      case 'SWITCH_TAB': {
        const pages = context.pages();
        activePage = pages[required(action.index, 'TAB_INDEX')];
        if (!activePage) throw new Error('TAB_NOT_FOUND');
        await activePage.bringToFront();
        result = { tab_index: action.index, url: activePage.url() };
        break;
      }
      case 'CLICK': await target.click({ timeout }); break;
      case 'DOUBLE_CLICK': await target.dblclick({ timeout }); break;
      case 'HOVER': await target.hover({ timeout }); break;
      case 'FILL': await target.fill(String(action.value ?? ''), { timeout }); break;
      case 'TYPE':
        if(action.key_events_required===true)await target.pressSequentially(String(action.value ?? ''), {delay:0,timeout});
        else await target.fill(String(action.value ?? ''), {timeout});
        break;
      case 'PRESS': await target.press(required(action.key, 'KEY'), { timeout }); break;
      case 'CHECK': await target.check({ timeout }); break;
      case 'UNCHECK': await target.uncheck({ timeout }); break;
      case 'SELECT': result = await target.selectOption(action.value, { timeout }); break;
      case 'CLICK_POINT': {
        const point = pointFor(page, action);
        await page.mouse.click(point.x, point.y, {button:action.button || 'left'});
        result = point;
        break;
      }
      case 'DOUBLE_CLICK_POINT': {
        const point = pointFor(page, action);
        await page.mouse.click(point.x, point.y, {button:action.button || 'left',clickCount:2,delay:Number(action.delay_ms || 0)});
        result = point;
        break;
      }
      case 'MOVE_POINT': {
        const point = pointFor(page, action);
        await page.mouse.move(point.x, point.y, {steps:Math.max(1,Math.min(Number(action.steps || 1),100))});
        result = point;
        break;
      }
      case 'KEYBOARD_TYPE':
        await page.keyboard.insertText(String(action.value ?? ''));
        result = {characters:String(action.value ?? '').length};
        break;
      case 'KEYBOARD_PRESS':
        await page.keyboard.press(required(action.key, 'KEY'), {delay:Math.max(0,Math.min(Number(action.delay_ms || 0),1000))});
        result = {key:String(action.key)};
        break;
      case 'UPLOAD': await target.setInputFiles(required(action.files, 'FILES'), { timeout }); break;
      case 'DRAG': await target.dragTo(locatorFor(page, required(action.to, 'DRAG_DESTINATION')), { timeout }); break;
      case 'SCROLL':
        await page.mouse.wheel(Number(action.delta_x || 0), Number(action.delta_y || 700));
        break;
      case 'WAIT': await page.waitForTimeout(Math.min(Number(action.ms || 500), 30_000)); break;
      case 'EXTRACT_TEXT': result = await target.innerText({ timeout }); break;
      case 'EXTRACT_HTML': result = await target.innerHTML({ timeout }); break;
      case 'SCREENSHOT': {
        const file = await evidence(job, action.label || `action-${index}`);
        result = { file };
        break;
      }
      case 'PDF': {
        const dir = path.resolve(artifacts_root, safeSegment(job.company_id), safeSegment(job.environment), safeSegment(job.audit_id || job.request_id || 'no-audit'));
        await fs.mkdir(dir, { recursive: true });
        const file = path.join(dir, `${Date.now()}-${safeSegment(action.label || 'page')}.pdf`);
        await page.pdf({ path: file, format: action.format || 'A4', printBackground: true });
        result = { file };
        break;
      }
      case 'DOWNLOAD_CLICK': {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout }),
          target.click({ timeout })
        ]);
        const dir = path.resolve(artifacts_root, safeSegment(job.company_id), safeSegment(job.environment), safeSegment(job.audit_id || job.request_id || 'no-audit'), 'downloads');
        await fs.mkdir(dir, { recursive: true });
        const file = path.join(dir, safeSegment(action.filename || download.suggestedFilename(), 'download.bin'));
        await download.saveAs(file);
        result = { file, suggested_filename: download.suggestedFilename() };
        break;
      }
      default: throw new Error(`UNSUPPORTED_BROWSER_ACTION:${action.type}`);
    }

    await settleTabLimitPolicy();
    await emit({
      type: 'BROWSER_ACTION',
      request_id: job.request_id || null,
      audit_id: job.audit_id || null,
      company_id: job.company_id,
      identity_id: job.identity_id,
      environment: job.environment,
      index,
      action_type: action.type,
      url: activePage?.url() || null,
      tabs: context?.pages().length || 0,
      ok: true
    });
    return result;
  }

  async function execute(job = {}) {
    assertScope(job);
    if (job.kill_switch_enabled !== true) throw new Error('BROWSER_KILL_SWITCH_NOT_ARMED');
    const auth = evaluateBrowserExecution({
      engine_id: job.engine_id,
      environment: job.environment,
      canonical_engine_ids: job.canonical_engine_ids || [],
      route_needed: job.route_needed !== false,
      browser_binding: job.browser_binding || {},
      operation: job.operation || {},
      engine_authority: job.engine_authority || {}
    });
    if (auth.status !== 'AUTHORIZED') return { ok: false, authorization: auth, results: [] };

    if (!context) await start(job);
    if (runningScope.company_id !== job.company_id || runningScope.identity_id !== job.identity_id || runningScope.environment !== job.environment) {
      throw new Error('RUNNING_BROWSER_SCOPE_MISMATCH');
    }
    if (requiresMaterializedSession(job)) {
      const materialized = sessionMaterialization &&
        sessionMaterialization.company_id === runningScope.company_id &&
        sessionMaterialization.identity_id === runningScope.identity_id &&
        sessionMaterialization.environment === runningScope.environment &&
        sessionMaterialization.browser_profile_id === runningScope.browser_profile_id;
      if (!materialized) {
        if (job.keep_session_open !== true) await stop('SESSION_MATERIALIZATION_REQUIRED');
        return {
          ok:false,
          authorization:Object.freeze({...auth,status:'HOLD_SESSION_MATERIALIZATION_REQUIRED',action_execution_authorized:false}),
          results:[]
        };
      }
    }

    const results = [];
    try {
      for (let i = 0; i < (job.actions || []).length; i += 1) {
        results.push(await doAction(job, job.actions[i], i));
      }
      const finalEvidence = job.capture_final_evidence === false ? null : await evidence(job, 'final');
      const metadata = await browserMetadata();
      await emit({ type: 'BROWSER_JOB_COMPLETED', request_id: job.request_id || null, audit_id: job.audit_id || null, ...runningScope, final_evidence: finalEvidence });
      return { ok: true, authorization: auth, results, final_url: activePage?.url() || null, final_evidence: finalEvidence, ...metadata };
    } catch (error) {
      const failureEvidence = activePage ? await evidence(job, 'failure').catch(() => null) : null;
      await emit({ type: 'BROWSER_JOB_FAILED', request_id: job.request_id || null, audit_id: job.audit_id || null, ...runningScope, error: String(error?.message || error), failure_evidence: failureEvidence });
      throw error;
    } finally {
      if (job.keep_session_open !== true) await stop('JOB_COMPLETE');
    }
  }

  return Object.freeze({ start, restoreStorageState, stop, execute, capabilities: getCloudBrowserWorkerCapabilities });
}