# Persona Ficticia 114: Reembolsa un fondo con pérdida y vuelve a suscribirlo antes de un año

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Reembolsa en abril de 2025 un fondo de bolsa con 1.000 € de pérdida y lo vuelve a suscribir en septiembre: la pérdida no cuenta este año (art. 33.5.g). Reembolsa otro de renta fija con 300 € de ganancia y 57 € de retención.

Qué prueba: regla antiaplicación de pérdidas en participaciones no cotizadas: un año (art. 33.5.g); retención del 19 % de la ganancia del fondo (0603).

Archivos (inventados, con las columnas de la ayuda pública de cada plataforma): `archivos/banco-movimientos-fondos.csv`.

Trabajo: íntegros 30.000,00 €, Seguridad Social 1905,00 €, retenciones 4500,00 € (no se detalla: lo comprueban otros casos).

Fuentes: Ley 35/2006 del IRPF, arts. 25, 33, 35, 37, 46, 49, 80 y 94 ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); ayuda de Renta 2025 sobre [monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html); Orden HAC/277/2026 (modelo 100 de 2025, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)); docs/fiscalidad/inversiones.md.

## Cálculo

- [0422] Suma de ganancias del ahorro: Renta fija: 2.300 − 2.000 = 300 → **300,00**
- [0423] Suma de pérdidas del ahorro: Bolsa: 4.000 − 5.000 = −1.000, pero se vuelven a comprar participaciones en el año siguiente y siguen en el patrimonio: no se computa (art. 33.5.g) → **0,00**
- [0424] Saldo neto positivo de ganancias del ahorro: 300 − 0 = 300 → **300,00**
- [0460] Base imponible del ahorro: 300 → **300,00**
- [0609] Total pagos a cuenta: Retenciones del trabajo 4500,00 + retenciones de las inversiones 57,00 = 4557,00 → **4557,00**

La app no debe dar avisos.
