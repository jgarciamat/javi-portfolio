# Inventario de modelos tributarios y de Seguridad Social (personas físicas y autónomos)

> Información orientativa, no asesoramiento fiscal. Verifica siempre en la fuente oficial. Fecha de comprobación: **19-10-2026**.

Este inventario reúne los modelos que pueden afectar a los usuarios de Finanverso: asalariados y pensionistas, autónomos en estimación directa o en módulos, inversores y arrendadores. También menciona los casos que quedan fuera del alcance de la app. Para cada modelo se indica quién lo presenta, la periodicidad y los plazos de 2026, qué datos pide, qué normas lo regulan, si es obligatorio y con qué otros modelos se relaciona. La última columna dice qué hace hoy la app (el detalle está en [cobertura.md](cobertura.md)).

## Fuentes generales (comprobadas el 19-10-2026)

- **[CAL]** AEAT, *Calendario del contribuyente 2026*, calendario anual por días: <https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html>. Cada plazo citado abajo sale de las subpáginas «hasta-DD-mes», por ejemplo `.../calendario-anual/abril/hasta-20-abril.html`.
- **[O100]** Orden HAC/277/2026, de 25 de marzo, de modelos de IRPF y Patrimonio 2025 (BOE núm. 76, de 27-03-2026, BOE-A-2026-7041): <https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf>.
- **[LIRPF]** Ley 35/2006 del IRPF, texto consolidado: <https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764>.
- **[FICHA Gxxx]** Ficha del procedimiento en la sede de la AEAT: `https://sede.agenciatributaria.gob.es/Sede/procedimientoini/<código>.shtml`. Los códigos se indican en cada modelo. La «normativa» citada es la que lista la propia ficha. Cuando la ficha enumera varias órdenes sin decir cuál aprueba el modelo, se indica «según la ficha».
- **[I303]** AEAT, instrucciones del modelo 303 para 2026: <https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html>.
- **[I130]** AEAT, instrucciones del modelo 130: <https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html>.
- **[PJC]** Orden PJC/297/2026, de 30 de marzo, de cotización 2026 (BOE-A-2026-7296): <https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296>.
- **[LETA]** Ley 20/2007 del Estatuto del Trabajo Autónomo, texto consolidado: <https://www.boe.es/buscar/act.php?id=BOE-A-2007-13409>.

Plazos: si el último día cae en sábado o en día inhábil, pasa al siguiente día hábil ([I130], apartado de plazos). Por eso en 2026 el «31 de enero» fue el **2 de febrero** y el «28 de febrero» fue el **2 de marzo** [CAL].

## Mapa rápido por perfil

| Perfil | Modelos habituales | Ocasionales |
|---|---|---|
| (a) Asalariado o pensionista | 100 (Renta), 102 (2.º plazo) | 145 (datos al pagador), 146 (pensionistas con dos pagadores), 140/143/121 (abono anticipado o cesión de deducciones familiares), 714 (Patrimonio), 720/721 |
| (b) Autónomo en estimación directa | 036 (alta), 303 + 390 (IVA), 130 (pago fraccionado), 100 (Renta, con actividad), RETA | 111 + 190 (si paga nóminas o a profesionales), 115 + 180 (si alquila local con retención), 347, 349 (intracomunitarias), 035/369 (ventanilla única), 309, 840/848 (IAE, normalmente exento) |
| (c) Autónomo en módulos | 036, 131 (pago fraccionado), 303 (régimen simplificado) + 390, 100 | Igual que (b) en retenciones |
| (d) Inversor o arrendador | 100 (ganancias, dividendos, alquileres), 720 (bienes en el extranjero), 721 (cripto custodiada fuera), 714 | 115/180 solo si el arrendatario es empresario: lo presenta el **inquilino** retenedor, no el arrendador |
| (e) No residentes y casos especiales | 210, 216, 151 (régimen de desplazados), 200/202 (sociedades) | **Fuera del alcance** de la app: solo se mencionan |

## Inventario detallado

