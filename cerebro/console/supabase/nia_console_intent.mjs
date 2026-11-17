// NIA Console exact intent matcher. No fuzzy hijacking of existing chat.
export const NIA_CONSOLE_ALLOWED_TOPICS=Object.freeze({
 'documentacion':'documentation','documentación':'documentation',
 'conocimiento':'knowledge','investigacion':'research','investigación':'research',
 'reuniones':'meeting-notes','skills':'notion-skills','eventos':'notion-events'
});
export function parseNiaConsoleReadIntent(message){
 if(typeof message!=='string'||message.length>120)return null;
 const normalized=message.trim().toLowerCase().normalize('NFC');
 const m=normalized.match(/^(?:consulta\s+(?:a\s+)?nia|nia\s*:)\s*(documentaci[oó]n|conocimiento|investigaci[oó]n|reuniones|skills|eventos)?[.!?]?$/u);
 if(!m)return null;
 return m[1]?NIA_CONSOLE_ALLOWED_TOPICS[m[1]]??null:'documentation';
}
