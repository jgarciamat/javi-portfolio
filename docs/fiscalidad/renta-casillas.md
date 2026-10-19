# Catálogo de casillas del modelo 100: Renta 2025 (campaña 2026)

> Información orientativa, no asesoramiento fiscal. Verifica siempre en la fuente oficial. Fecha de comprobación: **19-10-2026**.

El catálogo legible por máquina está en **[renta-casillas.json](renta-casillas.json)**. Este documento explica cómo se ha hecho, qué contiene y qué le falta.

## Fuentes

| Fuente | Uso | URL |
|---|---|---|
| Orden HAC/277/2026, de 25 de marzo, anexo I: modelo D-100, ejercicio 2025 (BOE núm. 76, de 27-03-2026, BOE-A-2026-7041) | **Fuente principal.** El anexo I reproduce el impreso entero: páginas 1-25 y anexos A.1-A.6, B.1-B.15, C.1-C.5 y D, con los números de casilla y las fórmulas impresas. | <https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf> |
| AEAT, Manual práctico de Renta 2025 (por capítulos) | Norma y explicación de cada apartado (enlace por apartado en la tabla). | <https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/100.html> |
| Ley 35/2006 del IRPF, texto consolidado (BOE) | Comprobación de los artículos citados y de las cifras. | <https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764> |
| Borrador real de Renta 2025 de un usuario | **Solo la estructura**: cómo imprime el borrador las casillas (siempre con 4 cifras, incluidas las de identificación) y el orden «etiqueta · importe · casilla». No se ha copiado ningún dato personal. | (local, no publicado) |

**No usado:** el «diseño de registro» del modelo 100 (DR100) de la AEAT no se pudo obtener en esta revisión. Por eso el tipo de dato de cada casilla es una **clasificación heurística** por la etiqueta (importe, marca, texto, fecha, clave, número, porcentaje), **NO CONFIRMADA** contra el diseño de registro.

## Método

1. Se descargó el PDF del BOE y se extrajo el texto con su posición (pdfjs-dist del repositorio, en modo solo lectura) con un script temporal fuera del repositorio.
2. Cada número de casilla del impreso (cuerpo de letra pequeño, 4 cifras) se asoció al texto de su misma línea, a la izquierda, más las líneas de continuación de encima. Si no había texto a la izquierda (celdas de tabla), se usó la cabecera de la columna y la fila: esas etiquetas tienen `confianza_etiqueta: "baja"`.
3. La **fórmula** es literal del impreso cuando la etiqueta la contiene (p. ej. `[0012] = [0003] + [0007] + [0008] + [0024] + [0009] + [0010] - [0011] - [0058]`). No se ha inventado ninguna: si el impreso no la imprime, el campo es `null`. Hay dos fórmulas de la página 7 (0149 y 0154) reconstruidas a mano a partir de la fila del impreso, que tiene los números de casilla separados (`confianza_etiqueta: "revisada"`).
4. El **apartado** se asignó por página y título. La **norma** se da por apartado (campo `normas` de `apartados`), comprobada contra el índice del texto consolidado de la LIRPF y del Manual. Además, cada casilla lista en `normas_citadas_en_impreso` los artículos que cita su propia etiqueta.
5. `depende_ccaa` vale `true` si la etiqueta habla de la parte autonómica, si es la segunda columna («parte autonómica») de las parejas estatal/autonómica de las páginas 21-23, o si pertenece a los anexos B.
6. Las casillas de **identificación** (páginas 1-3) se numeran en el impreso con 2-3 cifras. Se catalogaron a mano a partir del texto del BOE, en `identificacion`. El borrador las imprime con 4 cifras («0010» = fecha de nacimiento), **que coinciden en número con otras casillas de 4 cifras del impreso** (0010 es también «aportaciones a patrimonio protegido»). Hay que tenerlo en cuenta al leer PDF (ver [cobertura.md](cobertura.md)).

## Estructura del JSON

