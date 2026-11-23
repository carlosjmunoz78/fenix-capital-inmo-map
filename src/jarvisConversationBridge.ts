import {createContext,type RefObject} from 'react';

/**
 * Private same-tree bridge between the canonical JARVIS Console and its
 * visual composer. No DOM mutation, timers, global events or second chat API.
 * The Console remains the only owner of authentication, messages and voice.
 */
export type JarvisConversationDriver={
 sendText:(message:string)=>Promise<boolean>;
 toggleVoice:()=>void;
};
export const JarvisConversationBridgeContext=
 createContext<RefObject<JarvisConversationDriver|null>|null>(null);