Leyenda de «App»: **Calcula** = genera el borrador del modelo; **Plazo** = solo avisa del plazo; **—** = no lo trata.

### Imposición sobre la renta: declaraciones anuales y documentos de ingreso

| Modelo | Qué es / quién lo presenta | Periodicidad y plazo 2026 | Datos que pide | Norma | Obligatorio | Relación con otros | App |
|---|---|---|---|---|---|---|---|
| **100** | Declaración anual del IRPF. Residentes obligados a declarar o que quieren devolución. | Anual. Ejercicio 2025: del **8-4 al 30-6-2026**; con domiciliación, hasta el **25-6-2026** [O100 art. 7; CAL]. | Todas las rentas, reducciones, mínimos, deducciones y retenciones (catálogo en [renta-casillas.md](renta-casillas.md)). | LIRPF arts. 96-97; RIRPF art. 61; [O100]. [FICHA G229] | Según los límites del art. 96: 22.000 € de trabajo con un pagador, 15.876 € en los demás casos, 1.600 € de capital con retención, 1.000 € de imputaciones, etc. **Siempre** si se estuvo de alta en el RETA en el año [O100 art. 1.2]. También para pedir una devolución [O100 art. 1.5]. | Recoge 130/131 (casilla 0604), 111/190 (retenciones 0596-0599), 115/180 (0598), 303 (no directamente, pero los ingresos de la actividad deben cuadrar con los libros). | **Calcula** (parcial: trabajo, alquiler, ahorro agregado, mínimos, escalas, deducciones) |
| **101** | **NO CONFIRMADO.** No aparece entre las fichas de procedimiento activas de la AEAT revisadas (rangos G2xx-G7xx, GHxx, GIxx, GExx, GFxx, GZxx) ni en el calendario 2026. No hay que tratarlo como vigente sin una fuente oficial. | — | — | — | — | — | — |
| **102** | Documento de ingreso del **segundo plazo** de la Renta, cuando se fracciona el pago 60 % / 40 % sin intereses. | El 2.º plazo vence el **5-11-2026** [O100 art. 11.5; CAL «hasta-5-noviembre»]. | Importe del 40 %. | [O100] art. 3.b) 2.º y art. 11.5. | Solo si se fracciona y no se domicilia el 2.º plazo. | Deriva del resultado del 100 (casilla 0670). | — (no muestra el 60/40 ni la fecha) |
| **106** | **NO CONFIRMADO.** Igual que el 101. | — | — | — | — | — | — |
| **714** | Impuesto sobre el Patrimonio. | Anual. Del **8-4 al 30-6-2026**; con domiciliación, hasta el **25-6** [O100 art. 7.2; CAL]. | Bienes, derechos y deudas a 31-12. | Ley 19/1991, art. 37; [O100] art. 4. [FICHA G611] | Si la cuota sale a ingresar o los bienes superan 2.000.000 € [O100 art. 2]. | Comparte plazo con el 100. Existe además el modelo 718 (impuesto temporal de solidaridad de las grandes fortunas), con plazo «Año 2025: hasta 31-7-2026» [CAL]. | — |
| **151** | Renta del régimen especial de trabajadores desplazados (art. 93 LIRPF). | Hasta el 30-6-2026 [CAL «hasta-30-junio»]. | — | LIRPF art. 93. [FICHA G619] | Solo para quien opta por el régimen. | Sustituye al 100. Se comunica con el 149. | — (fuera de alcance) |

### Pagos fraccionados del IRPF (autónomos)