```jsonc
{
  "meta": { "fuente_principal": {...}, "metodo": "...", "limitaciones": [...], "recuento": {...} },
  "apartados": [ { "codigo": "A", "nombre": "...", "manual": "url", "normas": ["LIRPF arts. 17-20", ...],
                   "depende_ccaa": false, "n_casillas": 27, "rango_min": "0001", "rango_max": "0058" } ],
  "identificacion": [ { "casilla": "10", "casilla_borrador": "0010", "etiqueta": "Fecha de nacimiento del primer declarante",
                        "tipo": "fecha", "datos_personales": true, ... } ],
  "casillas": [ { "casilla": "0017", "etiqueta": "Rendimiento neto previo ([0012] - [0013] ...)",
                  "apartado": "A", "subapartado": null, "pagina_impreso": "Página 4", "pagina_boe_pdf": 24,
                  "tipo": "importe", "formula": "[0017] = [0012] - [0013] - [0014] - [0015] - [0016]",
                  "normas_citadas_en_impreso": [], "depende_ccaa": false, "parte": null,
                  "confianza_etiqueta": "alta", "repetida_en_paginas": null } ]
}
```

## Recuento

- **2.205 casillas de 4 cifras** distintas, más **70 de identificación**. Total: 2.275.
- 246 casillas tienen fórmula impresa. La confianza de las etiquetas es alta en 1.768, revisada en 3 y **baja en 434** (casi todas son celdas de tabla: módulos, agrarias, precio aplazado, anexos C y D).
- Tipos (heurísticos): 1.721 importes, 252 textos (NIF, referencias...), 84 marcas, 57 claves, 38 números, 35 fechas y 18 porcentajes.

## Apartados

