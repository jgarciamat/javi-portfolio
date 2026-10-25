# Diseño: «Revisión de la nómina y de la factura de la luz»

Estado: **solo diseño**, 25/10/2026. Nada de esto está implementado. Formato tomado de
[`dinero-perdido-y-fecha-meta.md`](./dinero-perdido-y-fecha-meta.md).

Todos los nombres, empresas, importes y fechas de ejemplo son **inventados**. Los tipos y tablas
oficiales no se repiten aquí: viven (y se fechan) en `frontend/src/modules/tools/data/payroll2026.ts`.

---

## A. Valor y resumen

**Qué es.** El usuario sube el PDF de su nómina o de su factura de la luz (o rellena unos pocos
campos a mano) y la app responde con tres posibles resultados por cada comprobación: **«Cuadra»**,
**«Hay una diferencia»** o **«No se puede comprobar»**. Nunca «te han estafado» ni «reclama».

**Por qué es un gancho.** Es útil el mismo día (todo el mundo tiene una nómina y una factura de
luz), genera confianza («la app lee lo mismo que yo») y abre la puerta a la Renta. Pero es el gancho
con **más riesgo técnico y legal** de la lista, así que el diseño es deliberadamente prudente.

**Conclusión honesta (recomendación en una frase):** hacer primero un **MVP reducido solo de
nómina, con campos manuales y el PDF solo como ayuda opcional para rellenarlos**, apoyado en
el calculador de sueldo neto que **ya existe**; dejar la **factura de la luz para 2027** y la
comparación de precios de mercado, para después (o nunca, derivándola al comparador oficial de la
CNMC).

**Hallazgo clave de la investigación.** La app ya tiene casi todo para comprobar una nómina:

- `frontend/src/modules/tools/domain/salaryCalc.ts` calcula el sueldo neto de **2026**:
  cotizaciones del trabajador y retención del IRPF **por el algoritmo oficial de la AEAT**, con
  sus fuentes y fecha (`data/payroll2026.ts`: Orden PJC/297/2026, algoritmo de retenciones 2026).
- `readPdf.ts` lee PDFs de texto en el navegador (el fichero no sale del dispositivo) y
  `ReceiptScanner.tsx` ya incluye **OCR local** (tesseract con datos en español servidos desde
  nuestro servidor).
- `bankPdf/` ya hace algo parecido: lee un PDF bancario por filas y **comprueba la cadena de
  saldos** (`balanceMismatches`). Es el mismo patrón de «lo extraído debe cuadrar».

**Limitaciones que condicionan todo:**

1. El calculador solo tiene datos de **2026**. No sirve para nóminas de años anteriores.
2. No hay formato estándar de nómina: cada programa de nóminas imprime distinto.
3. Una nómina lleva datos muy sensibles (DNI, número de afiliación, IBAN, empresa, cuotas
   sindicales, bajas). Un PDF de luz lleva dirección, CUPS y nombre.
4. Comparar el **precio** de la luz con el mercado exige datos de ofertas que no tenemos y puede
   chocar con la sección de ofertas con enlaces de afiliado (`OfferService.ts`).

**Dependencia de masa crítica de usuarios:** ninguna. Funciona con un solo usuario.

---

## B. Lo reutilizable del código (rutas reales)

