# B9 CHANGELOG · 2026-11-04
- CUT00: Verificada PR18/B8, PR17/B7, PR16/B6, rama y HEAD actuales; leído clasificador B9 y legacy bounded-recovery para evitar duplicar.
- CUT01: Añadido nuevo B9 evidence admission gate y 29 pruebas adversarias; 442/442 PASS con 3 workflows GitHub verde en f4ae911b2d94aacb55fde438085e6b9c0521b180.
- CUT02: Añadido script PG17 B9 CI aislado; creación de workflow bloqueada por seguridad, NO EJECUTADO, no declarado verde.
- CUT03: Añadidas 5 pruebas de rollback real sobre ficheros sintéticos temporales; 447/447 PASS en run 41794193596.
- CUT04: Añadidas 11 pruebas de compatibility legacy y 4 de gate de promoción; 462/462 PASS en run 41794601700. B4 PG17 41794601689, B7 41794601734, Governed 41794601696, todos SUCCESS; sin PROD.
- Seguridad: B3/B4 PROD enabled=false / kill_switch=true observados, sin escritura real.
- 179-engine Registry intacto, ninguna suscripción ni llamadas IA de pago, main no tocada; estado PARCIAL.
