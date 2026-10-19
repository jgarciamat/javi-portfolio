# Cómo se declaran en Renta WEB las ganancias y pérdidas de cripto, fondos, ETF, acciones y derivados, y qué archivo debe preparar Finanverso

> **Aviso:** información orientativa, **no asesoramiento fiscal**. Fecha de comprobación: **19-10-2026**. Ejercicio de referencia: IRPF 2025 (modelo 100 de la Orden HAC/277/2026, [BOE-A-2026-7041](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf)). Documento interno para el dueño y para quien construya los entregables; el seguimiento de lo que falta por probar queda en el §9.

## 0. Resumen ejecutivo

1. **Hacienda no ofrece ninguna forma de cargar un fichero solo con las ganancias y pérdidas.** Renta WEB pide los datos en ventanas de captura, una «alta» cada vez. La única carga de fichero que existe para el modelo 100 es la **«Presentación mediante fichero»** con el XML completo de la declaración. Esa ruta está **descartada** por decisión del dueño, porque sustituye la declaración entera (§3).
2. **Respuesta corta a «¿se puede importar?»: NO.** Ni Renta WEB ni Renta WEB Open tienen un botón para importar apartados sueltos, ni Excel, CSV o texto plano. El programa PADRE ya no existe (desde la campaña de 2016). Las dos únicas cargas automáticas son de la propia Agencia: los **datos fiscales** (fondos españoles del modelo 187, avisos de cripto del 172/173) y el servicio **Cartera de Valores** (acciones cotizadas de depositarios españoles, modelos 189 y 198). En ninguno de los dos puede el usuario subir sus operaciones desde un fichero (§2 y §3).
3. **Los campos exactos de cada ventana** están en el diccionario oficial «toma de datos» (`diccionarioDlgXSD_2025.properties`). El §1 copia sus etiquetas literales. En cripto la ventana **no pide fechas ni unidades**, solo cinco datos: denominación, tipo de contraprestación, importe y gastos de la transmisión, e importe y gastos de la adquisición.
4. **Límites de filas por declarante**, según el esquema oficial `Renta2025.xsd`:

   | Apartado | Altas como máximo |
   |---|---|
   | Monedas virtuales | 300 |
   | Fondos con retención | 60 |
   | ETF y SICAV índice | 200 |
   | Acciones | 200 emisores, con 500 transacciones cada uno |
   | Derechos de suscripción | 60 |
   | Otros elementos patrimoniales | 80 |

   Quien tenga miles de operaciones **tiene que agrupar**.
5. **Agrupar está previsto por Hacienda en fondos y acciones.** La ayuda de Renta WEB pide «el importe global de las transmisiones y adquisiciones» por fondo o por entidad emisora, con altas aparte solo en casos especiales: DT 9.ª, rentas vitalicias y pérdidas por recompra.
6. **En cripto, Hacienda calcula operación a operación, pero la ventana no pide el detalle.** Agrupar por moneda y por tipo de contraprestación es lo que hacen las herramientas y gestorías, conservando el detalle. Una ganancia y una pérdida juntas dan el mismo impuesto que separadas: el art. 49.1.b LIRPF las integra y compensa entre sí.
7. **La agrupación que proponemos** es una alta por *activo × clave × signo*: una fila con las ventas que dieron ganancia y otra con las que dieron pérdida. Con ella las casillas 1807/1809 y los totales 1813/1814 son **idénticos** a los de declarar operación a operación. La tabla actual de la app suma ganancias y pérdidas en la misma fila, y Renta WEB calcularía otra cosa (§7, error E1).
8. **Novedad de 2025 que la app aún no separa:** los **ETF y SICAV índice cotizadas** tienen su propio subapartado (casillas **2225-2236**), distinto del de fondos con retención (0310-0325). La app manda hoy los ETF a 0310-0325 (§7, error E2).
9. **Cómo lo hacen terceros** (Taxdown, Declarando, Summ, Koinly, CoinTracking, DeclaRenta, Bit2Me): todos entregan un **informe en PDF o Excel para copiar a mano** en Renta WEB, a veces con instrucciones de casilla. Ninguno importa en Renta WEB. Solo hay una extensión de Chrome muy minoritaria que teclea por el usuario dentro de Renta WEB (§4).
10. **Recomendación de producto (§6):**
    - Un **Excel «listo para copiar»** con una pestaña por ventana de Renta WEB, las columnas con **los mismos nombres y en el mismo orden** que la ventana, una fila por alta, y lo que Renta WEB calculará para comprobarlo.
    - Una pestaña de **totales por casilla**.
    - La misma información en **PDF** como lista de comprobación.
    - Dentro de la app, un **modo «Copiar a Renta WEB»** paso a paso con botón de copiar en cada campo.

## 1. Cómo te dice Hacienda que lo metas: pantallas y campos exactos de Renta WEB 2025

Todas las ventanas están en el **apartado F2** («Ganancias y pérdidas patrimoniales derivadas de la transmisión de elementos patrimoniales»).