| Código | Apartado | Páginas del impreso | Casillas | Mín.–máx. (no contiguo) | Etiquetas de confianza baja | CCAA | Normas principales | Manual 2025 |
|---|---|---|---|---|---|---|---|---|
| ID | Identificación, situación familiar, rectificativa y opción de tributación | p. 1, p. 2, p. 3 | 70 | 2-3 cifras | 0 | sí | LIRPF arts. 82-84 (tributación conjunta); LIRPF art. 96-97 (obligación de declarar y autoliquidación); LIRPF art. 72 (residencia en una comunidad); Orden HAC/277/2026, art. 1 y anexo I | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c02-irpf-cuestiones-generales.html) |
| A | A. Rendimientos del trabajo | p. 4 | 27 | 0001–0058 | 3 | no | LIRPF arts. 17-20; RIRPF art. 10 (colegios profesionales; no reverificado); LIRPF DA 60.ª (actividades artísticas excepcionales) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html) |
| B | B. Rendimientos del capital mobiliario | p. 5 | 32 | 0026–0060 | 0 | no | LIRPF arts. 21, 25, 26 y 46; LIRPF DT 4.ª (seguros anteriores a 1994) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-mobiliario.html) |
| C | C. Bienes inmuebles: capital inmobiliario e imputación de rentas | p. 6, p. 7 | 94 | 0062–0598 | 7 | no | LIRPF arts. 22-24 (capital inmobiliario); LIRPF art. 85 (imputación de rentas inmobiliarias); RIRPF arts. 13-16 (no reverificado) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c04-rendimientos-capital-inmobiliario.html) |
| D-ED | D. Actividades económicas en estimación directa | p. 8, p. 9 | 62 | 0165–0237 | 0 | no | LIRPF arts. 27-30 y 32; RIRPF arts. 28-30 (no reverificado) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa.html) |
| D-EO | D. Actividades económicas en estimación objetiva (no agrarias) | p. 9 | 44 | 0238–1484 | 21 | no | LIRPF arts. 31 y 32; RIRPF arts. 32-39 (no reverificado); Orden HAC/1347/2024 (módulos 2025, citada en la ficha AEAT del modelo 100; contenido NO CONFIRMADO en esta revisión) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c08-rendimientos-actividades-economicas-eo-fores.html) |
| D-EOA | D. Actividades agrícolas, ganaderas y forestales en estimación objetiva | p. 10 | 79 | 0157–1560 | 51 | no | LIRPF art. 31; RIRPF arts. 32-39 (no reverificado); Orden de módulos del ejercicio (NO CONFIRMADO) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c09-rendimientos-actividades-economicas-eo-fores.html) |
| E | E. Regímenes especiales: atribución de rentas, AIE/UTE, transparencia fiscal internacional, derechos de imagen, IIC en paraísos | p. 11, p. 12 | 92 | 0161–1622 | 13 | no | LIRPF arts. 86-90 (atribución); LIRPF art. 91 (TFI); LIRPF art. 92 (derechos de imagen); LIRPF art. 95 (IIC en paraísos fiscales) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas.html) |
| F1 | F. Ganancias y pérdidas que no derivan de transmisiones (base general) | p. 13 | 34 | 0266–0362 | 8 | no | LIRPF arts. 33-34 y 45-46 (33-39: no reverificados uno a uno); LIRPF DA 33.ª (gravamen especial de loterías) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html) |
| F2 | F. Ganancias y pérdidas derivadas de transmisiones (base del ahorro) | p. 13, p. 14, p. 15, p. 16, p. 17, p. 18 | 155 | 0308–2236 | 11 | no | LIRPF arts. 33-39 y 46; LIRPF DT 9.ª (coeficientes de abatimiento) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html) |
| F3 | F. Ganancias por cambio de residencia (exit tax) y régimen de fusiones/canje | p. 18 | 14 | 0401–0417 | 0 | no | LIRPF art. 95 bis; LIS (Ley 27/2014) capítulo VII del título VII | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html) |
| G | G. Integración y compensación de rentas | p. 18 | 10 | 0418–0430 | 0 | no | LIRPF arts. 45-49 | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html) |
| H | H. Base imponible general y del ahorro | p. 19 | 24 | 0431–0460 | 0 | no | LIRPF arts. 48-49 | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html) |
| I | I. Reducciones de la base imponible | p. 20 | 39 | 0382–0499 | 0 | no | LIRPF arts. 51-55 y 84.2.4.º; LIRPF DA 11.ª (deportistas; no reverificado) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html) |
| J | J. Base liquidable general y del ahorro | p. 21 | 13 | 0491–0510 | 0 | no | LIRPF art. 50 | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html) |
| K | K. Mínimo personal y familiar (estatal y autonómico) | p. 21 | 14 | 0511–0524 | 4 | sí | LIRPF arts. 56-61; Ley 22/2009 art. 46 (competencia autonómica) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales.html) |
| L | L. Datos adicionales: rentas exentas con progresividad y anualidades por alimentos a hijos | p. 21 | 33 | 0456–1789 | 25 | sí | LIRPF arts. 64 y 75 (anualidades a hijos); Convenios para evitar la doble imposición (exención con progresividad) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html) |
| M | M. Cálculo del impuesto, deducciones, cuotas, pagos a cuenta y resultado | p. 22, p. 23, p. 24, p. 25 | 142 | 0240–0670 | 30 | sí | LIRPF arts. 62-81 bis (escalas, deducciones, cuotas); LIRPF DA 61.ª (deducción por rendimientos del trabajo); LIRPF arts. 99-103 (pagos a cuenta y devolución) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html) |
| M-CCAA | Importe del IRPF que corresponde a la comunidad autónoma | p. 25 | 3 | 0671–0675 | 0 | sí | Ley 22/2009 (financiación autonómica) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html) |
| N | N. Regularización (rectificativa), suspensión/renuncia del cónyuge y cuenta de devolución | p. 25 | 16 | 0676–1799 | 8 | no | LGT (Ley 58/2003) arts. 120.3 y 122; LIRPF art. 97.6 (suspensión del ingreso del cónyuge) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html) |
| A.1 | Anexo A.1: vivienda habitual (régimen transitorio), empresas de nueva creación, alquiler transitorio y donativos | A.1 | 29 | 0683–0725 | 3 | sí | LIRPF DT 18.ª; LIRPF art. 68.1 y 68.3; LIRPF DT 15.ª; Ley 49/2002 arts. 19-20 | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html) |
| A.2 | Anexo A.2: interés cultural, Ceuta y Melilla, vehículos eléctricos y puntos de recarga | A.2 | 21 | 0726–1935 | 1 | sí | LIRPF art. 68.4 y 68.5; LIRPF DA 58.ª | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html) |
| A.3 | Anexo A.3: obras de mejora de la eficiencia energética | A.3 | 42 | 1655–1779 | 4 | no | LIRPF DA 50.ª | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html) |
| A.4 | Anexo A.4: Reserva para Inversiones en Canarias/Baleares, unidades familiares UE y deducciones empresariales | A.4 | 61 | 0728–1943 | 33 | sí | Ley 19/1994 art. 27; Ley 31/2022 DA 70.ª; LIRPF DA 48.ª (unidades familiares UE/EEE); LIRPF art. 68.2 y LIS | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html) |
| A.5 | Anexo A.5: incentivos a la inversión empresarial (continuación) | A.5 | 53 | 0706–2061 | 4 | sí | LIRPF art. 68.2; LIS (Ley 27/2014) capítulo IV del título VI | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html) |
| A.6 | Anexo A.6: inversiones en Canarias, importe aplicable de incentivos y La Palma | A.6 | 17 | 0837–1847 | 0 | sí | LIRPF art. 68.2; LIRPF DA 57.ª (La Palma) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html) |
| B.1-B.10 | Anexos B.1 a B.10: deducciones autonómicas por comunidad | B.1, B.10, B.2, B.3, B.4, B.5, B.6, B.7, B.8, B.9 | 495 | 0201–2248 | 0 | sí | Ley 22/2009 art. 46; Normativa propia de cada comunidad (detalle en frontend/src/modules/tools/data/renta/ccaa/) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c17-deducciones-autonomicas-cuota.html) |
| B.11-B.15 | Anexos B.11 a B.15: información adicional de deducciones autonómicas | B.11, B.12, B.13, B.14, B.15 | 220 | 0638–2213 | 0 | sí | Ley 22/2009 art. 46 y normativa autonómica | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c17-deducciones-autonomicas-cuota.html) |
| C.1-C.5 | Anexos C.1 a C.5: información adicional (especie en emergentes, precio aplazado, reinversión, saldos y excesos pendientes) | C.1, C.2, C.3, C.4, C.5 | 292 | 0357–2243 | 166 | no | LIRPF arts. 14, 38, 48-52 y 54; Ley 28/2022 (empresas emergentes) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html) |
| D-anexo | Anexo D: información adicional de gastos de inmuebles arrendados | D | 48 | 1393–1440 | 42 | no | LIRPF art. 23; RIRPF art. 13 (no reverificado) | [cap.](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c04-rendimientos-capital-inmobiliario.html) |