| Modelo | Qué es | Plazo 2026 | Datos | Norma | Obligatorio | Relación | App |
|---|---|---|---|---|---|---|---|
| **130** | Pago fraccionado en **estimación directa** (normal o simplificada). | Trimestral: **1-20 de abril, julio y octubre; 1-30 de enero** del año siguiente [I130; CAL]. | Ingresos y gastos acumulados desde el 1 de enero; 20 % del rendimiento neto (8 % en Ceuta y Melilla, y en La Palma en el 3T y 4T de 2026; según el BOE también el 4T de 2025, del 2T al 4T de 2024 y todo 2023: RIRPF art. 110.2 y DA 57.ª LIRPF, comprobado el 25-10-2026; la app lo pregunta: «¿Dónde realizas la actividad?»); pagos anteriores; retenciones soportadas; minoración por rentas bajas (casilla 13) según el rendimiento del año anterior (≤ 9.000 € → 100 €; ≤ 10.000 € → 75 €; ≤ 11.000 € → 50 €; ≤ 12.000 € → 25 €); deducción de vivienda anterior a 2013 (casilla 16: 2 %, hasta 660,14 €/año) [I130]. | RIRPF arts. 109-112; según la ficha, Orden EHA/672/2007 y Orden HAP/2194/2013. [FICHA G601] | Sí, salvo los **profesionales** con al menos el 70 % de sus ingresos del año anterior sometidos a retención [I130]. | **130 → 100**: lo ingresado va a la casilla 0604 del modelo 100. Las casillas 0224, 1479, 1553 y 1577 de la Renta del año anterior dan la casilla 13 [I130]. | **Calcula** (backend `autonomo.ts`: casillas 01-07, 12-15, 17 y 19) |
| **131** | Pago fraccionado en **estimación objetiva** (módulos). | Mismos plazos que el 130 [CAL]. | Rendimiento por módulos × porcentaje (4 %, 3 %, 2 % o 2 % agrícola según el número de empleados; NO CONFIRMADO en esta revisión). × 0,4 en Ceuta y Melilla y en La Palma en el 3T y 4T de 2026 (instrucciones del 131 y RIRPF art. 110.2, comprobado el 25-10-2026). | RIRPF arts. 110-111; según la ficha, Orden EHA/672/2007. [FICHA G602] | Sí, en módulos. | **131 → 100** (casilla 0604). | — |

### Retenciones e ingresos a cuenta (autónomo como pagador)

| Modelo | Qué es | Plazo 2026 | Datos | Norma | Obligatorio | Relación | App |
|---|---|---|---|---|---|---|---|
| **111** | Retenciones de **trabajo** (nóminas), **actividades económicas** (facturas de profesionales con retención del 15 % o del 7 %), premios e imputaciones. | Trimestral: **1-20 de abril, julio, octubre y enero**. Mensual para grandes empresas [CAL]. | Número de perceptores, bases y retenciones por tipo de renta. | LIRPF arts. 99-101; RIRPF art. 108; Orden EHA/586/2011 (según la ficha). [FICHA GH01] | Si en el periodo se pagaron rentas sujetas a retención. Tipos de los profesionales: 15 % general; 7 % en el año de inicio y los dos siguientes o con ingresos bajos (LIRPF art. 101.5 y 101.1-2). | **111 ↔ 190**: el 190 resume el año. **111 → 100 del perceptor** (casilla 0596 o 0599 de quien cobra). | **Calcula** (parcial: casillas 01-09 y 28-30 desde las facturas recibidas con retención, o importando el 111 presentado; `frontend/src/modules/finances/domain/withholdings.ts`) |
| **115** | Retenciones por **alquiler de inmuebles urbanos** (p. ej. el autónomo que alquila un local). | Trimestral, 1-20 de abril, julio, octubre y enero [CAL]. | Número de arrendadores, base y retención del **19 %** (LIRPF art. 101.8; reducido un 60 % en Ceuta y Melilla). | LIRPF art. 99; RIRPF arts. 100-101; la ficha solo cita la Orden HAP/2194/2013 (presentación). Orden de aprobación NO CONFIRMADA. [FICHA GH02] | Si el arrendatario es empresario o profesional y el arrendamiento no está exento de retención (certificado del arrendador [FICHA G325]; rentas de 900 € o menos al año a un mismo arrendador, según la app: RIRPF art. 75.3.g, no reverificado). | **115 ↔ 180** (resumen anual). **115 → 100 del arrendador** (casilla 0598). | **Calcula** (casillas 01-05; `withholdings.ts`) |
| **123** | Retenciones sobre determinado capital mobiliario (p. ej. dividendos pagados por una sociedad a sus socios). | Trimestral [CAL]. | — | Orden EHA/3435/2007 (según la ficha). [FICHA GH04] | Solo si se pagan esas rentas. | **123 ↔ 193**. | — |
| **180** | Resumen anual del 115. | **Hasta el 2-2-2026** (ejercicio 2025) [CAL «hasta-2-febrero»]. | Arrendadores, referencias catastrales y retenciones. | Varias órdenes según la ficha. Orden de aprobación NO CONFIRMADA. [FICHA GI00] | Si se presentó algún 115. | **115 ↔ 180**. | — (el aviso de fin de año no lo incluye) |
| **190** | Resumen anual del 111. | **Hasta el 2-2-2026** [CAL]. | Cada perceptor: NIF, clave, rentas y retenciones. | Orden EHA/3127/2009 (entre las de la ficha). [FICHA GI10] | Si se presentó algún 111. | **111 ↔ 190**. Alimenta los datos fiscales del borrador del perceptor. | **Plazo** |
| **193** | Resumen anual del 123. | Hasta el 2-2-2026 [CAL]. | — | [FICHA GI12] | — | **123 ↔ 193**. | — |
| **216** | Retenciones a **no residentes** sin establecimiento permanente. | Trimestral o mensual [CAL]. | — | TRLIRNR; [FICHA GF05] | Si se pagan rentas a no residentes. | **216 ↔ 296**. | — (fuera de alcance) |