| Pieza                                                 | Ruta                                                                                                                                                                                              | Qué aporta                                                                                                                                                                          | Cómo se usa                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Sueldo neto 2026                                      | `frontend/src/modules/tools/domain/salaryCalc.ts` (`netSalary`, `socialSecurity`, `withholding`, `familyMinimum`, `cleanSalaryInput`), tests en `frontend/src/__tests__/tools/salaryCalc.test.ts` | Cotizaciones del trabajador, base máxima, solidaridad y **retención IRPF por el algoritmo AEAT** a partir de bruto, pagas, edad, situación familiar, hijos, discapacidad y contrato | Motor de la comprobación: se calcula «lo esperado» y se compara con lo que dice la nómina |
| Datos oficiales de 2026 con fuente y fecha            | `frontend/src/modules/tools/data/payroll2026.ts` (`EMPLOYEE_RATES_2026`, `MAX_BASE_2026`, `PAYROLL_SOURCE_DATE`, URLs oficiales)                                                                  | Tipos y fecha de consulta                                                                                                                                                           | Se muestra «Datos oficiales de 2026, consultados el {fecha}»                              |
| Pantalla del calculador                               | `frontend/src/modules/tools/ui/SalaryCalculator.tsx`                                                                                                                                              | Formulario de situación familiar ya diseñado                                                                                                                                        | Se reutilizan los campos de situación                                                     |
| Lectura de PDF en el navegador                        | `frontend/src/modules/tools/application/readPdf.ts` (`readPdf`, `rowsOf`, `linesOf`, `Piece`)                                                                                                     | Texto del PDF por líneas, sin salir del dispositivo (pdfjs-dist)                                                                                                                    | Primer paso de la ayuda al rellenar                                                       |
| Cadena de cuadre en PDF                               | `frontend/src/modules/finances/application/bankPdf/` (`balance.ts`, `generic.ts`, `ibercaja.ts`, `index.ts`)                                                                                      | Patrón de extractor por entidad + verificación de que las cifras cuadran, con importes españoles (`1.234,56`)                                                                       | Extractores por «formato de nómina» con el mismo contrato (`result` + `mismatches`)       |
| Importes y fechas españolas                           | `parseAmount`, `parseDate` en `frontend/src/modules/finances/domain/importParsers.ts`                                                                                                             | Interpretar `1.234,56`, `4,00-`                                                                                                                                                     | Mismo analizador                                                                          |
| OCR local                                             | `frontend/src/modules/finances/ui/components/ReceiptScanner.tsx` (`readReceipt`), `frontend/scripts/copy-ocr.mjs`, `frontend/public/ocr/` (14 MB)                                                 | Tesseract con `spa.traineddata`, sin CDN; en Android se descarga de `finanverso.app/ocr/`                                                                                           | OCR de PDFs escaneados y fotos, siempre en el dispositivo                                 |
| Recibos por correo (patrón de extracción en servidor) | `backend/src/domain/services/receipt-email.ts`, `InboxService.ts`                                                                                                                                 | Extraer importes de texto                                                                                                                                                           | **No se usa**: la nómina no pasa por el servidor                                          |
| Generar PDFs de ejemplo para pruebas                  | `frontend/scripts/make-invoice-pdfs.ts`, `verify-invoice-pdfs.ts`, `invoicePdf.test.ts` (jspdf, pdf-lib)                                                                                          | Ya se generan PDFs sintéticos y se verifican leyéndolos con pdfjs                                                                                                                   | Banco de pruebas de **nóminas sintéticas** (J, plan de pruebas)                           |
| Escalas IRPF                                          | `frontend/src/modules/tools/domain/rentaCalc.ts` (`applyScale`), `rentaWork.ts` (`workReductionOf`)                                                                                               | Escalas y reducción por trabajo                                                                                                                                                     | Ya las usa el calculador                                                                  |
| Lectura de modelos oficiales                          | `frontend/src/modules/taxforms/application/formView.ts`, `frontend/src/__tests__/finances/taxModelReader.test.ts`                                                                                 | Leer PDFs de modelos de Hacienda en el navegador                                                                                                                                    | Ejemplo de lectura por etiquetas                                                          |
| Renta                                                 | `RentaView.tsx`, `rentaDraft*.ts`                                                                                                                                                                 | Si hay nómina revisada, los datos del empleo ya están                                                                                                                               | Enlace «Usar estos datos en tu Renta» (fase 3)                                            |
| Ofertas con afiliación                                | `backend/src/application/offers/OfferService.ts`, ajuste `showOffers` (`UserSettings.ts`)                                                                                                         | Sección de ofertas con enlaces de afiliado                                                                                                                                          | **Separar**: la revisión de la luz no recomienda empresas (H)                             |
| Plan Gratis/Premium                                   | `PLAN_LIMITS`, `LimitedResource` en `backend/src/domain/services/plans.ts`, `PremiumOnly.tsx`                                                                                                     | Límites por recurso (p. ej. `autonomoPdfs`, `imports`)                                                                                                                              | Ver E                                                                                     |
| Analítica                                             | `TRACK_EVENTS`, `CLIENT_FUNNEL_EVENTS`/`CLIENT_FUNNEL_DETAILS`, `funnel_daily`, `docs/analitica.md`                                                                                               | Contadores anónimos                                                                                                                                                                 | Eventos `pay_*` y `elec_*` (G)                                                            |
| Fiscalidad                                            | `docs/fiscalidad/`, agente `gestor-fiscal`                                                                                                                                                        | Revisión de reglas y casos prácticos                                                                                                                                                | Validación obligatoria de las reglas antes de publicar                                    |
| Exportación y borrado                                 | `ExportService`, `SqlitePersonalDataReader`                                                                                                                                                       | Art. 20 y supresión                                                                                                                                                                 | No aplica en el MVP (no se guarda nada)                                                   |

Lo que **no existe** y hay que crear: el extractor de campos de nómina (por etiquetas), el
verificador de «lo esperado frente a lo leído», la pantalla de revisión y los textos; y, para la
luz, el modelo de factura y su verificador.

---

## C. Diseño funcional

### C.1 Dónde se procesa (decisión de arquitectura)

**Todo en el dispositivo.** El PDF se abre con `pdfjs-dist` en el navegador o en la app de Android
(Capacitor), se extraen unos cuantos números y se comparan con el cálculo del mismo código del
frontend. **El servidor no recibe el PDF ni los campos**, ni lo guarda, ni se registra nada.

Razones:

- Una nómina contiene datos personales y, indirectamente, **datos de categoría especial** (cuota
  sindical, bajas por incapacidad temporal, embargos). Mandarla a un servidor propio o a un tercero
  complica la base legal y aumenta el riesgo.
- No hace falta: el cálculo ya vive en el frontend (`salaryCalc.ts`) y los tipos son públicos.
- Coste cero por documento.

