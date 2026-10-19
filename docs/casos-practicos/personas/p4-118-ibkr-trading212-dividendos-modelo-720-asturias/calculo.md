# Persona Ficticia 118: Acciones en Interactive Brokers por más de 50.000 € y un ETF en Trading 212

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Compró 100 acciones ficticias en 2024 por 55.000 $ + 11 $; en 2025 vende 10 por 6.600 $ − 11 $ y cobra 440 $ de dividendo con 66 $ retenidos. En Trading 212 compra y vende un ETF con 50 € de pérdida y cobra 2 € de intereses. Tipo de cambio INVENTADO: 1,10 $ por euro.

Qué prueba: extracto de actividad de Interactive Brokers (secciones Trades, Dividends, Withholding Tax); aviso del modelo 720: valores en el extranjero por más de 50.000 €; pérdida de un ETF en el apartado de IIC.

Archivos (inventados, con las columnas de la ayuda pública de cada plataforma): `archivos/ibkr-activity-statement.csv`, `archivos/trading212-historial.csv`.

Trabajo: íntegros 30.000,00 €, Seguridad Social 1905,00 €, retenciones 4500,00 € (no se detalla: lo comprueban otros casos).

Fuentes: Ley 35/2006 del IRPF, arts. 25, 33, 35, 37, 46, 49, 80 y 94 ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); ayuda de Renta 2025 sobre [monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html); Orden HAC/277/2026 (modelo 100 de 2025, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)); docs/fiscalidad/inversiones.md.

## Cálculo

- [0027] Intereses: Intereses de la cuenta: 2 € → **2,00**
- [0029] Dividendos: 440 $ / 1,10 = 400 € → **400,00**
- [0041] Rendimiento neto del capital mobiliario: 400 + 2 = 402 → **402,00**
- [0422] Suma de ganancias del ahorro: Venta de 10 acciones: (6.600 − 11) / 1,10 = 5.990 − 10/100 × (55.000 + 11) / 1,10 = 5.001 → 989 → **989,00**
- [0423] Suma de pérdidas del ahorro: ETF: 950 − 1.000 = −50 → **50,00**
- [0424] Saldo neto positivo de ganancias del ahorro: 989 − 50 = 939 → **939,00**
- [0460] Base imponible del ahorro: 939 + 402 = 1.341 → **1341,00**
- [0588] Deducción por doble imposición internacional: La menor de 66 $ / 1,10 = 60 € y 400 × 19 % = 76 € → 60 € → **60,00**
- [0609] Total pagos a cuenta: Retenciones del trabajo 4500,00 = 4500,00 → **4500,00**

Avisos que debe dar la app: model720 (ver docs/fiscalidad/inversiones.md).
