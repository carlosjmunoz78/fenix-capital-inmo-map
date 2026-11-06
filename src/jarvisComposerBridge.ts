/** Private UI-only bridge between the bottom JARVIS composer and the existing
 * authenticated CEREBRO Gateway chat. Does not hold API credentials or bypass IAM.
 */
export const JARVIS_COMPOSER_SEND_EVENT='fenix:jarvis-composer-send';
export type JarvisComposerSendDetail={message:string;accepted:boolean};

export function sendJarvisComposerMessage(message:string):boolean{
 if(typeof window==='undefined'||typeof CustomEvent==='undefined')return false;
 const clean=message.trim();
 if(!clean||clean.length>4000)return false;
 const detail:JarvisComposerSendDetail={message:clean,accepted:false};
 window.dispatchEvent(new CustomEvent<JarvisComposerSendDetail>(JARVIS_COMPOSER_SEND_EVENT,{detail}));
 return detail.accepted;
}
