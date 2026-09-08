# SCAN-001 · Digital Footprint Scanner V0.2

Estado: PREPROD determinista/read-only. Runtime compartido; coste adicional 0 €.

Escanea señales públicas HTTP de un dominio mediante un `fetcher` inyectado: root HTML, robots.txt, sitemap.xml, señales tecnológicas y perfiles sociales enlazados. Produce evidencia fechada y hash SHA-256. No realiza login, brute force, enumeración agresiva, escritura remota, polling ni mutación de WordPress/Cloudflare.

V0 no intenta sustituir `WEB-001`; lo consume como frontera web canónica y deja crawling profundo/SEO especializado a motores posteriores. Tests usan fetcher local falso, por lo que CI no depende de Internet.

Backup/rebuild: Git + manifest versionado + contrato/tests. Rollback: FACT-001 Registry pointer a scaffold 0.1.0. PROD: DENY.