**Si en el futuro se quisiera IA externa** (por ejemplo, para leer formatos raros), solo se haría
como **función opcional, con consentimiento explícito por documento**, tras una **vista previa de
exactamente lo que se enviaría** (solo las líneas con importes y sus etiquetas, con DNI, números
de afiliación, IBAN, nombres y direcciones ya eliminados en el dispositivo) y nunca el PDF ni la
imagen. El proveedor de IA ya está descrito en la política (`docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md`).
El coste de un texto de una nómina (unos pocos miles de tokens) sería de **céntimos por documento**
con un modelo pequeño; se mide antes de decidir. **No se recomienda en el MVP.**

### C.2 Viabilidad técnica: leer el PDF

| Tipo de PDF                                     | Cómo se lee                                                                                                                                                                                                                                     | Fiabilidad esperable (hipótesis a medir, no cifras ya medidas)                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| PDF generado por el programa de nóminas (texto) | `readPdf` + `rowsOf` agrupa por líneas y columnas; se buscan **etiquetas** («TOTAL DEVENGADO», «LÍQUIDO A PERCIBIR», «I.R.P.F.», «CONTINGENCIAS COMUNES», «DESEMPLEO», «FORMACIÓN PROFESIONAL», «M.E.I.») y el importe más cercano a la derecha | Buena en los formatos que se prueben. El problema no es el PDF sino la variedad de etiquetas y columnas |
| PDF con las tablas en imágenes                  | OCR local (tesseract)                                                                                                                                                                                                                           | Media. Los números son lo que mejor se reconoce; los separadores `,` y `.` y el `0`/`O` fallan a veces  |
| Foto de la nómina con el móvil                  | OCR local                                                                                                                                                                                                                                       | Baja. Se avisa y se pide revisar cada cifra                                                             |
| PDF protegido con contraseña                    | No se abre                                                                                                                                                                                                                                      | Mensaje «Este PDF tiene contraseña; quítala o escribe los datos a mano»                                 |
| Nóminas con varias páginas o varios conceptos   | Se leen todas; se usa la que tenga «DEVENGADO»                                                                                                                                                                                                  | Media                                                                                                   |

**No hay formato estándar.** Existe un modelo oficial de recibo individual de salarios (Orden de 27 de diciembre de 1994 y
sus modificaciones; confirmar la referencia exacta al implementar), pero muchos programas lo
imitan sin seguirlo al detalle. Por eso el diseño no promete
leer «cualquier nómina»: promete **leer lo que pueda y dejar que la persona corrija**.

**Contrato de extracción:** `extractPayslip(lines): { fields, confidence, unknown[] }`, donde cada
campo lleva `value`, `source` (`pdf`, `ocr`, `manual`) y `confidence` (`high` si el texto sigue
exactamente una etiqueta conocida y el importe es coherente). **Siempre** aparece la pantalla
«Revisa estos datos» antes de comprobar nada (D.2): el usuario ve cada número leído y lo corrige.

### C.3 Qué se comprueba de la nómina, y con qué fiabilidad

| #   | Comprobación                                          | Cómo                                                                                                                                                                                                                                    | Fiabilidad                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | **Aritmética**: devengos − deducciones = líquido      | Suma exacta, tolerancia 0,01 €                                                                                                                                                                                                          | Muy alta (no depende de ninguna regla)                                                                                                                                                                                                                                  |
| N2  | **IRPF retenido = tipo x base**                       | Tipo impreso en la nómina x total sujeto a retención, tolerancia 0,01 €                                                                                                                                                                 | Alta si la nómina muestra tipo y base                                                                                                                                                                                                                                   |
| N3  | **Cotizaciones a la Seguridad Social del trabajador** | Base de cotización x tipos del año (contingencias comunes 4,70 %, desempleo 1,55 % o 1,60 %, formación 0,10 %, MEI 0,15 %, más solidaridad si la base pasa del máximo) frente a lo descontado. Los tipos salen de `EMPLOYEE_RATES_2026` | Alta para 2026 en el régimen general. Tolerancia de 0,50 € por redondeos                                                                                                                                                                                                |
| N4  | **Base de cotización dentro de los topes**            | La base mensual no supera `MAX_BASE_2026` ni es inferior al mínimo de su grupo (tabla fechada, a validar con `gestor-fiscal`)                                                                                                           | Alta                                                                                                                                                                                                                                                                    |
| N5  | **Tipo de retención razonable**                       | Se estima el tipo con `withholding()` (algoritmo AEAT) a partir de la situación personal que la persona indica (situación familiar, hijos, discapacidad, contrato) y se compara con el impreso                                          | **Media-baja**: depende de datos que la nómina no trae (el modelo 145 que cada uno entregó a su empresa) y de regularizaciones durante el año. Se compara con una **holgura de 2 puntos** y se redacta como «Parece más alto/más bajo de lo habitual», nunca como error |
| N6  | **Coherencia con las pagas**                          | Con 14 pagas, las extras no llevan cotización prorrateada, y el cálculo cambia (`extraPayment` en `netSalary`)                                                                                                                          | Media                                                                                                                                                                                                                                                                   |
| N7  | **Evolución entre meses**                             | Si el neto o el tipo cambian respecto de la nómina anterior sin explicación                                                                                                                                                             | Fase 2, informativa                                                                                                                                                                                                                                                     |