Fuentes de los campos:
- Las **etiquetas literales** de cada ventana salen del diccionario oficial «Diccionario declaración individual (toma de datos) (Ejercicio 2025)». Es el fichero `diccionarioDlgXSD_2025.properties`, actualizado el 13-05-2026, de la página [Diseños de registro, modelos 100-199](https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-100-199.html).
- Los números de casilla salen de `diccionarioXSD_2025.properties`.
- Los límites salen del esquema `Renta2025.xsd`, actualizado el 24-06-2026.

Se consultaron el 19-10-2026, descargados fuera del repositorio. El mapa casilla ↔ etiqueta del XML ya está en `frontend/src/modules/tools/data/renta/xml/casillas-2025.json`.

### 1.1 Monedas virtuales (casillas 1800-1814)

Ventana «Ganancias y pérdidas patrimoniales derivadas de la transmisión o permuta de monedas virtuales». En la [ayuda de Renta WEB](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html) se indica la denominación y se elige la contraprestación «en el desplegable».

| Orden | Etiqueta exacta en la ventana | Casilla | Formato |
|---|---|---|---|
| 1 | **Denominación de la moneda virtual** | 1802 | texto (30 en la ventana, 25 en la casilla) |
| 2 | **Indique el tipo de contraprestación recibida a cambio** | 1803 | desplegable: **F** moneda de curso legal · **N** otra moneda virtual · **O** otro activo virtual · **B** bienes o servicios (claves del tipo `tipo_ClaveCri` del XSD) |
| 3 | Valor de transmisión → **Importe de la transmisión** | — | importe |
| 4 | Valor de transmisión → **Gastos de la transmisión** | — | importe |
| | *Renta WEB calcula* Valor de transmisión | 1804 | importe − gastos |
| 5 | Valor de adquisición → **Importe de la adquisición** | — | importe |
| 6 | Valor de adquisición → **Gastos de la adquisición** | — | importe |
| | *Renta WEB calcula* Valor de adquisición | 1806 | importe + gastos |
| (opcional) | Operación a plazos o con precio aplazado («Marque la casilla en caso afirmativo», abre el anexo C.1) | 1801 | marca |
| (opcional) | Valor de transmisión destinado a constituir una renta vitalicia | 1805 | importe (mayores de 65) |

Renta WEB calcula el resto:

| Casilla | Qué es |
|---|---|
| 1807 | Pérdida obtenida |
| 1808 | Pérdida imputable a 2025 |
| 1809 | Ganancia obtenida |
| 1810 | Exenta por renta vitalicia |
| 1811 | Ganancia no exenta |
| 1812 | Ganancia imputable a 2025 |
| 1813 | Total de pérdidas |
| 1814 | Total de ganancias |

- **No hay fechas, unidades ni plataforma** en la ventana.
- **No hay casilla de recompra** como en fondos y acciones. La app ya trata la recompra en cripto solo como aviso, y es coherente con esto.
- La ventana tiene un botón de copiar alta (atributo `BCOPIAR_G2M` del XSD).

### 1.2 Fondos de inversión y SOCIMI «sujetos o no a retención» (casillas 0310-0325)

Aquí van los fondos españoles y también los extranjeros que no sean ETF. Ventana «Ganancias y pérdidas por la transmisión de sociedades y fondos de inversión y de SOCIMIS». La [ayuda](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/transmisiones_instituciones_inversion_colectiva.html) pide «el importe global de las transmisiones y adquisiciones», con tantas «alta» como situaciones distintas haya (DT 9.ª, rentas vitalicias).

| Orden | Etiqueta exacta | Casilla |
|---|---|---|
| 1 | **NIF de la sociedad o fondo de inversión** | 0311 |
| 2 | **Valor de transmisión (\*)** | 0312 |
| 3 | **Valor de adquisición (\*)** | 0315 |
| 4 | **Retenciones** (el programa las lleva a la 0603) | — |
| 5 | **Marque la casilla si la transmisión ha originado una pérdida patrimonial que no puede ser computada en 2025 por haberse producido la recompra dentro de los plazos legalmente establecidos** | — |
| (DT 9.ª) | Fecha de adquisición; valor a efectos del Impuesto sobre el Patrimonio de 2005 | — |

Renta WEB calcula:
- Ganancias 0316 y ganancias reducidas 0320.
- Pérdidas 0321 y pérdidas imputables 0322.
- Totales: 0324 de ganancias y 0325 de pérdidas.

**Ojo:** solo se pide el NIF, no el nombre ni el ISIN. Los reembolsos de fondos comercializados en España suelen venir ya en los **datos fiscales** (modelo 187). La [ayuda 6.1](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/6_1.html) explica que, si un dato necesita información complementaria, Renta WEB pregunta si se incorpora. El archivo de Finanverso tiene que **marcar qué filas pueden venir ya de los datos fiscales**, para que el usuario no las duplique.

### 1.3 ETF y SICAV índice cotizadas (casillas 2225-2236), subapartado propio desde 2025

