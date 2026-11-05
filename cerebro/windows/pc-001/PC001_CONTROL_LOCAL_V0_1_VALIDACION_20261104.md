# PC-001 · Control local V0.1 · candidato PREPROD

Estado: LAB_BUILD_GREEN / WINDOWS_PHYSICAL_PENDING.

Se creó un candidato de prueba visual y reversible con código fuente en Biblioteca `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/PC001_CONTROL_V0_1_SRC/` y paquete `CEREBRO_PC001_CONTROL_V0_1_PREPROD.zip`.

Pruebas: Go unitarias 3/3 PASS, vet Linux/Windows PASS, compilación de tests Windows PASS, compilación GUI Windows amd64 PASS, reproducibilidad SHA256 PASS.

SHA256 ejecutable: `d150f09b0580311d005b40b74c2dabab3f0b7e2b4e34402444add65afb557758`.

Aún no está conectado a Gateway ni a AccessBoot; no acepta órdenes remotas, no abre listeners y no modifica arranques, PROD ni Trading. Debe ejecutarse físicamente con consentimiento visible y validarse su JSON de resultados antes de integrarlo con el Gateway.

NEXT_BLOCK: `PC001_LOCAL_FIXTURE_PHYSICAL_E2E_AND_READBACK`; después, con evidencia, `PC001_AUTHENTICATED_GATEWAY_COMMAND_ADAPTER`.