Tres resultados posibles por comprobación: `ok`, `diff` (con importe y explicación), `unknown`
(faltan datos o la fila no existe). **Nunca se afirma que algo esté «mal»**: «Hay una diferencia
de 12,40 € que no sabemos explicar. Puede deberse a un concepto que la app no conoce.»

### C.4 Lo que NO se debe afirmar

- Que la empresa se haya equivocado, ni que haya que reclamar. La app **no conoce el convenio**
  ni los complementos pactados ni la situación personal real.
- Que la retención de IRPF sea «incorrecta»: la retención es un **pago a cuenta**; la diferencia con el IRPF
  real se regulariza en la Renta. Un tipo alto solo significa que se adelanta más; no se pierde.
  Frase propuesta: «Una retención mayor o menor no es dinero perdido: se ajusta cuando haces la
  Renta.»
- Nada de asesoramiento laboral, jurídico ni fiscal individualizado. Siempre «Orientativo».
- Que la nómina esté «bien»: solo que las cuentas **que hemos podido comprobar** cuadran.
- Nóminas de años en los que no hay datos (todo lo que no sea 2026 hoy): «Solo sabemos revisar
  nóminas de 2026».

### C.5 Factura de la luz: qué se puede comprobar (y qué no)

La estructura de una factura de electricidad es mucho más fija que la de una nómina (viene
regulada en lo esencial): **potencia contratada**, **término de potencia**, **término de energía**
por periodos, **impuesto sobre la electricidad**, **alquiler del contador** y **IVA**.

| #   | Comprobación                                                            | Cómo                                                                                                                           | Fiabilidad                                                                                             |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| L1  | **Aritmética**: componentes + impuestos = total                         | Suma                                                                                                                           | Muy alta                                                                                               |
| L2  | **Término de potencia** = kW x €/kW·día x días facturados (por periodo) | Producto con los datos de la factura                                                                                           | Alta                                                                                                   |
| L3  | **Término de energía** = kWh x €/kWh por periodo                        | Producto                                                                                                                       | Alta                                                                                                   |
| L4  | **Impuesto sobre la electricidad**                                      | Tipo legal sobre la base (potencia + energía), con el mínimo legal                                                             | Alta, pero el tipo y los mínimos están en la ley y deben guardarse fechados                            |
| L5  | **IVA**                                                                 | Tipo vigente en la fecha de la factura sobre la base. Los tipos reducidos temporales de otros años exigen una tabla por fechas | Media-alta, con tabla fechada                                                                          |
| L6  | **Días del periodo**                                                    | Fechas de inicio y fin frente a los días usados en el término de potencia                                                      | Alta                                                                                                   |
| L7  | **Precio medio efectivo** (€/kWh)                                       | (total − impuestos − alquiler) / kWh                                                                                           | Informativo                                                                                            |
| L8  | **Potencia contratada «de más»**                                        | **No se puede saber con la factura** (haría falta la potencia máxima demandada, que da la distribuidora)                       | No verificable. Solo se enseña la potencia y se remite a la web de la distribuidora                    |
| L9  | **Comparación con el mercado**                                          | Requiere ofertas actuales y tu consumo por horas                                                                               | No fiable aquí. Se deriva al **comparador oficial de la CNMC**; la app no recomienda comercializadoras |

La parte barata y fiable (L1-L6) es una **auditoría aritmética de la factura**. La parte que más
interesa al usuario («¿pago de más?») es L8-L9, y es justo la que no se puede hacer bien.

---

## D. Pantallas, textos y accesibilidad

### D.1 Entrada

```
+--------------------------------------+
| Revisa tu nómina                     |
| Comprobamos que las cuentas cuadran. |
| Todo se hace en tu móvil: el PDF     |
| no se envía a ningún sitio.          |
|                                      |
| [ Elegir el PDF de mi nómina ]       |
| [ Escribir los datos a mano ]        |
|                                      |
| Solo sabemos revisar nóminas de 2026.|
+--------------------------------------+
```

### D.2 «Revisa estos datos» (siempre)

```
+--------------------------------------+
| Esto es lo que hemos leído           |
| Mes de la nómina   [ octubre 2026 ]  |
| Total devengado    [ 2.150,00 ] EUR  |   leído del PDF
| Seguridad Social   [   139,50 ] EUR  |   leído del PDF
| IRPF (tipo)        [ 12,4 ] %        |   no encontrado: escríbelo
| IRPF (importe)     [   266,60 ] EUR  |
| Líquido a percibir [ 1.743,90 ] EUR  |
| Tu situación: [ Soltero/a ] [ Sin hijos ] [ Indefinido ]
| Pagas al año: ( ) 12  (o) 14         |
| [ Comprobar ]                        |
+--------------------------------------+
```

- Cada campo muestra de dónde viene («leído del PDF», «lo has escrito tú», «no encontrado»).
- Los campos dudosos (confianza baja) van marcados con texto y borde, no solo con color.

### D.3 Resultado

