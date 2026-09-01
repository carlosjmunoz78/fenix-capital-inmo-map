import {IS_PRODUCTION} from './supabase';

/**
 * Las rutas que estuvieron protegidas ya cuentan con contrato canónico PROD.
 * Conservamos el guard como punto único para volver a cerrar escrituras si una
 * capacidad productiva se degrada en el futuro, sin introducir bloqueos
 * permanentes ni rutas TEST en la aplicación operativa.
 */
export default function ProductionWriteSafetyGuard(){
 if(!IS_PRODUCTION)return null;
 return null;
}