Ventana «Ganancias y pérdidas por la transmisión de participaciones de fondos cotizados (ETF) y de acciones de SICAV índice cotizadas». La [misma ayuda](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/transmisiones_instituciones_inversion_colectiva.html) incluye aquí:
- los fondos cotizados y SICAV índice del art. 79 del RD 1082/2012;
- las IIC extranjeras análogas, coticen en un mercado regulado o en un SMN, siempre que la venta no se haga en una jurisdicción no cooperativa.

El diccionario de 2024 no tiene este bloque: es nuevo en 2025.

| Orden | Etiqueta exacta | Casilla |
|---|---|---|
| 1 | **NIF del fondo cotizado (ETF) o SICAV índice cotizada** | 2225 |
| 2 | **Denominación del fondo (ETF) o SICAV índice cotizada** | 2226 (40 caracteres) |
| 3 | **Código ISIN de las acciones o participaciones** | — (12 caracteres) |
| 4 | **Valor de transmisión** | 2227 |
| 5 | **Valor de adquisición** | 2229 |
| 6 | Marca de pérdida no computable por recompra | — |

Renta WEB calcula:
- Ganancias 2230 y ganancias no exentas 2232.
- Pérdidas 2233 y pérdidas imputables 2234.
- Totales: 2235 de ganancias y 2236 de pérdidas.

Un ETF extranjero no tiene NIF español. Qué se pone en el campo NIF cuando solo hay ISIN es una prueba pendiente del dueño (§8).

### 1.4 Acciones admitidas a negociación (casillas 0326-0340)

Ventana «Transmisión de acciones negociadas». La [ayuda](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_patrimoniales_derivadas_acciones.html) pide «el nombre o razón social de la sociedad emisora» y, «para cada entidad el importe global de las transmisiones y adquisiciones». Antes hay que elegir entre **usar Cartera de Valores** (casilla de marcar) o rellenar a mano. Las dos opciones son **excluyentes** ([ayuda de Cartera de Valores](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/cartera-valores.html)).

| Orden | Etiqueta exacta | Casilla |
|---|---|---|
| 1 | **Entidad Emisora** | 0327 (20 caracteres) |
| 2 | por cada transacción: **Valor de transmisión (\*)** | suma en 0328 |
| 3 | por cada transacción: **Valor de adquisición (\*)** | suma en 0331 |
| 4 | por cada transacción: **Marque la casilla si ha obtenido una pérdida patrimonial y ha recomprado acciones homogéneas en los dos meses anteriores o posteriores a la transmisión** | — |
| (opcional) | renta vitalicia; DT 9.ª (fecha de adquisición, valor en el Patrimonio de 2005) | — |

Renta WEB calcula:
- Ganancias 0332 y ganancias reducidas 0336.
- Pérdidas 0337 y pérdidas computables 0338.
- Totales: 0339 de ganancias y 0340 de pérdidas.

### 1.5 Otros elementos patrimoniales (casillas 1624-1654), donde la app pone derivados y oro

Ventana con «Tipo de elemento patrimonial» (casilla 1626) en cinco opciones. Para un derivado o un CFD de un particular, la opción 4 es «**Otros elementos patrimoniales (bienes o derechos) no afectos a actividades económicas**». La ubicación de los derivados sale de fuentes secundarias (§9).

| Orden | Etiqueta exacta | Casilla |
|---|---|---|
| 1 | Tipo de elemento patrimonial (opción 4) | 1626 |
| 2 | **Transmisión intervivos onerosa (venta, permuta, etc)** | — |
| 3 | **Fecha de transmisión** | 1631 |
| 4 | **Fecha de adquisición** | 1632 |
| 5 | Valor de transmisión → **Importe de la transmisión** · **Gastos de la transmisión** | 1633 |
| 6 | Valor adquisición → **Importe de la adquisición** · **Gastos de la adquisición** · **Amortizaciones** | 1637 |

Renta WEB calcula 1638-1640, 1645-1650 y los totales 0385 (pérdidas) y 0386 (ganancias no afectas). **Pide fechas**, y eso complica agrupar (§5).

### 1.6 Lo que Hacienda dice sobre el cálculo

- **Cripto:** las ganancias y pérdidas «se calcularán de manera independiente para cada operación de venta de cada tipo de moneda».
  - En permutas, el valor de transmisión es el mayor del valor de mercado de lo entregado o de lo recibido.
  - FIFO aunque se opere «en diferentes casas de cambio».
  - Los gastos computan.
  - La quiebra de una plataforma no es pérdida automática.

  Fuente: [ayuda 7.6.6.2 de monedas virtuales](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/7_6_6_2/ganancias_perdidas_monedas_virtuales.html). Doctrina DGT: V0999-18 y V1149-18 (permuta) y V1604-18, V0975-22 y V0648-24 (FIFO). La STSJ del País Vasco de 9-1-2025 (rec. 75/2024) rechaza el FIFO en cripto en territorio foral. Sigue en debate.