### IVA

| Modelo | Qué es | Plazo 2026 | Datos | Norma | Obligatorio | Relación | App |
|---|---|---|---|---|---|---|---|
| **303** | Autoliquidación del IVA (régimen general y simplificado). | Trimestral: **1-20 de abril, julio y octubre; 1-30 de enero**. Mensual (REDEME, grandes empresas): hasta el día 30 del mes siguiente (el de enero, hasta el 2-3) [CAL]. | IVA devengado por tipos (0 %: casillas 150-152; 4 %: 01-03; 10 %: 04-06; 21 %: 07-09), recargo de equivalencia, adquisiciones intracomunitarias (10-11), inversión del sujeto pasivo (12-13), IVA deducible (28-45), régimen simplificado (página 2), información adicional (entregas intracomunitarias 59, exportaciones 60, no sujetas 120, inversión del sujeto pasivo 122, ventanilla única 123-124), criterio de caja (62-63, 74-75), compensaciones (110, 78, 87) y resultado (64, 66, 69, 71) [I303]. | Ley 37/1992 (LIVA) art. 164; RIVA (RD 1624/1992) art. 71; Orden EHA/3786/2008 (entre las de la ficha). [FICHA G414] | Sí para empresarios y profesionales, salvo actividades exentas (art. 20 LIVA) que no obligan a declarar. | **303 ↔ 390** (el 390 resume el año y debe cuadrar con la suma de los 303). **303 ↔ 349** (las bases de las casillas 10 y 59 deben coincidir con el 349 del periodo). **303 ↔ 347**. **303 ↔ 100** (los ingresos sin IVA son los de la actividad). | **Calcula** (parcial: operaciones interiores a 0/4/10/21 % y deducible corriente) |
| **390** | Resumen anual del IVA. | **1-30 de enero** de 2026 (año 2025) [CAL]. | Totales del año, prorrata, volumen de operaciones. | Orden EHA/3111/2009 (entre las de la ficha). [FICHA G412] | Sí, con exoneraciones (p. ej. quien solo tiene arrendamientos o está en módulos: NO CONFIRMADO el alcance exacto en esta revisión). | **303 ↔ 390**. | **Plazo** |
| **309** | Declaración no periódica (p. ej. quien no presenta el 303 pero hace adquisiciones intracomunitarias o recibe servicios con inversión del sujeto pasivo). | Trimestral, 1-20 [CAL]. | — | [FICHA G404] | En los casos tasados. | — | — |
| **322 / 353** | IVA de grupos de entidades (individual y agregado). | Mensual [CAL]. | — | [FICHA G407 / G408] | Solo grupos. | — | — (fuera de alcance) |
| **340** | **NO CONFIRMADO en esta revisión.** Según el conocimiento general, es la declaración informativa de los libros registro para quienes están en devolución mensual sin el SII. No se encontró su ficha en el barrido de códigos. | — | — | — | — | Relacionado con REDEME y SII [FICHA G417]. | — |
| **347** | Operaciones con terceros de más de **3.005,06 €** al año. | **Hasta el 2-3-2026** (año 2025) [CAL «hasta-2-marzo»]. | NIF y totales trimestrales por cliente o proveedor. | Orden EHA/3012/2008 (entre las de la ficha). [FICHA GI27] | Sí, si se superan los importes (salvo exclusiones, p. ej. quien lleva el SII o factura en módulos: NO CONFIRMADO el detalle). | **303 ↔ 347**. | **Plazo** (fecha calculada al 28-2 y trasladada al lunes) |
| **349** | Recapitulativa de **operaciones intracomunitarias** (entregas, adquisiciones y servicios intra-UE). | Mensual (1-20 del mes siguiente) o trimestral (1-20 de abril, julio y octubre; 1-30 de enero) [CAL]. | NIF-IVA de cada operador, clave e importe. | Orden EHA/769/2010 (entre las de la ficha). [FICHA GI28] | Si hay operaciones intracomunitarias (también servicios). Requiere el alta en el ROI con el 036. | **349 ↔ 303** (casillas 10, 36 y 59). | — |
| **360 / 361** | Devolución del IVA soportado en otros Estados de la UE o por no establecidos. | Hasta el **30-9-2026** (año 2025) [CAL «hasta-30-septiembre»]. | — | [FICHA GZ09] | Voluntario, para recuperar IVA extranjero. | — | — |
| **035 / 369** | Ventanilla única (OSS/IOSS): alta (035) y autoliquidación (369) de ventas a distancia y servicios a consumidores de la UE. | 369: trimestral (último día del mes siguiente) o mensual (importación) [CAL]. | — | Orden HAC/611/2021 (035). [FICHA G333] | Solo si se acoge. | Las operaciones van a la casilla 123/124 del 303 [I303]. | — |
| **034** | Antiguo alta en los regímenes especiales de servicios electrónicos (MOSS). **Sustituido por el formulario 035** (Orden HAC/611/2021). NO CONFIRMADA la fecha exacta de baja del 034. | — | — | — | — | — | — |

