# PRE-PROD redeploy 2026-08-20

Redeploy solicitado tras detectar que la URL abierta por el usuario mostraba una compilación anterior.

Objetivo de esta publicación:
- publicar la rama `preprod-app-phase1` actual;
- mantener el acceso TEST con alias que admiten espacios y guiones (`FIN A`, `FIN-A`, etc.);
- publicar el branding actual con el logotipo Fénix integrado;
- no tocar `main`, PROD ni WordPress.

La contraseña sigue validándose únicamente contra Supabase Auth TEST; no se exponen ni se incorporan credenciales al repositorio.
