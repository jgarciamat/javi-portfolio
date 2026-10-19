# Persona Ficticia 112: Acciones de EE. UU. en Revolut con dividendos retenidos en origen

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Compró 10 acciones ficticias por 1.100 $ en 2024 y vende 5 por 660 $ en 2025. Cobra 22 $ de dividendo con 3,30 $ retenidos en EE. UU. y paga 1,10 $ de custodia. Tipo de cambio INVENTADO: 1,10 $ por euro.

Qué prueba: importes en dólares pasados a euros con el tipo de cada día (aquí uno inventado); dividendos (0029) y gastos de custodia (0037); deducción por doble imposición internacional (0588, art. 80).

Archivos (inventados, con las columnas de la ayuda pública de cada plataforma): `archivos/revolut-extracto-acciones.csv`.

Trabajo: íntegros 30.000,00 €, Seguridad Social 1905,00 €, retenciones 4500,00 € (no se detalla: lo comprueban otros casos).

Fuentes: Ley 35/2006 del IRPF, arts. 25, 33, 35, 37, 46, 49, 80 y 94 ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)); ayuda de Renta 2025 sobre [monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html); Orden HAC/277/2026 (modelo 100 de 2025, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)); docs/fiscalidad/inversiones.md.

## Cálculo

- [0029] Dividendos: 22 $ / 1,10 = 20 € → **20,00**
- [0037] Gastos de administración y custodia: 1,10 $ / 1,10 = 1 € → **1,00**
- [0041] Rendimiento neto del capital mobiliario: 20 − 1 = 19 → **19,00**
- [0424] Saldo neto positivo de ganancias del ahorro: Venta de 5 acciones: 660 $ / 1,10 = 600 − adquisición 5/10 × 1.000 € = 500 → 100 → **100,00**
- [0460] Base imponible del ahorro: 100 + 19 = 119 → **119,00**
- [0588] Deducción por doble imposición internacional: La menor de: impuesto pagado en EE. UU. 3,30 $ / 1,10 = 3 €, y 20 € × tipo medio del ahorro 19 % = 3,80 € → 3 € → **3,00**
- [0609] Total pagos a cuenta: Retenciones del trabajo 4500,00 = 4500,00 → **4500,00**

La app no debe dar avisos.
