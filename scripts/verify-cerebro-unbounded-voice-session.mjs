import fs from 'node:fs';

const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');

function must(value,label){
 if(!value)throw new Error(label);
}

must(shell.includes("voiceSessionRef.current=true"),'voice session must remain explicitly active after start');
must(shell.includes("scheduleListening(180)"),'TTS completion must resume listening');
must(shell.includes("scheduleListening(400)"),'recognition end must resume listening');
must(shell.includes("voiceSessionActive?'Finalizar conversación':'Hablar con CEREBRO'"),'only explicit UI session-end control must be visible');

const sendStart=shell.indexOf('async function sendText(');
const listenStart=shell.indexOf('function startListening()',sendStart);
must(sendStart>=0&&listenStart>sendStart,'sendText boundaries missing');
const sendBlock=shell.slice(sendStart,listenStart);
must(!sendBlock.includes('endVoiceSession()'),'ordinary completed turns must never end the voice session');

const forbidden=[
 /MAX[_A-Z]*TURNS?/,
 /TURN[_A-Z]*LIMIT/,
 /turnCount/,
 /messageCount\s*[>=]/,
 /lines\.length\s*>?=\s*[1-9][0-9]*/,
 /questions?\s*[>=]\s*3/i
];
for(const pattern of forbidden){
 must(!pattern.test(shell),'artificial voice conversation turn limit detected: '+pattern);
}

console.log('GREEN CEREBRO voice conversation has no application-level turn cap');
