# Persona Ficticia 113: Vende un ETF en Degiro y reembolsa un fondo que antes traspasó

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

ETF comprado en Degiro en 2024 por 2.000 € + 2 € y vendido en 2025 por 2.400 € − 2 €; dividendo de 30 € con 4,50 € retenidos fuera. En su gestora traspasa en 2025 un fondo comprado en 2021 por 1.000 € a otro fondo (no tributa) y después reembolsa este por 1.800 € con 152 € de retención.

Qué prueba: ETF en el apartado de instituciones de inversión colectiva (0310-0325); traspaso entre fondos: el nuevo conserva coste y fecha (art. 94.1.a); retención del 19 % en el reembolso (casilla 0603); doble imposición internacional del dividendo (0588).

Archivos (inventados, con las columnas de la ayuda pública de cada plataforma): `archivos/degiro-transacciones.csv`, `archivos/degiro-estado-de-cuenta.csv`, `archivos/gestora-movimientos-fondos.csv`.

Trabajo: íntegros 30.000,00 €, Seguridad Social 1905,00 €, retenciones 4500,00 € (no se detalla: lo comprueban otros casos).

Fuentes: Ley 35/2006 del IRPF, arts. 25, 33, 35, 37, 46, 49, 80 y 94 ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); ayuda de Renta 2025 sobre [monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html); Orden HAC/277/2026 (modelo 100 de 2025, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)); docs/fiscalidad/inversiones.md.

## Cálculo

- [0029] Dividendos: Dividendo bruto de 30 € → **30,00**
- [0424] Saldo neto positivo de ganancias del ahorro: ETF: 2.400 − 2 = 2.398 − (2.000 + 2) = 396; fondo B: 1.800 − 1.000 (coste del fondo A traspasado, de 2021) = 800; 396 + 800 = 1.196 → **1196,00**
- [0460] Base imponible del ahorro: 1.196 + 30 = 1.226 → **1226,00**
- [0588] Deducción por doble imposición internacional: La menor de 4,50 € pagados fuera y 30 × 19 % = 5,70 € → 4,50 € → **4,50**
- [0609] Total pagos a cuenta: Retenciones del trabajo 4500,00 + retenciones de las inversiones 152,00 = 4652,00 → **4652,00**

La app no debe dar avisos.