- **Fondos y acciones:** el importe global por fondo o por emisor, y la pérdida por recompra se declara pero no se integra (marca). Caso práctico oficial: [Manual práctico 2025, capítulo 11](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales/caso-practico.html) (fondo 15.800 − 15.000 = 800; acciones con recompra: pérdida de 4.800 que no se integra).

## 2. ¿Existe alguna forma de importación distinta del XML completo? **NO**

| Vía que se buscó | ¿Existe? | Fuente y detalle |
|---|---|---|
| Botón «Importar» dentro de un apartado de Renta WEB (cripto, fondos, acciones) | **No** | Las ayudas de cada apartado (§1) solo describen la «ventana de captura de datos» y las «alta». La botonera de Renta WEB ([ayuda con certificado](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/presentar-borrador-declaracion-mediante-renta-certificado.html)) tiene datos identificativos, guardar en el servidor de la AEAT, buscar casilla, notas, validar y vista previa. No tiene importar |
| Excel, CSV, ASCII o texto plano en Renta WEB | **No** | No aparece en ninguna ayuda técnica de Renta ([índice](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica.html)). La AEAT solo acepta Excel en otros modelos (p. ej. el 361) |
| Programa PADRE | **No existe** | Se retiró: Renta WEB lo sustituyó del todo en la campaña de 2016 y hoy no hay programa que descargar ([Garrigues](https://www.garrigues.com/es_ES/noticia/campana-de-la-renta-2016), [Sage](https://www.sage.com/es-es/blog/renta-web-adios-programa-padre/)). La ayuda 6.1 todavía habla de ficheros «DFP o DF» de datos fiscales, pero los descarga Renta WEB y no el usuario |
| Renta WEB Open (simulador) | **Solo su propio .ses** | «Cargar» importa una declaración «previamente guardada y creada con la misma aplicación (fichero .ses)» ([ayuda](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/renta-web-open.html)). No presenta. El formato .ses no está publicado |
| Datos fiscales (modelos 187, 189, 196, 198, 172/173) | **Sí, pero los carga la AEAT, no el usuario** | Se incorporan solos o tras confirmar ([ayuda 6.1](https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Presentacion/100/6_1.html)). Cubren entidades españolas. En cripto, el borrador muestra el aviso «Monedas virtuales informadas CR2» (según [Taxdown](https://taxdown.es/casilla-renta/casilla-1800-de-la-renta-todo-lo-que-debes-saber)), pero no rellena el valor de adquisición |
| Cartera de Valores | **Sí, pero sin fichero** | Carga sola las operaciones de los modelos 189 y 198 desde 2018. El usuario añade valores con «Nuevo valor» y «Nueva operación», una a una. Se sincroniza con Renta WEB si la cartera es «consistente» y excluye el relleno manual ([ayuda técnica](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/cartera-valores.html), [manual](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/cartera-valores/1-ideas-generales.html)). Solo acciones cotizadas: ni fondos, ni ETF ni cripto. El programa de escritorio de 2016-2017 importaba su propio XML; la versión web actual no lo menciona |
| «Importar datos de ejercicios anteriores» | **No** | Solo se puede obtener la **copia** de la declaración anterior ([ayuda](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/copia-declaracion-ejercicio-anterior.html)). Las pérdidas pendientes de años anteriores llegan en los datos fiscales |
| Presentación mediante fichero (XML completo) | **Sí, pero descartada** | §3 |

## 3. Ruta descartada: «Presentación mediante fichero» (XML completo del modelo 100)

La sede permite presentar una declaración hecha con un programa ajeno: «Importar XML» con un fichero ajustado al diseño de registro del modelo 100 ([ayuda técnica](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/presentar-declaracion-mediante-fichero-generado-externo.html)). Tras importar se ve el resumen, la vista previa y la validación. La propia ayuda avisa de que «la consulta de datos fiscales no está disponible por esta vía».

**Descartada por decisión del dueño (19-10-2026):** el fichero **sustituye la declaración entera**. No se puede añadir solo el apartado F2 al borrador de Renta WEB. Habría que reproducir todo lo demás (trabajo, cuentas, deducciones, familia, autonómicas) y perder la incorporación de datos fiscales. El generador se ha retirado y no se recomienda como entregable ni como alternativa. Que exista explica por qué el software profesional de gestorías (a3ASESOR, Sage) prepara la declaración completa en su programa: ese no es el modelo de Finanverso.

## 4. Cómo lo hacen los gestores, las herramientas y la gente

| Quién | Qué entrega | Cómo se mete en Renta WEB | Agrupación |
|---|---|---|---|
| **Taxdown** ([guía de la casilla 1800](https://taxdown.es/casilla-renta/casilla-1800-de-la-renta-todo-lo-que-debes-saber)) | Hace la declaración por el cliente (colaborador social) | A mano, en «Monedas virtuales»: denominación, clave F/N/O/B, transmisión y adquisición con gastos | Cada operación por separado; si se supera el límite de la plataforma, se agrupa «siempre y cuando tengas la documentación original» |
| **Declarando** ([guía](https://declarando.es/declarar-criptomonedas)) | Guía | «Añadir elemento patrimonial» por cada venta, con el lápiz en la 1804 | No lo trata |
| **Summ** ([guía para Renta WEB](https://help.summ.com/en/articles/14606300-spain-tax-guide-how-to-file-your-crypto-taxes-using-summ-and-renta-web-modelo-100)) | Informe con totales por tipo de renta | «Alta de elemento patrimonial» por cada venta del informe; comprobar que el F2 cuadra con el total | Por operación; no habla de límite |
| **Koinly** | Informe «Spain: Capital Gains Summary» (PDF/CSV), de pago | A mano | El informe agrupa por tipo de renta |
| **CoinTracking** ([guía](https://cointracking.info/es/guia-fiscal/spain/como-declarar-criptomonedas)) | Informes genéricos | A mano; recomienda confirmar la casilla con un asesor | No lo concreta |
| **Bit2Me Tax** (nota de prensa de 2022, [elderecho.com](https://elderecho.com/bit2me-lanza-una-herramienta-gratuita-para-declarar-las-operaciones-con-criptomonedas-en-espana)) | PDF con hoja resumen, transacciones y «asistencia para completar el formulario» | A mano | Por moneda |
| **DeclaRenta** (código abierto, [GitHub](https://github.com/GeiserX/DeclaRenta)) | Casillas calculadas y guía de dónde escribirlas; exporta JSON, CSV y PDF | A mano: «Renta Web no importa esos datos» | FIFO global entre brókers |
| **Extensión «Renta Cripto AEAT»** (Chrome, [ficha en ExtScope](https://extscope.org/extension/kgibjaiahjbkmpmlmiifjemdbdoofklf)) | Lee el CSV de ganancias de Koinly | **Teclea por el usuario** en la ventana 1800 de Renta WEB, con la sesión abierta, en modo agrupado o individual | Dos opciones. Muy pocos usuarios, sin valoraciones, editor independiente que «no asume responsabilidad» |
| **Gestorías** (a3ASESOR ren, Sage) | Declaración completa en su programa | Presentación mediante fichero o colaboración social | Lo decide el profesional |
| **Foros** (Rankia, [hilo de 300 operaciones](https://www.rankia.com/foros/bolsa/temas/4233229-criptomonedas-hacienda); guías de [XTB](https://www.xtb.com/es/educacion/como-declarar-criptomonedas) y [Grupo2000](https://www.grupo2000.es/a-partir-de-2024-sera-obligatorio-declarar-las-criptomonedas/)) | Hojas de cálculo propias | A mano | «Agrupar por moneda» y guardar el detalle por si hay requerimiento. Grupo2000 propone para elementos con fecha usar la de la primera compra y la de la última venta |

**Problemas que se repiten:**
- Hacienda cruza los datos con los modelos 172/173 y el 721, y desde 2025 envía avisos.
- Requerimientos que piden el detalle operación a operación. Por eso hay que entregar siempre el justificante FIFO.
- Confusión de casillas entre campañas: en 2022 la cripto iba en «otros elementos», 1626.
- Claves de contraprestación mal elegidas: N en vez de F al vender stablecoins por euros.
- Pérdidas de una plataforma quebrada declaradas como pérdida.
- Ventas sin coste de adquisición porque faltan compras antiguas.

## 5. Agrupación: qué está permitido y qué proponemos

| Apartado | Qué dice Hacienda | Propuesta para Finanverso |
|---|---|---|
| Fondos con retención | «Importe global» por fondo (NIF); altas aparte para DT 9.ª, rentas vitalicias y recompra | Una alta por **NIF × signo** (ganancias / pérdidas que cuentan) y otra por cada grupo de **pérdidas bloqueadas por recompra** (con la marca). Señalar las filas que pueden venir ya de los datos fiscales (fondo español, modelo 187) |
| ETF y SICAV índice | «Importe global»; altas aparte en casos especiales | Una alta por **ISIN × signo**, más la de pérdidas por recompra |
| Acciones | «Para cada entidad el importe global» | Una entidad por emisor (nombre recortado a 20 caracteres) con, como máximo, tres transacciones: ganancias, pérdidas que cuentan y pérdidas por recompra (con la marca) |
| Monedas virtuales | Cálculo por operación; la ventana no pide el detalle | Una alta por **moneda × clave (F/N/O/B) × signo**. Si caben (≤ 300 altas), opción «una alta por venta» |
| Otros elementos (derivados) | Una alta por elemento, con fechas | Una alta por posición cerrada si caben (≤ 80). Si no, una por **instrumento × signo**, con fecha de transmisión = último cierre y fecha de adquisición = primera apertura (criterio de §9) |

**Por qué separar por signo:** Renta WEB calcula el resultado de cada alta como transmisión − adquisición. Si una alta mezcla ventas con ganancia y con pérdida, la casilla de ganancias (1809/0316/0332) y la de pérdidas (1807/0321/0337) solo muestran el neto. Con dos altas por activo:
- los totales 1813/1814, 0324/0325, 2235/2236 y 0339/0340 son **los mismos** que operación a operación;
- el usuario puede cuadrarlos con el informe de su plataforma;
- el impuesto no cambia (art. 49.1.b LIRPF).

**Si se superan los límites aun agrupando**, por ejemplo más de 150 monedas con ganancias y pérdidas: unir el signo dentro de la misma moneda, y el aviso lo explica. Hacerlo ya no cambia el impuesto.

## 6. Recomendación de producto: qué debe generar Finanverso

### 6.1 Entregable principal: `Finanverso-Renta-<año>-copiar-en-Renta-WEB.pdf`

> Hasta octubre de 2026 el entregable principal era un Excel (`.xlsx`) con el mismo contenido. **El dueño decidió retirarlo** («ya está en PDF, quita lo del Excel»): ahora solo se genera el PDF (ver `inversiones.md`).

**Una sección por ventana de Renta WEB**, en el orden en que aparecen en el apartado F2. Cada sección tiene:
- una fila por alta;
- las columnas con **la etiqueta literal de la ventana**, en su orden;
- después, en gris, «lo que verás en Renta WEB», para comprobar.

| Sección | Columnas (literales de la ventana y en su orden) | Columnas de comprobación |
|---|---|---|
| `0 Empieza aquí` | Resumen en recuadros (filas por ventana, tiempo, totales por casilla), un ejemplo resuelto y los pasos: entrar en Renta WEB → F2 → cada ventana → «Alta» → copiar fila → Aceptar → marcar «Hecho» | — |
| `1 Fondos (0310)` | Nº de alta · NIF de la sociedad o fondo de inversión · Valor de transmisión · Valor de adquisición · Retenciones · Pérdida no computable por recompra (Sí/No) | Nombre del fondo (solo para ti) · Ganancia [0316] · Pérdida [0321] · Pérdida que cuenta [0322] · Reembolsos incluidos · ¿Puede venir ya en tus datos fiscales? · Hecho |
| `2 ETF (2225)` | Nº de alta · NIF del fondo cotizado (ETF) o SICAV índice cotizada · Denominación del fondo (ETF) o SICAV índice cotizada · Código ISIN de las acciones o participaciones · Valor de transmisión · Valor de adquisición · Pérdida no computable por recompra | Ganancia [2230] · Pérdida [2233] · Pérdida que cuenta [2234] · Ventas incluidas · Hecho |
| `3 Acciones (0326)` | Nº de alta · Entidad Emisora · Transacción · Valor de transmisión · Valor de adquisición · Pérdida con recompra en dos meses (Sí/No) | Ganancia [0332] · Pérdida [0337] · Pérdida que cuenta [0338] · Ventas incluidas · Hecho |
| `4 Monedas virtuales (1800)` | Nº de alta · Denominación de la moneda virtual · Tipo de contraprestación recibida a cambio (`F - Moneda de curso legal`, `N - Otra moneda virtual`, `O - Otro activo virtual`, `B - Bienes o servicios`) · Importe de la transmisión · Gastos de la transmisión · Importe de la adquisición · Gastos de la adquisición | Valor de transmisión [1804] · Valor de adquisición [1806] · Pérdida [1807] · Ganancia [1809] · Operaciones incluidas · Hecho |
| `5 Otros elementos (1624)` | Nº de alta · Tipo de elemento patrimonial (`4 - Otros elementos patrimoniales no afectos`) · Transmisión intervivos onerosa (Sí) · Fecha de transmisión · Fecha de adquisición · Importe de la transmisión · Gastos de la transmisión · Importe de la adquisición · Gastos de la adquisición · Amortizaciones (0) | Pérdida [1638] · Ganancia [1640] · Posiciones incluidas · Hecho |
| `6 Totales por casilla` | Casilla · Concepto · Importe: 0324, 0325, 2235, 2236, 0339, 0340, 1813, 1814, 0385, 0386; rendimientos 0027, 0029, 0031, 0037; retenciones 0597, 0603; doble imposición 0588 | Saldo de ganancias y pérdidas del ahorro |
| `7 Detalle por operación` | Justificante: cada venta con fecha, plataforma, unidades, valor de transmisión y adquisición, compras FIFO usadas y en qué alta va | Lo que se guarda 4 años (LGT art. 66) |
| `8 Rendimientos` | Lo de hoy (intereses, dividendos, staking) con su casilla | — |

**Formato de los datos:**
- Importes con 2 decimales, coma decimal y sin separador de miles (`1234,56`), como en §6.3.
- Fechas `dd/mm/aaaa`.
- Textos recortados a la longitud de la casilla: 20 en Entidad Emisora, 25 en moneda, 40 en denominación de ETF.
- Una columna «Hecho» para marcar.
- Las filas vacías no se generan. Una sección sin altas no se genera.

### 6.2 Diseño del PDF

A4 apaisado, cabecera «Renta <año>: lo que tienes que copiar en Renta WEB» con la marca «Preparado con Finanverso · no es un documento oficial» y pie «Página X de Y». Una sección por ventana con su tabla (columnas a copiar en amarillo suave, las de comprobación en gris con el rótulo «No copiar», un cuadradito «Hecho» por fila y la cabecera repetida en cada página), los totales de la ventana al final, una página «Totales que debes ver en Renta WEB» y el detalle FIFO como anexo en letra pequeña. Para quien rellena con el portátil y una tableta al lado.

### 6.3 En la app: modo «Copiar a Renta WEB»

Un asistente que muestra **una alta cada vez**, en el orden de la ventana, con un botón «Copiar» junto a cada campo:
- copia el importe sin separador de miles y con coma decimal (`1234,56`); hay que comprobar que Renta WEB lo acepta (§8);
- muestra el progreso «alta 3 de 12»;
- marca la alta como hecha;
- al final enseña los totales que tiene que ver el usuario en Renta WEB.

Es lo que más se acerca a «sin teclear» sin tocar Renta WEB. Una extensión del navegador que rellene Renta WEB (como la del §4) queda **fuera** por ahora: actúa dentro de la sesión fiscal del usuario, depende de la estructura de la página de la AEAT y rompe el principio de que Finanverso no toca la declaración.

### 6.4 Avisos que deben acompañar al archivo

Tono sereno; nada de «NO CONFIRMADO» en la interfaz.
- «Si tus fondos españoles ya aparecen en tus datos fiscales, revisa esas filas en vez de añadirlas otra vez».
- «Si usas Cartera de Valores para las acciones, no puedes añadir altas a mano en ese apartado: elige una de las dos».
- «Hemos agrupado tus N ventas en M altas por moneda y tipo; guarda el detalle (pestaña 7) por si Hacienda te lo pide».
- «Los ETF van en su propio apartado desde la Renta 2025».
- Si se supera un límite: «hemos unido ganancias y pérdidas de la misma moneda para no pasar de 300 altas».

## 7. Instrucciones para el generador

Para el agente o la persona que construya los entregables en `frontend/src/modules/tools/domain/invest/report.ts` y `application/investImport.ts`. El generador de XML completo del modelo 100 está retirado (§3): no se reintroduce.

1. **E1. Separar por signo (bug de la tabla actual).**
   - Hoy: `declarationRows` agrupa por `section|code|counterpart` y suma `proceeds` y `cost` de ventas con ganancia y con pérdida en la misma fila, mientras `gain`/`loss` se calculan venta a venta. Renta WEB calcularía `proceeds − cost` neto, que no coincide con las columnas que se muestran.
   - Cambio: clave `section|code|counterpart|sign|deferred`, donde `sign` = ganancia (gain ≥ 0) o pérdida, y `deferred` = pérdida no computable por recompra (marca de la ventana).
   - Test: 2 ventas de BTC por euros (+500 y −200) dan dos altas: transmisión y adquisición de cada una, 1809 = 500, 1807 = 200, y totales 1814 = 500 y 1813 = 200.
2. **E2. Sección propia para ETF y SICAV índice.**
   - Añadir `GainSection = 'etf'` con casillas `{ nif: '2225', name: '2226', proceeds: '2227', cost: '2229', gain: '2230', loss: '2233', counted: '2234' }` y totales 2235/2236.
   - En `SECTION_OF` mandar los ETF (hoy detectados por nombre: UCITS, iShares… en Degiro y similares) a `etf`, y los fondos no cotizados a `iic`.
   - Actualizar el comentario que dice «funds and ETFs by fund (0310-0325)».
3. **Campos por sección**, en este orden y con estas etiquetas: las del §1 y la tabla del §6.1. Guardarlas en una tabla de datos por ejercicio, p. ej. `data/renta/renta-web-ventanas-2025.json`, sacada de `diccionarioDlgXSD_2025.properties`, igual que `scripts/renta-xml/extract-map.py` saca el mapa de casillas.
4. **Cripto: importe y gastos por separado.** `Importe de la transmisión` = bruto; `Gastos de la transmisión` = comisiones de venta; `Importe de la adquisición` = coste FIFO bruto; `Gastos de la adquisición` = comisiones de compra. Si el motor solo tiene el neto, poner el neto en «Importe» y 0 en «Gastos»: el resultado 1804/1806 es el mismo. Clave 1803 con las cuatro opciones del XSD (F, N, O, B), no solo F/N.
5. **Límites** (por declarante, `Renta2025.xsd`):

   | Sección | Límite |
   |---|---|
   | `crypto` | 300 |
   | `iic` | 60 |
   | `etf` | 200 |
   | `shares` | 200 entidades × 500 transacciones |
   | `other` | 80 |

   Si se supera: 1) agrupar por activo × clave × signo; 2) unir signos del mismo activo; 3) en `other`, agrupar por instrumento con primera apertura y último cierre. Avisar en cada paso.
6. **Longitudes:** Entidad Emisora 20, Denominación de la moneda virtual 25 (casilla) o 30 (ventana): usar 25. Denominación de ETF 40, ISIN 12. Recortar sin partir palabras y guardar el nombre completo en la columna de referencia.
7. **Marca «puede venir ya en tus datos fiscales»:** fondos con gestora española (plataforma española o NIF que empieza por V); acciones de un depositario español (modelo 198). En plataformas extranjeras, falsa.
8. **Totales por casilla** calculados con la misma regla que Renta WEB (suma de las altas) y comparados en un test con `summaryOf`.
9. **Salidas:** el XLSX del §6.1 (sustituye la hoja «Por activo»), el PDF del §6.2 y los datos para el modo «Copiar a Renta WEB» (§6.3). Ningún fichero para la sede para el modelo 100.
10. **Tests con cifras a mano:**
    - el caso práctico oficial del capítulo 11 (fondo 15.800/15.000 → 0316 = 800; acciones 12.000/16.800 con recompra → 0337 = 4.800 y 0338 = 0);
    - un caso de 400 ventas de cripto de 3 monedas que debe dar 3 × 2 × clave altas y los mismos totales que venta a venta;
    - un caso de 90 posiciones de CFD que obliga a agrupar `other`.

## 8. Pruebas que debe hacer el dueño en Renta WEB

Se pueden hacer casi todas en **Renta WEB Open 2025**: no pide identificarse ni presenta nada ([ayuda](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/renta-web-open.html)).

1. F2 → monedas virtuales → «Alta»: comprobar que las etiquetas y el orden coinciden con el §1.1 y anotar las cuatro opciones del desplegable tal como se leen.
2. Pegar `1234,56`, `1.234,56` y `1234.56` en «Importe de la transmisión»: anotar cuáles acepta (para el botón «Copiar»).
3. Dos altas de BTC (una con ganancia y otra con pérdida): comprobar que 1813 y 1814 muestran cada una lo suyo.
4. Comprobar que existe el subapartado de ETF (2225-2236) y qué deja poner en el NIF de un ETF extranjero (vacío, ISIN, NIF extranjero).
5. Acciones: marcar y desmarcar «Cartera de Valores», y ver cuántas transacciones admite una entidad y si pide el nombre o deja buscar por ISIN.
6. Fondos: ver si el NIF es obligatorio para un fondo extranjero sin NIF español.
7. Otros elementos: crear una alta con la opción 4 y comprobar qué fechas exige.
8. Límite: con el botón de copiar alta (si aparece), duplicar altas de cripto hasta comprobar si se para en 300.
9. En su Renta WEB real (sin presentar): ver cómo aparecen sus fondos y el aviso CR2 en los datos fiscales, y si se incorporan con valor de adquisición.
10. Guardar en Renta WEB Open, cerrar y «Cargar» el .ses para ver que se recupera. No abrir ni subir ese fichero al repositorio: lleva datos personales.

## 9. Seguimiento interno (no va a la interfaz)

| Punto | Estado | Cómo cerrarlo |
|---|---|---|
| Agrupar cripto por moneda × clave × signo | Criterio razonado: la ventana no pide detalle, Taxdown y XTB lo admiten con documentación y no cambia el impuesto. No hay texto oficial que lo diga | Consulta a un gestor colegiado; valorar una consulta a la DGT |
| Derivados y CFD en «otros elementos» (opción 4) | Fuentes secundarias (Taxdown, Finantres, foros) | Manual práctico o consulta |
| Agrupar derivados con primera apertura y último cierre | Práctica citada por Grupo2000; sin fuente oficial | Gestor colegiado |
| Que Renta WEB aplique los mismos límites que el XSD | Deducido del esquema | Prueba 8 del §8 |
| Formato que acepta Renta WEB al pegar | Sin fuente | Prueba 2 del §8 |
| NIF de ETF y fondos extranjeros | Sin fuente | Pruebas 4 y 6 del §8 |
| Datos fiscales de cripto (173) | Solo aviso CR2, según terceros; la AEAT no lo documenta | Prueba 9 del §8 |
| FIFO en cripto | DGT a favor; TSJPV 9-1-2025 en contra (foral) | Vigilar la jurisprudencia |
| Etiquetas de rentas vitalicias del diccionario con años 2023/2024 | Errata del propio diccionario de la AEAT | Ninguna (no afecta) |

**Fuentes descargadas para este documento** (19-10-2026, en una carpeta temporal fuera del repositorio; no se copian al repo):
- `Renta2025.xsd`, `diccionarioXSD_2025.properties` y `diccionarioDlgXSD_2025.properties` (sede, diseños de registro 100-199);
- ayudas 7.6.6.2 de Renta 2025 (monedas virtuales, IIC, acciones), 6.1 y 6.2;
- ayudas técnicas de presentación mediante fichero, Renta WEB Open, Cartera de Valores, certificado, colaboradores sociales y copia del ejercicio anterior;
- caso práctico del capítulo 11 del Manual práctico 2025.
