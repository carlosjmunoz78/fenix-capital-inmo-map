import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const source=fs.readFileSync('src/App.tsx','utf8');

test('PROD no resuelve alias TEST de login',()=>{
  expect(source).toContain("import { fetchAppApi, IS_PRODUCTION, supabase } from './supabase'");
  expect(source).toContain("if(IS_PRODUCTION)return ''");
  expect(source.indexOf("if(IS_PRODUCTION)return ''")).toBeLessThan(source.indexOf("return testLoginAliases[alias] || ''"));
});

test('DIR-TEST no activa Dirección en PROD',()=>{
  expect(source).toContain("(!IS_PRODUCTION && ctx?.actor_code==='DIR-TEST')");
});
