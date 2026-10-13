import { test, expect } from '@playwright/test';

const URL='/lab/cerebro-visual/candidate-v1426-motion.html';

test('V1.4.25 visual composition keeps signal and arrival-aware motion coherent', async ({ page }) => {
  await page.goto(`${URL}#motionqa=1&convqa=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).CEREBRO_V1426_MOTION && !!(window as any).CEREBRO_SIGNAL_V2 && !!(window as any).CEREBRO_MOTION_V2 && !!(window as any).CEREBRO_CONVERSATION_MOTION_V2, null, { timeout: 20_000 });

  const metadata=await page.evaluate(() => ({
    composed:(window as any).CEREBRO_V1426_MOTION,
    signal:(window as any).CEREBRO_SIGNAL_V2,
    motion:(window as any).CEREBRO_MOTION_V2,
    conversation:(window as any).CEREBRO_CONVERSATION_MOTION_V2,
    failed:!!document.querySelector('#v1426-fail')
  }));
  expect(metadata.failed).toBeFalsy();
  expect(metadata.composed.environment).toBe('LAB_PREPROD');
  expect(metadata.composed.visual_base).toBe('v1.4.25');
  expect(metadata.composed.rollback_visual).toBe('v1.4.25');
  expect(metadata.composed.rollback_base).toBe('v1.4.7');
  expect(metadata.composed.additional_cost_eur).toBe(0);
  for(const module of [metadata.composed, metadata.signal, metadata.motion, metadata.conversation]) expect(module.prod_authorized).toBe(false);

  const deep=await page.evaluate(async () => {
    const motion=(window as any).CEREBRO_MOTION_V2;
    const ok=await motion.goAndWait(3,'CONVERSATIONAL');
    return {ok,mode:motion.getMode(),stage:motion.getStage(),settled:motion.isSettled(),error:motion.cameraError()};
  });
  expect(deep.ok).toBeTruthy();
  expect(deep.mode).toBe('CONVERSATIONAL');
  expect(deep.stage).toBe(3);
  expect(deep.settled).toBeTruthy();
  expect(deep.error.zoom).toBeLessThanOrEqual(Math.max(0.012, deep.error.targetZoom*0.008)+0.001);

  const override=await page.evaluate(() => {
    const motion=(window as any).CEREBRO_MOTION_V2;
    motion.go(2,'AUTONOMOUS');
    const t0=performance.now();
    window.dispatchEvent(new WheelEvent('wheel',{deltaY:180,bubbles:true,cancelable:true}));
    return {mode:motion.getMode(),elapsed:performance.now()-t0};
  });
  expect(override.mode).toBe('MANUAL');
  expect(override.elapsed).toBeLessThan(16.7);

  await page.evaluate(() => (window as any).CEREBRO_LAB.setStage(0));
  const activeSignal=await page.evaluate(() => {
    const api=(window as any).CEREBRO_SIGNAL_V2;
    return {triggered:api.trigger(4),state:api.getState()};
  });
  expect(activeSignal.triggered).toBeTruthy();
  expect(activeSignal.state.active).toBeTruthy();
  expect(activeSignal.state.to).toBe('COMMS');
  await page.waitForTimeout(900);
  const arrivedSignal=await page.evaluate(() => (window as any).CEREBRO_SIGNAL_V2.getState());
  expect(arrivedSignal.active).toBeFalsy();
  expect(arrivedSignal.reaction).toBe('COMMS');

  const gated=await page.evaluate(async () => {
    const conv=(window as any).CEREBRO_CONVERSATION_MOTION_V2;
    const motion=(window as any).CEREBRO_MOTION_V2;
    conv.beginListen();
    conv.onIntent(4);
    const arrival=conv.onResponseStart().then((ok:boolean)=>({ok,at:performance.now()}));
    const artifact=conv.onArtifactReady(()=>{(window as any).__cerebroArtifactAt=performance.now()}).then((ok:boolean)=>({ok,at:(window as any).__cerebroArtifactAt||0}));
    const [a,r]=await Promise.all([arrival,artifact]);
    return {arrival:a,artifact:r,gate:conv.getLastArtifactGate(),phase:conv.getPhase(),mode:motion.getMode(),settled:motion.isSettled()};
  });
  expect(gated.arrival.ok).toBeTruthy();
  expect(gated.artifact.ok).toBeTruthy();
  expect(gated.artifact.at).toBeGreaterThanOrEqual(gated.arrival.at);
  expect(gated.gate.revealed).toBeTruthy();
  expect(gated.gate.reason).toBe('CAMERA_ARRIVED');
  expect(gated.phase).toBe('RESPOND');
  expect(gated.mode).toBe('CONVERSATIONAL');
  expect(gated.settled).toBeTruthy();
});

test('reduced-motion path snaps camera without a fixed animation duration', async ({ page }) => {
  await page.goto(`${URL}#motionreduceqa=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).CEREBRO_MOTION_V2, null, { timeout: 20_000 });
  const result=await page.evaluate(async () => {
    const motion=(window as any).CEREBRO_MOTION_V2;
    const t0=performance.now();
    const ok=await motion.goAndWait(3,'CONVERSATIONAL');
    return {ok,reduced:motion.isReducedMotion(),settled:motion.isSettled(),elapsed:performance.now()-t0};
  });
  expect(result.ok).toBeTruthy();
  expect(result.reduced).toBeTruthy();
  expect(result.settled).toBeTruthy();
  expect(result.elapsed).toBeLessThan(100);
});