## Cadena principal de cálculo (casillas más usadas y su fórmula impresa)

| Casilla | Apartado | Etiqueta (impreso, abreviada) | Fórmula impresa en el modelo |
|---|---|---|---|
| 0003 | A | Retribuciones dinerarias | — |
| 0012 | A | Total ingresos íntegros computables | `[0012] = [0003] + [0007] + [0008] + [0024] + [0009] + [0010] - [0011] - [0058]` |
| 0013 | A | Cotizaciones a la Seguridad Social o a mutualidades generales obligatorias de funcionarios | — |
| 0017 | A | Rendimiento neto previo | `[0017] = [0012] - [0013] - [0014] - [0015] - [0016]` |
| 0018 | A | Suma de rendimientos netos previos | `[0018] = suma de las casillas [0017]` |
| 0019 | A | Otros gastos deducibles | — |
| 0020 | A | Incremento para contribuyentes desempleados que acepten un puesto de trabajo que exija el  | — |
| 0021 | A | Incremento para trabajadores activos que sean personas con discapacidad | — |
| 0022 | A | Rendimiento neto | `[0022] = [0018] - [0019] - [0020] - [0021]` |
| 0023 | A | Cuantía aplicable con carácter general | — |
| 0025 | A | Rendimiento neto reducido | `[0025] = [0022] - [0057] - [0023]` |
| 0036 | B | Total ingresos íntegros | `[0036] = [0027] + [0028] + [0029] + [0030] + [0031] + [0032] + [0033] + [0034] + [0035]` |
| 0038 | B | Rendimiento neto | `[0038] = [0036] - [0037]` |
| 0040 | B | Rendimiento neto reducido | `[0040] = [0038] - [0039]` |
| 0041 | B | Suma de rendimientos reducidos del capital mobiliario a integrar en la base imponible del  | `[0041] = suma de las casillas [0040]` |
| 0052 | B | Total ingresos íntegros | `[0052] = [0046] + [0047] + [0048] + [0050] + [0051]` |
| 0054 | B | Rendimiento neto | `[0054] = [0052] - [0053]` |
| 0056 | B | Rendimiento neto reducido | `[0056] = [0054] - [0055]` |
| 0060 | B | Suma de rendimientos reducidos del capital mobiliario a integrar en la base imponible gene | `[0060] = suma de las casillas [0056]` |
| 0149 | C | Rendimiento neto del inmueble arrendado | `[0149] = [0102] - [0104] - [0107] - [0109] - [0110] - [0111] - [0112] - [0113] - [0114] - [0115] - [0116] - [0117] - [0131] - [0132] - [0146] - [0147] - [0148]` |
| 0154 | C | Rendimiento neto reducido del capital inmobiliario | `[0154] = la mayor de ([0149] - [0150] - [0151]) y [0152]` |
| 0155 | C | Suma de rentas inmobiliarias imputadas | `[0155] = suma de las casillas [0089]` |
| 0156 | C | Suma de rendimientos netos reducidos del capital inmobiliario | `[0156] = suma de las casillas [0154]` |
| 0180 | D-ED | Total ingresos computables | `[0180] = Suma [0171] a [0179]` |
| 0218 | D-ED | Suma | `[0218] = [0181] a [0195] + [0198] a [0200] + [0202] + [0203] + [0205] + [0206] + [0208] + [0227] + [0214] a [0217] + [0196] - [0197]` |
| 0220 | D-ED | Total gastos deducibles | `[0220] = [0218] + [0219]` |
| 0223 | D-ED | Total gastos deducibles | `[0223] = [0218] + [0222]` |
| 0224 | D-ED | Rendimiento neto | `[0224] = [0180] - [0220] o [0180] - [0223]` |
| 0226 | D-ED | Rendimiento neto reducido | `[0226] = [0224] - [0225] - [0236]` |
| 0231 | D-ED | Suma de rendimientos netos reducidos de las actividades económicas en estimación directa | `[0231] = suma de las casillas [0226]` |
| 0235 | D-ED | Rendimiento neto reducido total de las actividades económicas en estimación directa | `[0235] = [0231] - [0232] - [0233] - [0234] - [0237]` |
| 1479 | D-EO | Rendimiento neto de la actividad | `[1479] = [1474] - [1475] - [0238] - [1477] + [1478]` |
| 1484 | D-EO | Rendimiento neto reducido total de las actividades económicas | `[1484] = [1482] - [1483]` |
| 0418 | G | Suma de ganancias patrimoniales | `[0418] = [1606] + [0290] + [0297] + [0306] + [0400]` |
| 0419 | G | Suma de pérdidas patrimoniales | `[0419] = [1607] + [0307]` |
| 0422 | G | Suma de ganancias patrimoniales | `[0422] = [1608] + [0324] + [2235] + [0339] + [0354] + [1814] + [1845] + [1846] + [0386] + [0387] + [0390] + [0393] + [0412]` |
| 0423 | G | Suma de pérdidas patrimoniales | `[0423] = [1609] + [0325] + [2236] + [0340] + [0355] + [1813] + [1844] + [0385] + [0396]` |
| 0432 | H | Saldo neto de los rendimientos a integrar en la base imponible general y de las imputacion | — |
| 0435 | H | Base imponible general | `[0435] = [0420] - [0431] + [0432] - [0433] - [0434]` |
| 0460 | H | Base imponible del ahorro | `[0460] = [0424] - [0436] - [0439] - [0440] - [0441] - [0442] - [0443] - [0444] - [0445] - [0447] + [0429] - [0446] - [0449] - [0450] - [0451] - [0452] - [0453] - [0454] - [0455] - [0448]` |
| 0467 | I | Importes con derecho a reducción | `[0467] = [0463] + [0464] + [0465] + [0438] + [0426] + [0427] + [0499] + [0466]` |
| 0500 | J | Base liquidable general | `[0500] = [0435] - [0491] - [0492] - [0493] - [0494] - [0495] - [0496] - [0497]` |
| 0505 | J | Base liquidable general sometida a gravamen | `[0505] = [0500] - [0501]` |
| 0510 | J | Base liquidable del ahorro | `[0510] = [0460] - [0506] - [0507]` |
| 0519 | K | Mínimo personal y familiar | `[0519] = [0511] + [0513] + [0515] + [0517]` |
| 0520 | K | Importe total incrementado o disminuido del mínimo personal y familiar a efectos del cálcu | `[0520] = [0512] + [0514] + [0516] + [0518]` |
| 0521 | K | las casillas [0505] y [0519]. | `[0521] = Si la casilla [0505] es negativa o igual a cero, consigne el número cero en la casilla [0521]` |
| 0522 | K | Importe del mínimo personal y familiar que forma parte de la base liquidable del ahorro a  | `[0522] = [0519] - [0521]` |
| 0523 | K | en las casillas [0505] y [0520]. | `[0523] = Si la casilla [0505] es negativa o igual a cero, consigne el número cero en la casilla [0523]` |
| 0524 | K | Importe del mínimo personal y familiar que forma parte de la base liquidable del ahorro a  | `[0524] = [0520] - [0523]` |
| 0532 | M | Cuotas correspondientes a la base liquidable general | `[0532] = [0528] - [0530]` |
| 0533 | M | Cuotas correspondientes a la base liquidable general | `[0533] = [0529] - [0531]` |
| 0540 | M | Cuotas correspondientes a la base liquidable del ahorro | `[0540] = [0536] - [0538]` |
| 0541 | M | Cuotas correspondientes a la base liquidable del ahorro | `[0541] = [0537] - [0539]` |
| 0545 | M | Cuota íntegra estatal | `[0545] = [0532] + [0540]` |
| 0546 | M | Cuota íntegra autonómica | `[0546] = [0533] + [0541]` |
| 0570 | M | Cuota líquida estatal | `[0570] = [0545] - [0547] - [0549] - [0550] - [0552] - [0554] - [0556] - [0502] - [0558] - [0508] - [0560] - [0544] - [0562] - [0567] - [0607] - [0608] - [0565]` |
| 0571 | M | Cuota líquida autonómica | `[0571] = [0546] - [0548] - [0551] - [0553] - [0555] - [0557] - [0503] - [0559] - [0509] - [0561] - [0584] - [0563] - [0564] - [0566]` |
| 0587 | M | Cuota líquida incrementada total | `[0587] = [0585] + [0586]` |
| 0595 | M | Cuota resultante de la autoliquidación | `[0595] = [0587] - [0588] - [0414] - [0589] - [0590] - [0591]` |
| 0609 | M | Total pagos a cuenta | `[0609] = suma de las casillas [0592] + [0593] + [0594] + [0596] a [0606]` |
| 0610 | M | Cuota diferencial | `[0610] = [0595] - [0609]` |
| 0685 | N | Resultado | `[0685] = [0670] - [0676] + [0677]` |