### Censos e IAE

| Modelo | Qué es | Plazo | Norma | Obligatorio | Relación | App |
|---|---|---|---|---|---|---|
| **036** | Alta, modificación y baja en el censo de empresarios, profesionales y retenedores: actividad, epígrafe IAE, régimen de IVA e IRPF, ROI (intracomunitarias), REDEME, local, criterio de caja, renuncia a módulos o al simplificado. | Antes de empezar la actividad. Renuncias o revocaciones de estimación directa simplificada o de módulos para 2026: **hasta el 16-2-2026**; para 2027, hasta el 31-12-2026 [CAL]. | Orden EHA/1274/2007, modificada por la Orden HAC/1526/2024 (BOE 9-1-2025). [FICHA G322] | Sí para cualquier autónomo. | Determina qué modelos tocan (303, 130/131, 111, 115, 349...). | — |
| **037** | Declaración censal simplificada. **Suprimida desde el 3-2-2025** por la Orden HAC/1526/2024: hoy todo se hace con el 036 ([nota AEAT del 9-1-2025](https://sede.agenciatributaria.gob.es/Sede/en_gb/todas-noticias/2025/enero/9/orden-ministerial-modificacion-declaraciones-censales.html); [FICHA G322]). | — | — | — | — | — |
| **030** | Censo de obligados tributarios (personas físicas que no son empresarios): domicilio, datos personales. | Cuando cambian los datos. | Orden EHA/3695/2007 (modificada por la Orden HAC/1526/2024). | — | — | — |
| **840** | Alta, variación o baja en el IAE. | Normalmente en el mes siguiente al inicio o a la variación (NO CONFIRMADO en esta revisión). | Orden HAC/2572/2003. [FICHA G323] | Las **personas físicas están exentas** del IAE (TRLRHL, RDLeg 2/2004, art. 82.1.c; no reverificado en esta revisión). En la práctica el autónomo persona física comunica la actividad con el 036 y no presenta el 840. | — | — |
| **848** | Comunicación del importe neto de la cifra de negocios a efectos del IAE. | NO CONFIRMADO (no figura en el calendario 2026 revisado). | Orden HAC/85/2003. [FICHA G323] | Solo en los supuestos de la orden (en general, no afecta a las personas físicas). | — | — |

### Informativas de patrimonio en el extranjero

| Modelo | Qué es | Plazo 2026 | Norma | Obligatorio | Relación | App |
|---|---|---|---|---|---|---|
| **720** | Bienes y derechos en el extranjero: cuentas, valores, seguros e inmuebles. | **1-1 al 31-3-2026** (año 2025) [CAL «hasta-31-marzo»]. | Ley 58/2003 (LGT) DA 18.ª; Orden HAP/72/2013. [FICHA GI34] | Si un bloque supera 50.000 € (o sube más de 20.000 € respecto a la última declaración; NO CONFIRMADO en esta revisión). | Los rendimientos y ganancias de esos bienes van al 100. | — |
| **721** | Monedas virtuales situadas en el extranjero (custodiadas por entidades no residentes). | **Hasta el 31-3-2026** [CAL]. | Orden HFP/887/2023 (NO CONFIRMADO el número en esta revisión). | Si el saldo a 31-12 supera 50.000 € (NO CONFIRMADO). | Las ganancias por permuta o venta de cripto van al 100 (casillas 1800 y siguientes del apartado F). | — |

### Abonos anticipados y comunicaciones del IRPF (particulares)

| Modelo | Qué es | Norma | Relación con el 100 | App |
|---|---|---|---|---|
| **140** | Abono anticipado de la deducción por maternidad. [FICHA GZ25] | LIRPF art. 81 | Lo cobrado se regulariza en el 100 (casilla 0612). | Se menciona (enlace) pero **no se resta** en el resultado (ver discrepancias) |
| **143** | Abono anticipado por familia numerosa, discapacidad a cargo o ascendiente con dos hijos. [FICHA G613] | LIRPF art. 81 bis | Casillas 0624, 0637, 0249, 0661 y 0663. | Igual que el 140 |
| **121** | Cesión de la deducción familiar por no obligados a declarar. [FICHA G616] | LIRPF art. 81 bis | Se presenta en el plazo de la Renta. | — |
| **145** | Datos personales al pagador para calcular la retención. [FICHA G603] | RIRPF art. 88 | Determina la retención del 111/190. | — |
| **146** | Pensionistas con dos o más pagadores. [FICHA G604] | RIRPF art. 89.A | Afecta a la obligación de declarar [O100 art. 1.2.a) 2.ª]. | — |

### Seguridad Social: RETA (autónomos)

| Concepto | 2026 | Fuente |
|---|---|---|
| Tipo total | **31,50 %** = contingencias comunes 28,30 + profesionales 1,30 + cese de actividad 0,90 + formación profesional 0,10 + MEI 0,90 | [PJC] art. 18.2 y art. 37.5-6 |
| Bases por tramos de rendimientos netos mensuales | Tabla reducida: T1 ≤ 670 € (653,59-718,94); T2 670-900 (718,95-900); T3 900-<1.166,70 (849,67-1.166,70). Tabla general: T1 1.166,70-1.300 (950,98-1.300) … T11 4.050-6.000 (1.732,03-5.101,20); T12 > 6.000 (1.928,10-5.101,20) | [PJC] art. 18.1 |
| Base máxima | 5.101,20 €/mes | [PJC] art. 18.1 |
| Rendimiento computable | Rendimientos netos más las cuotas pagadas, menos el 7 % de gastos genéricos (3 % para societarios y administradores) | LGSS art. 308.1.c (no reverificado en esta revisión; es el criterio que aplica la app) |
| Tarifa plana | Cuota reducida durante 12 meses; otros 12 meses si los rendimientos son inferiores al SMI. La **cuantía la fija la LPGE** [LETA art. 38 ter]. La app usa 80 €/mes: NO CONFIRMADO para 2026 (la [PJC] no la menciona y la LPGE está prorrogada) | [LETA] art. 38 ter |
| Regularización | La TGSS regulariza con los rendimientos que comunica la AEAT. En la Renta van las casillas 0196/0197 (regularización de cuotas del RETA) | Modelo 100, página 8 [O100] |
| Pluriactividad | Reintegro del 50 % del exceso de cotizaciones comunes sobre 17.323,68 € | [PJC] art. 18.8 |

**App:** calcula el tramo, la cuota mínima y máxima, la tarifa plana y su prórroga (`frontend/src/modules/tools/domain/retaCalc.ts`, `backend/src/domain/services/autonomo.ts`).

### Sociedades y no residentes (fuera de alcance; solo para orientar)

| Modelo | Qué es | Plazo 2026 | Ficha |
|---|---|---|---|
| **200** | Impuesto sobre Sociedades, declaración anual. | Hasta el 27-7-2026 (ejercicio igual al año natural) [CAL]. | [FICHA GE04] |
| **202** | Pagos fraccionados del IS. | 1-20 de abril, octubre y diciembre [CAL]. | [FICHA GE00] |
| **210** | IRNR sin establecimiento permanente (p. ej. un no residente con un piso en España: imputación o alquiler). | Según la renta: trimestral (1-20 de enero, abril, julio y octubre) o anual para imputaciones [CAL]. | [FICHA GF00] |
| **216** | Retenciones a no residentes. | Trimestral o mensual. | [FICHA GF05] |

## Relaciones clave entre modelos (resumen)

```
036 (alta) ──► decide: 303/390 · 130 o 131 · 111/190 · 115/180 · 349 · 369
303 (×4) ──Σ──► 390           303.c10/c36/c59 ◄──► 349
111 (×4) ──Σ──► 190 ──► datos fiscales del perceptor ──► 100 (0596/0599)
115 (×4) ──Σ──► 180 ──► 100 del arrendador (0598)
130/131 (×4) ─────────► 100 (0604 pagos fraccionados)
100 año N-1 (0224/1479/1553/1577) ──► 130 casilla 13 del año N
RETA (cuotas) ──► gasto deducible en 130 y en 100 (0186; regularización 0196/0197)
140/143 (abono anticipado) ──► 100 (0612, 0624, 0637, 0249, 0661, 0663)
100 resultado a ingresar fraccionado ──► 102 (40 %, 5-11)
```

## Qué es relevante para la app (priorizado)

1. **100** (núcleo). Ver [hoja-de-ruta.md](hoja-de-ruta.md).
2. **303 / 130 / RETA** (núcleo del autónomo; ya hay borradores).
3. **390 y 347** (resúmenes: la app ya tiene los datos trimestrales para precalcularlos).
4. **111/190 y 115/180** (autónomos con empleados, profesionales que les facturan o local alquilado). El 111 y el 115 ya se calculan; faltan el 190 y el 180 (resúmenes anuales, que salen de sumar los trimestres).
5. **349** (autónomos con clientes o proveedores en la UE: muy frecuente en profesionales digitales).
6. **102** (fecha del 2.º plazo y cálculo del 60/40: trivial y útil).
7. **720/721, 714** (avisos de obligación según umbrales; no calcular).
8. **131 / módulos** y **no residentes**: fuera de alcance salvo aviso.