```
+--------------------------------------+
| Resultado de tu nómina de octubre    |
| Cuadra          Las cuentas suman bien|
| Cuadra          Seguridad Social: 6,48 %|
| Hay una diferencia  Retención IRPF   |
|    Tu tipo (12,4 %) es 2,9 puntos más|
|    alto de lo habitual para tu caso. |
|    Se ajusta cuando haces la Renta.  |
| No se puede comprobar   Complementos |
|                                      |
| Esto es orientativo. No es           |
| asesoramiento laboral ni fiscal.     |
| [ Cómo lo hemos calculado ]          |
+--------------------------------------+
```

### D.4 Textos exactos (es / en)

Claves bajo `app.payroll.*` (nómina) y `app.electric.*` (luz). Se limpian con `finanverso-ig-human`.

| Clave                      | es                                                                                                                    | en                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `payroll.title`            | Revisa tu nómina                                                                                                      | Check your payslip                                                                                                 |
| `payroll.intro`            | Comprobamos que las cuentas cuadran. Todo se hace en tu móvil: el PDF no se envía a ningún sitio.                     | We check that the figures add up. Everything happens on your phone: the PDF is not sent anywhere.                  |
| `payroll.pick`             | Elegir el PDF de mi nómina                                                                                            | Choose my payslip PDF                                                                                              |
| `payroll.manual`           | Escribir los datos a mano                                                                                             | Enter the data by hand                                                                                             |
| `payroll.only2026`         | Solo sabemos revisar nóminas de 2026.                                                                                 | We can only check payslips from 2026.                                                                              |
| `payroll.review`           | Esto es lo que hemos leído                                                                                            | This is what we read                                                                                               |
| `payroll.reviewHint`       | Revisa cada número. Si algo no es así, corrígelo.                                                                     | Check each number. If something is wrong, fix it.                                                                  |
| `payroll.fromPdf`          | Leído del PDF                                                                                                         | Read from the PDF                                                                                                  |
| `payroll.fromOcr`          | Leído de la imagen: confírmalo                                                                                        | Read from the image: please confirm it                                                                             |
| `payroll.manualField`      | Lo has escrito tú                                                                                                     | You typed this                                                                                                     |
| `payroll.notFound`         | No encontrado: escríbelo                                                                                              | Not found: please type it                                                                                          |
| `payroll.check`            | Comprobar                                                                                                             | Check                                                                                                              |
| `payroll.ok`               | Cuadra                                                                                                                | Adds up                                                                                                            |
| `payroll.diff`             | Hay una diferencia                                                                                                    | There is a difference                                                                                              |
| `payroll.unknown`          | No se puede comprobar                                                                                                 | Cannot be checked                                                                                                  |
| `payroll.sum.ok`           | Las cuentas suman bien.                                                                                               | The figures add up.                                                                                                |
| `payroll.sum.diff`         | Los devengos menos las deducciones no dan el líquido: hay {amount} de diferencia.                                     | Earnings minus deductions do not give the net pay: there is a {amount} difference.                                 |
| `payroll.ss.ok`            | Seguridad Social: el descuento coincide con los tipos de 2026.                                                        | Social Security: the deduction matches the 2026 rates.                                                             |
| `payroll.ss.diff`          | Seguridad Social: esperábamos {expected} y la nómina descuenta {found}. Puede deberse a un concepto que no conocemos. | Social Security: we expected {expected} and the payslip deducts {found}. It may be due to an item we do not know.  |
| `payroll.irpf.high`        | Tu retención ({found} %) es {diff} puntos más alta de lo habitual para tu caso.                                       | Your withholding ({found}%) is {diff} points higher than usual for your case.                                      |
| `payroll.irpf.low`         | Tu retención ({found} %) es {diff} puntos más baja de lo habitual para tu caso.                                       | Your withholding ({found}%) is {diff} points lower than usual for your case.                                       |
| `payroll.irpf.note`        | Una retención mayor o menor no es dinero perdido: se ajusta cuando haces la Renta.                                    | A higher or lower withholding is not lost money: it is adjusted when you file your tax return.                     |
| `payroll.irpf.unknownData` | Para estimar tu retención necesitamos tu situación personal.                                                          | To estimate your withholding we need your personal situation.                                                      |
| `payroll.base.over`        | La base de cotización supera el máximo de 2026 ({max}).                                                               | The contribution base is above the 2026 maximum ({max}).                                                           |
| `payroll.source`           | Datos oficiales de 2026, consultados el {date}.                                                                       | Official 2026 data, checked on {date}.                                                                             |
| `payroll.how`              | Cómo lo hemos calculado                                                                                               | How we calculated it                                                                                               |
| `payroll.disclaimer`       | Esto es orientativo. No es asesoramiento laboral ni fiscal. Tu empresa puede aplicar conceptos que no conocemos.      | This is for guidance only. It is not employment or tax advice. Your employer may apply items we do not know about. |
| `payroll.scanned`          | Este PDF parece una imagen. Lo leeremos en tu móvil; puede fallar algún número.                                       | This PDF looks like an image. We will read it on your phone; some number may be wrong.                             |
| `payroll.password`         | Este PDF tiene contraseña. Quítala o escribe los datos a mano.                                                        | This PDF is password protected. Remove it or enter the data by hand.                                               |
| `payroll.error`            | No hemos podido leer el PDF. Puedes escribir los datos a mano.                                                        | We could not read the PDF. You can enter the data by hand.                                                         |
| `electric.title`           | Revisa tu factura de la luz                                                                                           | Check your electricity bill                                                                                        |
| `electric.sum.ok`          | Las cuentas de la factura suman bien.                                                                                 | The bill figures add up.                                                                                           |
| `electric.sum.diff`        | La suma de los conceptos no da el total: hay {amount} de diferencia.                                                  | The items do not add up to the total: there is a {amount} difference.                                              |
| `electric.power`           | Tu potencia contratada es {kw} kW. Para saber si te sobra, consulta tu consumo máximo en la web de tu distribuidora.  | Your contracted power is {kw} kW. To see if it is too much, check your peak demand on your distributor's website.  |
| `electric.avg`             | Precio medio de esta factura: {price} por kWh (sin impuestos).                                                        | Average price on this bill: {price} per kWh (before taxes).                                                        |
| `electric.compare`         | Para comparar ofertas, usa el comparador oficial de la CNMC.                                                          | To compare offers, use the CNMC official comparator.                                                               |
| `electric.noRecommend`     | No recomendamos empresas ni ofertas.                                                                                  | We do not recommend companies or offers.                                                                           |

