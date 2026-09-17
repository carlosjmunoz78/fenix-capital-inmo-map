export function normalizeTaskState(value:string){
 return value.trim().toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

export function isTerminalTaskState(value:string){
 const state=normalizeTaskState(value);
 return /complet|terminad|cerrad|hecha|cancelad|anulad|baja|finalizad/.test(state);
}

export function isCompletedTaskState(value:string){
 const state=normalizeTaskState(value);
 return /complet|terminad|cerrad|hecha|finalizad/.test(state)&&!/cancelad|anulad|baja/.test(state);
}

export function isCancelledTaskState(value:string){
 const state=normalizeTaskState(value);
 return /cancelad|anulad|baja/.test(state);
}
