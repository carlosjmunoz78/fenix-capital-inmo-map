import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('L7 notifications use authenticated persistent RPCs',async()=>{
 const source=read('src/NotificationsShell.tsx');
 expect(source).toContain("supabase.rpc('fenix_prod_notifications_list_user'");
 expect(source).toContain("supabase.rpc('fenix_prod_notification_mark_user'");
 expect(source).not.toContain('p_actor_code');
 expect(source).not.toContain('fetchNotionRuntime');
});

test('L7 notification actions are bounded to read and dismiss',async()=>{
 const source=read('src/NotificationsShell.tsx');
 expect(source).toContain("action:'read'|'dismiss'");
 expect(source).toContain("p_action:action");
 expect(source).toContain('action_route');
 expect(source).toContain('No creo notificaciones sin fuente.');
});