### D.5 Estados

| Estado               | Qué ve                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Carga del PDF        | Barra con texto «Leyendo el PDF…», `aria-busy`, botón «Cancelar»                              |
| OCR en curso         | Aviso de que puede tardar y de que el motor se descarga la primera vez (en Android son 14 MB) |
| Leído con dudas      | «Revisa estos datos» con los campos dudosos marcados                                          |
| Resultado            | D.3                                                                                           |
| No se puede leer     | `payroll.error` y entrada manual                                                              |
| Año distinto de 2026 | `payroll.only2026`                                                                            |
| Sin conexión         | Funciona (todo es local), salvo la primera descarga del OCR en Android                        |

### D.6 Accesibilidad para mayores

- Botones de **48 x 48 px** con texto; texto base 16 px; todo en `rem`; sin cortes al 200 %.
- Cada resultado es palabra más icono más texto; **nunca solo color**. Las palabras son «Cuadra»,
  «Hay una diferencia», «No se puede comprobar».
- Los campos tienen etiqueta visible y `inputmode="decimal"`, y aceptan `1.234,56` y `1234.56`.
- El lector de pantalla recibe cada resultado como frase completa; el orden de foco es campos ->
  Comprobar -> resultados -> «Cómo lo hemos calculado».
- Subida del PDF con `FileDropZone` (ya existente) y alternativa por teclado; también la cámara
  para fotografiar la nómina (ya existe `CameraCapture`).
- Sin jerga: «lo que te descuentan para la Seguridad Social», no «cotización a cargo del
  trabajador»; la primera vez «IRPF (lo que Hacienda te retiene)».

---

## E. Gratis frente a Premium

El cálculo es local y no cuesta nada por documento, así que **no hay un límite por coste**; la
distinción es de comodidad.

|                                           | Gratis                                                                                                                     | Premium                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Revisar una nómina (entrada manual o PDF) | 3 al mes (recurso nuevo `payslipChecks` en `PLAN_LIMITS`, cuenta en el dispositivo y en el servidor sin guardar contenido) | Ilimitadas                             |
| Resultado completo (las 6 comprobaciones) | Sí                                                                                                                         | Sí                                     |
| Historial de nóminas y evolución del neto | No                                                                                                                         | Sí (fase 2, en el dispositivo)         |
| Usar los datos revisados en la Renta      | No                                                                                                                         | Sí (fase 3)                            |
| Factura de la luz (cuando exista)         | 1 al mes                                                                                                                   | Ilimitadas e historial de precio medio |

Nota técnica: como todo es local, el límite «3 al mes» es **honesto pero no es seguridad**; no se
protege como un límite de servidor. Se podría pasar por alto con malas artes. Recomendación:
**no limitar en el MVP** (todo gratis) y poner el valor de Premium en el historial y la evolución.

---

## F. Datos y API mínimos

- **MVP: ninguna API ni tabla nuevas.** Cálculo 100 % en el frontend con `salaryCalc.ts`.
- Datos de apoyo ya existentes: `payroll2026.ts`. Para 2027, un archivo `payroll2027.ts` con sus
  fuentes y fecha. Un test falla si el año actual no tiene datos (para no revisar una nómina de
  2027 con tipos de 2026).
- Nuevo (frontend): `frontend/src/modules/tools/domain/payslipCheck.ts` (comparación pura:
  `checkPayslip(fields, situation)` -> lista de `{ id, status, expected, found, message }`),
  `payslipExtract.ts` (etiquetas -> campos), `PayslipCheck.tsx` (pantalla).
- Luz (fase 3): `billCheck.ts` con una tabla fechada de impuestos (`electricity-tax.json` con
  `rate`, `from`, `to`, `source`).
- **Recurso opcional para el contador** de revisiones gratis (si se decide limitar): contador
  local en `localStorage` (`mm_payslip_checks`, por mes), con el envoltorio `storage`.
- **Qué NO se guarda**: ni el PDF, ni los campos, ni el resultado, ni en el servidor ni en el
  dispositivo (salvo el historial opcional de Premium, solo local, cifrado con el almacenamiento
  del navegador y borrable).

