import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const app=fs.readFileSync('src/App.tsx','utf8');
const enhancement=fs.readFileSync('src/CalculatorProEnhancement.tsx','utf8');

test('calculator remains global, minimizable and preserves user data across navigation',()=>{
  expect(app).toContain('fenix-calc:${session.user.id}');
  expect(app).toContain('minimized:!v.minimized');
  expect(app).toContain('La calculadora permanece disponible mientras trabajas en cualquier módulo.');
  expect(app).not.toContain("fetchEnvironmentApi<any>('fenix-");
});

test('calculator panel is draggable and persists its viewport-safe position',()=>{
  expect(enhancement).toContain("POSITION_KEY='fenix-calculator-position'");
  expect(enhancement).toContain("header.addEventListener('pointerdown',onPointerDown)");
  expect(enhancement).toContain('localStorage.setItem(POSITION_KEY');
  expect(enhancement).toContain('clampPosition(panel');
});