## Qué falta y por qué (explícito)

| Hueco | Motivo | Cómo cerrarlo |
|---|---|---|
| Tipo de dato oficial, longitud y signo de cada casilla | No se pudo obtener el diseño de registro (DR100) de la AEAT | Descargar el DR100 de «Diseños de registro, modelos 100-199» (<https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-100-199.html>) y cruzarlo por número de casilla |
| 434 etiquetas de confianza baja | Celdas de tabla sin texto a la izquierda: módulos (1444-1535), agrarias, anexos C.1-C.5 y D, IBAN (1790-1799) | Revisión manual con el PDF a la vista; para la app solo hacen falta si se aborda ese bloque |
| Norma por casilla | Se da por apartado (y por la cita que lleve la etiqueta) | Asignar artículos casilla a casilla al construir cada bloque de la hoja de ruta |
| Reglas que no son fórmula (topes, «la menor de…») | Muchas están en notas «(*)» del impreso o en el Manual | La nota del impreso queda en la etiqueta; las reglas que importan se documentan en [cobertura.md](cobertura.md) y en la hoja de ruta |
| Deducciones autonómicas: qué deducción de la app corresponde a cada casilla de los anexos B | La app las identifica por id propio, no por casilla | Añadir el número de casilla a cada deducción de `frontend/src/modules/tools/data/renta/ccaa/*.ts` (bloque de la hoja de ruta) |
| Casillas repetidas por inmueble o actividad | El impreso repite el mismo bloque (inmuebles, actividades, elementos transmitidos) | El JSON guarda la primera aparición y la lista de páginas donde se repite (`repetida_en_paginas`) |

## Advertencias para quien lo use desde código

- Una casilla puede aparecer varias veces en el impreso (una por inmueble, actividad o elemento). Las sumas usan la casilla agregada (p. ej. 0156 = suma de todas las 0154).
- En el borrador y en los datos fiscales, las casillas de identificación tienen 4 cifras y **chocan** con casillas del apartado A (0010, 0011…). No hay que interpretar un «0010» sin saber de qué documento viene.
- Las fórmulas usan `-` en lugar de los guiones tipográficos del BOE; «Suma [0171] a [0179]» es una suma de rango.