---

## G. Medición, sin datos personales

Analítica propia y anónima ([`docs/analitica.md`](../analitica.md)); **nunca** importes ni
campos de la nómina.

| Evento            | Quién     | Cuándo                               | Detalle (lista cerrada)             |
| ----------------- | --------- | ------------------------------------ | ----------------------------------- |
| `pay_view`        | navegador | se abre la pantalla                  | —                                   |
| `pay_start`       | navegador | se elige PDF o entrada manual        | `pdf` o `manual`                    |
| `pay_read`        | navegador | resultado de la lectura              | `text`, `ocr`, `failed`, `password` |
| `pay_review_edit` | navegador | la persona corrige algún campo leído | `0`, `1-2`, `3+` (nº de campos)     |
| `pay_result`      | navegador | se llega a un resultado              | `all_ok`, `has_diff`, `has_unknown` |
| `pay_how`         | navegador | «Cómo lo hemos calculado»            | —                                   |
| `elec_*`          | igual     | fase 3                               | —                                   |

Qué se aprende: **tasa de lectura correcta** (`pay_read:text` frente a `failed`), cuántos corrigen
(`pay_review_edit`), y cuánta gente llega a un resultado (`pay_result / pay_start`). La métrica de
calidad más importante es el **porcentaje de resultados `has_diff` que después son falsos
positivos**, y eso no se puede medir con contadores anónimos: se mide con el **banco de pruebas**
(J) y con un botón de «Esto no es una diferencia real» (`pay_feedback:false_positive`), que solo
cuenta.

---

## H. Privacidad y legal

- **Procesamiento local**: el PDF no sale del dispositivo. Eso evita transferencias, evita que
  Finanverso se convierta en responsable de una nómina (con DNI, cuenta, empresa, datos de salud
  o sindicales) y evita la complejidad de categorías especiales (art. 9 RGPD).
- **Política**: añadir una línea en `app.privacy.*`: «Si revisas una nómina o una factura, se lee en
  tu dispositivo y no se envía a nuestros servidores.» Y asegurarse de que **es verdad** (test que
  verifica que no hay ninguna petición de red durante la revisión).
- **OCR**: el motor se sirve desde `finanverso.app/ocr/` y no envía imágenes. Ya es así con los
  tickets (`ReceiptScanner`).
- **IA externa**: no en el MVP. Si se añadiera, sería opt-in por documento, con vista previa del
  texto enviado y eliminación previa de identificadores, y con el proveedor de IA ya listado en la
  política.
- **Riesgo legal por «afirmar»**: la principal fuente de problemas sería que una persona reclame a su
  empresa con base en un falso positivo de la app. Mitigaciones: tres resultados (`ok` /
  `diff` / `unknown`), lenguaje de «diferencia que no sabemos explicar», aviso de «orientativo»,
  explicación de lo que **no** sabemos (convenio, complementos), y **ningún botón de «reclamar»**.
- **Asesoramiento**: la revisión es informativa. No se recomienda cambiar de retención ni de
  empresa. Frase obligatoria: «No es asesoramiento laboral ni fiscal.»
- **Reglas fiscales**: los tipos y el algoritmo deben ser los oficiales y estar **validados por el
  agente `gestor-fiscal`** antes de publicar, con casos prácticos oficiales. Cada año, una
  revisión antes de enero (cambian los tipos y las bases).
- **Factura de la luz y ofertas con afiliación**: la sección «Ofertas» (`OfferService`) usa
  enlaces de afiliado. Si la revisión de la luz recomendara empresas, habría **conflicto de
  interés** y la función perdería credibilidad. Por eso solo se deriva al **comparador oficial de
  la CNMC** y se dice «No recomendamos empresas».
- **Menores**: nada específico (un menor de 14 a 17 años puede trabajar; la nómina es suya).
- **Consumidores**: si algún día se enseñan precios de mercado, se citan con fecha y fuente.

---

## I. Riesgos

| Riesgo                                                                                 | Prob. | Impacto | Mitigación                                                                                                    |
| -------------------------------------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------- |
| Falso positivo («hay una diferencia») que lleva a una reclamación indebida             | Media | Alto    | Tres estados, lenguaje prudente, sin botón de reclamar, banco de pruebas con tope de falsos positivos (< 1 %) |
| Formatos de nómina no soportados (la mayoría, al principio)                            | Alta  | Medio   | Pantalla «Revisa estos datos» siempre; entrada manual como camino principal; contador de formatos fallidos    |
| OCR con números mal leídos                                                             | Media | Medio   | Se marcan los campos de OCR como «confirma» y se exige revisión                                               |
| Reglas de 2026 aplicadas a otro año                                                    | Media | Alto    | Selector de año con aviso; test que obliga a tener datos del año                                              |
| Regularización del IRPF y datos personales que no conocemos hacen que N5 no sea fiable | Alta  | Medio   | Holgura de 2 puntos, mensaje de que se ajusta en la Renta, N5 como «orientativo»                              |
| El usuario cree que «Cuadra» garantiza que la nómina es correcta                       | Media | Medio   | Texto «solo hemos comprobado lo que aparece arriba»                                                           |
| Datos personales en el dispositivo (memoria, caché)                                    | Baja  | Medio   | No guardar nada; liberar los `ArrayBuffer`; no hacer miniaturas                                               |
| Peso del OCR en Android (14 MB)                                                        | Media | Bajo    | Descarga bajo demanda, como ya hace el escáner de tickets                                                     |
| Factura de la luz: comparar precios sin datos fiables                                  | Alta  | Alto    | No comparar; derivar a la CNMC                                                                                |
| Conflicto de interés con ofertas de afiliados                                          | Media | Alto    | Separación explícita, sin recomendaciones                                                                     |
| Que se interprete como asesoramiento regulado                                          | Baja  | Alto    | `disclaimer`, revisión por abogado                                                                            |
| Coste de mantenimiento anual (tablas, formatos)                                        | Alta  | Medio   | Datos con fecha y test que falla; una revisión cada enero con `gestor-fiscal`                                 |

