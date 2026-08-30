# Auditoría documental y bancaria de expedientes legado · 2026-08-30

## Alcance
Auditoría de preparación PROD sobre los 46 expedientes legado reconciliados en `Expedientes · Fénix Capital`. No despliega PROD, no toca `main`, no borra datos y no migra binarios a ciegas.

## Financiero
Decisión operativa vigente: todos los expedientes quedan asignados a Belén de momento.

Verificación realizada tras la asignación:
- 46/46 expedientes legado tienen `Financiero ficha` informado.
- El gap de financiero queda cerrado para el lanzamiento inicial.

## Documentación histórica
Fuente legado: `01_Expedientes_PRO`.

### Inventario corregido y verificado
Una primera agregación interpretó de forma demasiado amplia la presencia del campo de adjuntos. La verificación con `json_array_length` fija la cifra correcta:
- **31/46 expedientes tienen archivos reales en `📎 Documentación adjunta`**.
- Total de archivos adjuntos legacy detectados: **118**.
- Los 31 expedientes con archivos están **31/31 mapeados** a su expediente actual mediante `Clave deduplicación = exp-legado-<id_origen>`.
- Se ha comprobado además mediante lectura de una ficha legado que Notion conserva el nombre original del archivo dentro de la referencia de adjunto; por ejemplo, en `ANA LUQUE ROMERO MESA` aparecen `CERTIF.HACIENDA_ANA.pdf` y `CERTIF.SEG.SOCIAL_ANA.pdf`.

### Manifiesto por expediente
| Expediente | Archivos legacy |
|---|---:|
| JESUS EGEA Y SARA | 2 |
| GABRIELA LUCICA IORGA | 9 |
| CARMELO | 2 |
| ISABEL | 10 |
| PACO Y TAMARA | 1 |
| MARCOS | 2 |
| FRANCISCA DURAN TABARES | 2 |
| JORGE Y ALEX | 2 |
| FRANCISCO VALDERRAMA Y GEMA LLAMAS | 1 |
| ROSELIS Y RODERICK | 1 |
| JONATAN, MACARENA Y JOSE ANTONIO | 2 |
| YESICA Y RUBEN | 6 |
| FRANCISCO Y ESTHER | 1 |
| JAVIER | 1 |
| ANA LUQUE ROMERO MESA | 2 |
| SERGIO GAITAN Y GEMA VELASCO | 2 |
| KARLA | 2 |
| MARIA BENILDE GOMEZ DE ARANDA PEREA | 1 |
| JAVIER VILLA GUZMAN | 2 |
| JAVIER NAVARRO (MAÑO) | 8 |
| NURIA | 1 |
| MARIA RONCERO Y FRANCISCO | 11 |
| CARLOS Y MARIA | 1 |
| MARIA JESUS | 1 |
| Mª CARMEN VELA ORTIZ | 1 |
| THAILAN Y ANGELA | 1 |
| FELISA Y MAGDALENA | 1 |
| KIKO LOPERA | 12 |
| LOLA FONSECA PABLO | 13 |
| SAMRA IMRAN | 10 |
| CRISTINA GRACIA | 7 |
| **TOTAL** | **118** |

Fuente nueva: `Documentación · Fénix Capital`.

Estado actual comprobado:
- 49 registros documentales totales.
- 47 están relacionados con algún expediente.
- 36 están marcados `Migrado TEST`.
- **0 registros tienen actualmente `Archivo tratado` informado**.

Conclusión:
- La estructura documental nueva existe, pero los 118 binarios históricos no están todavía representados como archivos operativos en la nueva base.
- La identidad expediente-origen está resuelta para los 31 expedientes que contienen archivos, por lo que ya existe un destino inequívoco por expediente.
- No es seguro dar por migrada la documentación solo porque existan registros documentales relacionados.
- La migración binaria no se ejecutará reutilizando IDs de archivo internos a ciegas: antes debe existir un método de copia que preserve contenido, nombre y relación y permita verificar accesibilidad en destino.
- No se deben recrear tipos de documento ni clasificaciones si el archivo legacy no aporta evidencia suficiente.

## Bancos históricos
En `01_Expedientes_PRO`:
- 28 expedientes tienen información en `🏦 Banco (lista)`.
- Solo 2 expedientes tienen relación bancaria estructurada en `🏦 Banco (relación)`.
- Los valores de lista incluyen BBVA, ING, ABANCA, Caja Rural de Granada, UNICAJA y UCI según el expediente; en varios casos hay más de un banco histórico.

Modelo nuevo:
- El expediente dispone de relación `Envíos a banco`.
- `Envíos a banco · Fénix Capital` contiene actualmente 12 registros, 12 ligados a expediente y 11 ligados a banco.

Conclusión:
- La lista antigua de bancos no debe copiarse directamente como si cada banco hubiera sido un envío real.
- Solo deben generarse `Envíos a banco` cuando exista evidencia de envío/gestión bancaria; una mera lista histórica puede representar candidatos, bancos considerados o trabajo previo.
- Los 2 expedientes con relación bancaria estructurada legacy ofrecen evidencia más fuerte, pero aun así deben conservarse como histórico o mapearse al modelo actual según el contexto del expediente.

## Gate antes de PROD
1. Mantener Belén como financiero inicial en los 46 expedientes legado.
2. Mantener este manifiesto de 118 archivos como baseline documental y repetir el recuento en el corte final previo al lanzamiento.
3. Obtener cada binario legacy mediante mecanismo de copia soportado, conservar nombre/origen y vincularlo únicamente al expediente exacto ya mapeado.
4. Migrar al modelo `Documentación · Fénix Capital` sin inventar tipo, estado o metadatos no demostrados.
5. Verificar tras la copia: 118/118 archivos esperados, apertura real del archivo y relación correcta con expediente.
6. Reconciliar bancos distinguiendo: enviado realmente, considerado/candidato y simple referencia histórica.
7. Ejecutar un corte final del CRM antiguo inmediatamente antes del lanzamiento para incorporar cambios y archivos añadidos desde esta auditoría.

## Regla de seguridad
No se borran ni se sustituyen adjuntos legacy durante la transición. El CRM antiguo seguirá siendo fuente de contraste durante el periodo de convivencia hasta que la integridad documental y bancaria quede validada.
