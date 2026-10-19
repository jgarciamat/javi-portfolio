# Persona Ficticia 116: Extracto de eToro con acciones, bitcoin, un CFD y dividendos

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Posiciones cerradas en 2025: acciones (+220 $), bitcoin (−110 $) y un CFD corto apalancado (+33 $). Dividendo neto de 18,70 $ con 3,30 $ retenidos. Tipo de cambio INVENTADO: 1,10 $ por euro.

Qué prueba: extracto de eToro en Excel (hojas «Closed Positions» y «Dividends»); las acciones y el bitcoin con su compra (FIFO), el CFD como derivado; doble imposición internacional (0588).

Archivos (inventados, con las columnas de la ayuda pública de cada plataforma): `archivos/etoro-extracto-de-cuenta.xlsx`.

Trabajo: íntegros 30.000,00 €, Seguridad Social 1905,00 €, retenciones 4500,00 € (no se detalla: lo comprueban otros casos).

Fuentes: Ley 35/2006 del IRPF, arts. 25, 33, 35, 37, 46, 49, 80 y 94 ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); ayuda de Renta 2025 sobre [monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html); Orden HAC/277/2026 (modelo 100 de 2025, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)); docs/fiscalidad/inversiones.md.

## Cálculo

- [0029] Dividendos: (18,70 + 3,30) $ / 1,10 = 20 € → **20,00**
- [0422] Suma de ganancias del ahorro: Acciones: (1.100 + 220) / 1,10 = 1.200 − 1.100 / 1,10 = 1.000 → 200; CFD: (220 + 33) / 1,10 = 230 − 200 → 30; 200 + 30 = 230 → **230,00**
- [0423] Suma de pérdidas del ahorro: Bitcoin: (550 − 110) / 1,10 = 400 − 550 / 1,10 = 500 → −100 → **100,00**
- [0424] Saldo neto positivo de ganancias del ahorro: 230 − 100 = 130 → **130,00**
- [0460] Base imponible del ahorro: 130 + 20 = 150 → **150,00**
- [0588] Deducción por doble imposición internacional: La menor de 3,30 $ / 1,10 = 3 € y 20 × 19 % = 3,80 € → 3 € → **3,00**
- [0609] Total pagos a cuenta: Retenciones del trabajo 4500,00 = 4500,00 → **4500,00**

Avisos que debe dar la app: derivative, realizedMatching (ver docs/fiscalidad/inversiones.md).