---

## J. Fases, esfuerzo y plan de pruebas

| Fase                                                    | Contenido                                                                                                                                                                                                                    | Días       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **MVP reducido (recomendado): nómina, campos manuales** | `payslipCheck.ts` puro (N1-N4, N5 con holgura, N6) con tests; pantalla «Escribe tus datos» y resultado D.3; textos es/en; accesibilidad; eventos; validación de reglas con `gestor-fiscal` (casos prácticos); tests al 100 % | **5**      |
| Fase 2                                                  | Ayuda con el PDF de texto: `payslipExtract.ts` y 3 extractores por etiquetas de formatos típicos; pantalla «Revisa estos datos»; banco de pruebas de nóminas sintéticas y su script de verificación                          | 5          |
| Fase 3                                                  | OCR para PDF escaneados y fotos (reutiliza el escáner) con revisión obligatoria                                                                                                                                              | 3          |
| Fase 4                                                  | Historial y evolución del neto (Premium, local); uso de los datos en la Renta                                                                                                                                                | 3          |
| Fase 5 (2027)                                           | Factura de la luz: modelo, L1-L6, tabla fechada de impuestos, extractor y pantalla                                                                                                                                           | 8-10       |
| Fase 6 (a decidir)                                      | IA externa opt-in por documento para formatos raros                                                                                                                                                                          | 4 más EIPD |

### Plan de pruebas (calidad de la extracción y de la comprobación)

1. **Banco de nóminas sintéticas.** Reutilizando el patrón de `frontend/scripts/make-invoice-pdfs.ts`,
   generar PDFs de nóminas ficticias en **al menos 8 diseños** distintos (etiquetas y columnas
   distintas), con casos: 12 y 14 pagas, indefinido y temporal, solidaridad (base alta), hijos,
   discapacidad, contrato corto, horas extra, retribución en especie, embargo. Nunca nóminas
   reales de usuarios ni de nadie sin su permiso por escrito.
2. **Nóminas reales cedidas** por el dueño y por voluntarios, **anonimizadas** a mano antes de
   guardarlas, solo como ayuda para ajustar etiquetas; no se versionan en el repositorio.
3. **Métricas objetivo (hipótesis, a confirmar):**
   - exactitud por campo >= 95 % en PDFs de texto de los diseños soportados;
   - **falsos positivos de `diff` < 1 %** sobre nóminas correctas generadas con el propio motor
     (prueba circular, pero necesaria) y sobre las cedidas;
   - OCR: exactitud numérica >= 90 % en escaneos nítidos (se avisa del resto).
4. **Casos prácticos oficiales:** `gestor-fiscal` valida N3-N5 contra los ejemplos de la AEAT y
   `docs/casos-practicos/`.
5. **Pruebas de red:** durante una revisión no se realiza ninguna petición de red (test E2E).
6. **Accesibilidad:** `axe` en las pantallas; prueba con lector de pantalla del flujo manual.
7. **Regresión anual:** el test de «hay datos del año» y un recordatorio de revisión en enero.

**Si hay que elegir un solo trozo:** el MVP reducido (5 días). Es verdaderamente útil, tiene bajo
riesgo y no depende de extraer nada de un PDF.

---

## K. Preguntas abiertas (máx. 5)

1. **¿Se hace el MVP reducido de nómina con entrada manual?** Recomendación: **sí**, y el PDF como
   mejora posterior (fase 2). Primero que el cálculo sea fiable, después que sea cómodo.
2. **¿Se admite IA externa para leer PDFs?** Recomendación: **no** por ahora. Local y sin envío de
   datos es una promesa de marca valiosa; si se cambia, opt-in por documento con vista previa.
3. **¿Se revisa la factura de la luz?** Recomendación: **sí, pero en 2027**, solo la parte
   aritmética (L1-L6) y derivando la comparación de precios a la CNMC. No comparar precios por
   nuestra cuenta ni recomendar empresas.
4. **¿Nóminas de años anteriores?** Recomendación: **no**. Solo el año con datos oficiales cargados;
   cada enero se añade el nuevo con validación de `gestor-fiscal`.
5. **¿Hay límite gratis?** Recomendación: **no en el MVP**. Premium se justifica con el historial y
   la evolución del neto, no con un tope que no se puede hacer cumplir en un cálculo local.
