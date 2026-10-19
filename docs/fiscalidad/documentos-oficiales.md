# Documentos oficiales de referencia por modelo

> **Aviso:** información orientativa, **no asesoramiento fiscal**. **Fecha de comprobación:** 19-10-2026. Versión legible por máquina: [documentos-oficiales.json](documentos-oficiales.json), con 61 entradas y 239 fuentes. Cada fuente lleva URL, tipo, ejercicio, capa de texto, AcroForm, cifrado, casillas leídas y notas.

Este documento dice qué documentos públicos sirven, para cada modelo que Finanverso debe cubrir:
- (a) para conocer la maquetación y las casillas exactas del impreso vigente;
- (b) para probar el lector de PDF de la app;
- (c) para construir vistas previas idénticas al impreso oficial.

**Licencias y privacidad:** en el repositorio solo hay URLs y metadatos. Los PDF de terceros **no** se guardan aquí. Las condiciones de reutilización de la AEAT, el BOE y los boletines forales no se han reverificado en esta revisión (NO CONFIRMADO). Tres declaraciones reales publicadas en portales de transparencia se miraron solo para conocer el formato: sus URLs se omiten a propósito.

## Método

1. **Búsqueda.** Fichas de procedimiento de la AEAT, «Ayuda técnica», instrucciones, diseños de registro, manuales prácticos y `static_files`; BOE (órdenes con su anexo) y boletines forales (BOB, BOG, BOTHA, BON). Después gestorías, colegios, universidades, ayuntamientos y la Wayback Machine (API CDX por prefijo de las antiguas carpetas `Modelos_y_formularios` de la AEAT). Por último, simuladores y predeclaraciones.
2. **Descarga y análisis**, fuera del repositorio, tratando todo como dato no confiable. Con pypdf se comprobó si abre, si está cifrado (casi todos los AcroForm de la AEAT lo están con contraseña vacía), si tiene capa de texto por página, sus campos AcroForm con nombre y /Rect, los años y los modelos citados.
3. **Lector real de la app** sobre los 174 PDF descargados, más los AcroForm rellenados con valores de prueba. Es `frontend/src/modules/finances/{application,domain}/taxModelPdf.ts`, empaquetado con esbuild y ejecutado con pdfjs-dist legacy. Resultado: 25 `ok`, 81 `noBoxes`, 62 `unknownModel` y 6 errores. Los errores son páginas 404 guardadas como .pdf.

## 1. Resumen: estado y mejor fuente por modelo

Leyenda de **Estado**:
- **R-vig:** impreso oficial rellenable vigente.
- **R-ant=:** rellenable oficial antiguo con la misma estructura.
- **R-ant≠:** rellenable antiguo con estructura distinta.
- **F-txt:** solo facsímil en boletín, con texto vectorial.
- **F-img:** facsímil solo en imagen.
- **DR:** solo diseño de registro o instrucciones.
- **ID:** no hay documento público: hace falta identificarse.
- **Supr.:** suprimido.

URLs: `AEAT` = `https://sede.agenciatributaria.gob.es` y `BOE-A-…` = `https://www.boe.es/boe/dias/…/pdfs/BOE-A-….pdf`. Las URLs completas están en el JSON.

### IRPF: retenciones y pagos fraccionados

| Modelo | Estado | Maquetación y casillas (mejor) | Prueba del lector (mejor) | Limitaciones |
|---|---|---|---|---|
| **111** | R-ant= + F-txt + ID | Facsímil de la [Orden EHA/586/2011](https://www.boe.es/boe/dias/2011/03/18/pdfs/BOE-A-2011-4948.pdf). Págs. 14 (declarante), 15 (entidad colaboradora) y 16 (Administración), en A4 595×842. El texto trae las casillas 01-30; sigue vigente, no hay orden posterior. Los mismos anexos sueltos: [hacienda.gob.es 26609.ANEXO.pdf](https://www.hacienda.gob.es/DocLeyes/onlinelt/26609.ANEXO.pdf). | AcroForm del **modelo 110** de la AEAT (2007, versión 2010), [archivado en la Wayback](https://web.archive.org/web/20130608080728id_/http://www.agenciatributaria.es/static_files/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Modelos_y_formularios/Declaraciones/Modelos_100_al_199/110/mod110_mi_MI.pdf). Tiene las casillas 01-30 con los mismos bloques que el 111 vigente (cotejado con `dr111e16v18.xls`). Rellenado con prueba, el lector **lee 30 de 30** y lo clasifica como 111. | **No existe ningún AcroForm oficial del 111**, ni vigente ni de 2011-2014. El sustituto lleva la cabecera del 110 y el lector no lee año ni periodo. La versión web (`OV17-M111`) exige certificado o Cl@ve; la predeclaración pide NIF y dato de contraste. |
| **115** | R-ant= + F-img + ID | AcroForm `mod115multidiomas_mi_MI.pdf` (2002, versión 2010), [archivado en la Wayback](https://web.archive.org/web/20121115052619id_/http://www.agenciatributaria.es/static_files/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Modelos_y_formularios/Declaraciones/Modelos_100_al_199/115/mod115multidiomas_mi_MI.pdf). Las casillas 1-5 coinciden con las 01-05 vigentes (`DR115e15v13.xls`). Ejemplo: `dato.15` /Rect [444.3, 445.4, 562.4, 461.2]. | El mismo AcroForm rellenado. **El lector falla (`unknownModel`)**: el título lleva saltos `\r` y las etiquetas son de 1 dígito («1».. «5»). Con dos retoques (normalizar espacios y aceptar 1 dígito) lee bien 01-05. | El facsímil del BOE (Orden de 20-11-2000, págs. 14-15) es un escaneo con mal OCR. Ninguna orden posterior fija el impreso. No existe 115 rellenable vigente ni ejemplo público rellenado. |
| **130** | R-ant= + F-txt + ID | Facsímil vigente de la [Orden HAP/258/2015](https://www.boe.es/boe/dias/2015/02/19/pdfs/BOE-A-2015-1656.pdf), pág. 6, casillas 01-19 en texto vectorial. | AcroForm de la AEAT de 2009 (`dato.4`…`dato.22` son las casillas 01-19), [copia de terceros](https://staticupthemedia.s3-eu-west-1.amazonaws.com/upload/modelo-130.pdf), igual al [archivado](https://web.archive.org/web/20121113093735id_/http://www.agenciatributaria.es/static_files/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Modelos_y_formularios/Declaraciones/Modelos_100_al_199/130/mod130_mi_MI.pdf). Rellenado, el lector **lee 19 de 19**, con año y trimestre. | Los literales de 2009 de la 13 y la 16 difieren de los vigentes. El «ejemplo» de ua.es está **en blanco**. La [copia de caib.es](https://sarreplec.caib.es/pluginfile.php/27017/mod_resource/content/3/eie08_2020/EIE08_CONT_R40_mod130.pdf) tiene las etiquetas en capa de texto. |
| **131** | F-txt + R-ant≠ + ID | [BOE-A-2015-1656](https://www.boe.es/boe/dias/2015/02/19/pdfs/BOE-A-2015-1656.pdf), pág. 8 (01-15), más `DR131_2026.xlsx`. | El lector no soporta el 131. **Riesgo:** un 131 rellenado se clasifica como 130 (y luego da `noBoxes`). | El AcroForm de 2009 no tiene números de casilla. |
| **123** | F-txt + R-ant≠ | [Orden HAC/56/2024](https://www.boe.es/boe/dias/2024/01/31/pdfs/BOE-A-2024-1772.pdf), pág. 23, casillas 01-14, más `DR123e24.xls`. | No soportado (`unknownModel`). | El AcroForm de 2007 tiene las casillas 01-08: otra estructura. |
| **180** | DR + F-img | `DR_Mod_180_2023.pdf`. Facsímil de 2000 solo en imagen. | — | Presentación telemática. Hay certificado AcroForm `GI00/certific_180_mi_MI.pdf`, con nombres de campo descriptivos. |
| **184** | DR | `DR_Modelo_184_2025.pdf` (la Orden HAP/2250/2015 no trae facsímil). | — | Solo AcroForm antiguo de 2007, de estructura distinta. |
| **190** | DR + F-txt (2009) | `DISENOS_LOGICOS_190_2025.pdf`, más el facsímil de [BOE-A-2009-18567](https://www.boe.es/boe/dias/2009/11/23/pdfs/BOE-A-2009-18567.pdf): págs. 21-22 hoja resumen (01-03) y 23-26 hojas interiores. | — | Instrucciones 2025 en PDF. `Certificado_unico_2025_es_es.pdf` sirve para la vista previa del certificado de retenciones. |
| **193** | DR + F-txt (2011) | `DR_Modelo_193_2025.pdf`, más [BOE-A-2011-19396](https://boe.gob.es/boe/dias/2011/12/12/pdfs/BOE-A-2011-19396.pdf), págs. 12-13 (resumen 01-05). | — | — |
| **196** | DR | `DR_Mod_196_2023.pdf` y [Orden HAC/747/2025](https://www.boe.es/boe/dias/2025/07/15/pdfs/BOE-A-2025-14600.pdf). | — | Desde 2025 es mensual en XML o servicio web, sin impreso. |

### IRPF: Renta, familia, Patrimonio y bienes en el extranjero

| Modelo | Estado | Maquetación y casillas (mejor) | Prueba del lector (mejor) | Limitaciones |
|---|---|---|---|---|
| **100** | F-txt + DR + ID | [Orden HAC/277/2026](https://www.boe.es/boe/dias/2026/03/27/pdfs/BOE-A-2026-7041.pdf), 87 págs. en texto vectorial: anexo I págs. 21-45 (págs. 1-25 del impreso); **anexos A.1-A.6** 46-51, **B.1-B.15** 52-66, **C.1-C.5** 67-71, **D** 72 (no hay anexo E). Lista maestra de casillas: [`diccionarioXSD_2025.properties`](https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/diccionarioXSD_2025.properties), con 2.205 casillas de 4 cifras, tipo y etiqueta. | PDF generado con **Renta WEB Open** ([simulador](https://www2.agenciatributaria.gob.es/wlpl/PARE-RW25/OPEN/index.zul?TACCESO=COLAB&EJER=2025); el NIF no se contrasta) con datos ficticios. **Ojo:** en el PDF real de Renta WEB la casilla va **a la derecha** del importe («… 66.661,66 0435»; medido en 146 de 148 pares de dos declaraciones reales). El lector actual asume lo contrario. | No hay AcroForm. El PDF de la declaración solo lo genera Renta WEB, que exige identificarse. La parte 2 del Manual en PDF da 404. |
| **102** | Impreso oficial en blanco vigente (sin AcroForm) | [Modelo102.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G229/102/Modelo102.pdf) y BOE-A-2026-7041, págs. 75-76. | Poco útil: una sola casilla (01). | Solo en papel, en entidad colaboradora. |
| **103** | Supr. / no existe | — | — | No aparece en la lista de modelos de IRPF de la AEAT, ni en los diseños de registro ni en las órdenes. Conviene quitarlo de [modelos.md](modelos.md). |
| **121** | F-txt + predeclaración | [Orden HFP/105/2017](https://www.boe.es/boe/dias/2017/02/10/pdfs/BOE-A-2017-1334.pdf), págs. 7-8. | PDF de la predeclaración `F121PredServlet` (si pide identificación: NO CONFIRMADO). | — |
| **122** | F-txt + DR | [Orden HAC/763/2018](https://www.boe.es/boe/dias/2018/07/18/pdfs/BOE-A-2018-10064.pdf), págs. 8-9, más `dr122e18v13.xlsx`. | — | — |
| **140** | Sin impreso | Las órdenes (HAC/177/2020, HFP/1336/2022) solo describen campos. | Predeclaración [F140Pre](https://www2.agenciatributaria.gob.es/wlpl/DAMA-PRES/F140Pre): según la AEAT, sin identificación y genera PDF. | — |
| **143** | F-txt + presolicitud | BOE-A-2018-10064, págs. 6-7 (el original de 2014 es BOE-A-2014-13675). | PDF de la presolicitud `F143Predec1Servlet`. | — |
| **714** | F-txt + DR + ID | BOE-A-2026-7041, págs. 77-87 (casillas de 1-2 cifras), más `DR714_2025.xls`. Hay una versión más limpia en el [proyecto de anexo de hacienda.gob.es](https://www.hacienda.gob.es/sgt/normativadoctrina/proyectos/26012026-anexo-iii-y-iv-patrimonio-2025.pdf). | No hay nada público sin identificación. El PDF de Patrimonio WEB pone la casilla **a la izquierda**, como el facsímil. | No existe simulador de Patrimonio sin identificación. |
| **718** | F (sin texto) + DR | `DR718_2025.xlsx` (casillas 15-37). El anexo vigente, [BOE-A-2026-14011](https://www.boe.es/boe/dias/2026/06/29/pdfs/BOE-A-2026-14011.pdf) págs. 4-7, está en trazados sin texto: necesita OCR o medición. Con texto, pero de 2022: BOE-A-2023-13800. | — | — |
| **720** | DR | [Orden HAP/72/2013](https://www.boe.es/boe/dias/2013/01/31/pdfs/BOE-A-2013-954.pdf) y `modelo_720.pdf`. | — | Declaración informativa sin casillas. Se presenta con identificación. |
| **721** | DR | [Orden HFP/886/2023](https://www.boe.es/boe/dias/2023/07/29/pdfs/BOE-A-2023-17429.pdf) y `GI55/Anexo721.pdf`. | — | Mensaje XML, sin casillas. |

### IVA

| Modelo | Estado | Maquetación y casillas (mejor) | Prueba del lector (mejor) | Limitaciones |
|---|---|---|---|---|
| **303** | F-txt + ejemplos oficiales + ID | [Orden HAC/27/2026](https://www.boe.es/boe/dias/2026/01/26/pdfs/BOE-A-2026-1761.pdf), anexo III, págs. 12-17, en texto vectorial. Vigente desde febrero de 2026 y **idéntico a `DR303e26v101.xlsx`**. Novedad: casilla 112 (pago a cuenta del 319); la 71 pasa a ser 69 − 70 + 109 − 112. | **Manual práctico de IVA 2026**, ejemplos oficiales rellenados: [Cap_9_303_es_es.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Manual/Practicos/IVA/IVA_2026/Imagenes/Cap_9_303_es_es.pdf) (4 trimestres en 12 págs., régimen general) y `Cap7_303_1T.pdf` / `Cap7_303_4T.pdf` (simplificado). Partido por trimestres, el lector da `ok` con año 2026 y el trimestre correcto, y lee 22-28 casillas por trimestre. | Ningún 303 vigente rellenable. El AcroForm de [clubdelasesor](https://clubdelasesor.com/wp-content/uploads/2016/03/modelo-303.pdf) es de 2009 y su numeración no es la vigente. Fallos del lector: [§2](#2-el-lector-real-de-la-app-sobre-los-documentos). |
| **309** | F-txt + DR + ID | [Orden HFP/1245/2022](https://www.boe.es/boe/dias/2022/12/19/pdfs/BOE-A-2022-21458.pdf), págs. 3-4 (01-27, igual que `dr309e23.xls`). | — | La predeclaración pide DNI o NIE con dato de contraste. |
| **322** | F-txt + DR | BOE-A-2026-1761, anexo I, págs. 6-9 (189 casillas, igual que `DR322e26v11`). | — | Requiere certificado. |
| **353** | F-txt + DR | BOE-A-2026-1761, anexo II, págs. 10-11. | — | Requiere certificado. |
| **340** | Supr. | Histórico: BOE A52370-52411 (2008), págs. 5-7. | — | Art. 36 del RGAT suprimido por el RD 1512/2018, desde el 1-1-2019. |
| **347** | F-txt + DR + ID | [Orden HAP/1732/2014](https://www.boe.es/boe/dias/2014/09/26/pdfs/BOE-A-2014-9740.pdf), págs. 5-10, más `347.pdf` (2025). | La «Vista previa» del formulario (con identificación) da un PDF. | No hay ejemplo público rellenado. |
| **349** | F-txt + ejemplo en imagen + ID | [Orden EHA/769/2010](https://www.boe.es/boe/dias/2010/03/29/pdfs/BOE-A-2010-5098.pdf), págs. 13-19, más [C9-mod349-2026.png](https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Manual/Practicos/IVA/IVA_2026/Imagenes/C9-mod349-2026.png) (hoja interior rellenada). | — | Instrucciones de 2026 en PDF (`instr_mod_349.pdf`). |
| **360 / 361** | DR / F-img | BOE-A-2010-5210 y `DR360.pdf`; 361: BOE-A-2024-10681 (anexo en imagen). | `Ejemplo_importacion_Operaciones_361.xlsx` (AEAT). | Requieren certificado. |
| **369** | F-txt (glifos rotos) + DR | [Orden HAC/610/2021](https://www.boe.es/boe/dias/2021/06/18/pdfs/BOE-A-2021-10161.pdf), págs. 10-22. | — | Tablas por país, sin casillas numeradas. |
| **390** | F-txt + ejemplo oficial + **simulador sin identificación** | BOE-A-2026-1761, anexo IV, págs. 18-26 (375 casillas de `dr390e2025` más la 112). | [Cap_9_390_resumen_anual_es_es.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Manual/Practicos/IVA/IVA_2026/Imagenes/Cap_9_390_resumen_anual_es_es.pdf) (2026, págs. 2-8 rellenadas) y [simulador OPEN 2025](https://www2.agenciatributaria.gob.es/wlpl/PAIV-M390/E2025/OPEN/index.zul) («Vista previa» → PDF). | El lector **lo toma por un 303** (ver §2). E2026/OPEN todavía da 404. |

### Censales, IAE, Seguridad Social, Sociedades y no residentes

| Modelo | Estado | Maquetación y casillas (mejor) | Prueba (mejor) | Limitaciones |
|---|---|---|---|---|
| **036** | F-txt + predeclaración sin identificación | [Orden HAC/1526/2024](https://www.boe.es/boe/dias/2025/01/09/pdfs/BOE-A-2025-410.pdf), anexo I, págs. 7-18 (casillas de 3 cifras, 036-943). | La predeclaración [`BU36-M036`](https://www2.agenciatributaria.gob.es/wlpl/BU36-M036/MOD036/index.zul) con datos ficticios da el PDF real; según su ayuda, sin Cl@ve ni certificado. | No existe un 036 en blanco ni AcroForm descargable. `instr_mod036.pdf` da 404; la guía es HTML. |
| **037** | Supr. | — | — | Suprimido desde el 3-2-2025 (Orden HAC/1526/2024). |
| **030** | **R-ant=** (AcroForm oficial de 2021) | [mod030_es_es.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G321/mod030_es_es.pdf): 170 campos `dato.N`, cifrado con contraseña vacía, casillas iguales a BOE-A-2025-410, págs. 31-34. | Rellenarlo y leerlo: buen caso para el camino AcroForm. | `N` no es el número de casilla, y la etiqueta va **encima** del campo, no a su izquierda. |
| **840** | **R-vig** (AcroForm oficial) | [mod840e_es_es.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G323/mod840e_es_es.pdf) (versión 3.0/2008, para presentación en papel): 455 campos `dato.N` / `dato.a.N`, casillas 1-83. | Ídem. | Etiqueta encima del campo (`dato.13` está bajo la casilla 4). El anexo del BOE es un escaneo. |
| **848** | Impreso en blanco vigente | [848.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G323/848.pdf) (texto). | Texto plano. | Sin AcroForm. |
| **RETA: TA.0521** | R-ant≠ (retirado) + ID | Copias de la Wayback de TA.0521/1 (V9), /2, /5 (socios), /6 y la hoja adicional (2018): AcroForm con nombres de campo semánticos. | No aplica: sin casillas numeradas. | La Seguridad Social ya no publica ningún TA.0521 (404). El alta vigente es solo Import@ss con Cl@ve, SMS o certificado (guía 6GATA de 2026). Los de 2018 no tienen el campo de rendimientos previstos del sistema de 2023. |
| **RETA: cese, recibos y bases** | ID | El cese no tiene modelo único: cada mutua el suyo (p. ej. Ibermutua 2026, AcroForm de 257 campos). Recibos y certificado de bases: solo Import@ss. | — | Manuales de la TGSS `seg-social.es/descarga/es/177766` y `/187661`. |
| **200 / 202** | DR / F | 200: Orden HAC/529/2026, solo electrónico, `DR200e25.xls`. 202: Orden HFP/227/2017 (BOE-A-2017-2778), `DR202e25.xlsx`. | — | Fuera del alcance de la app: solo identificados. |
| **210** | F-txt + predeclaración + ejemplos antiguos | Vigente en 2026: `dr210_2026.xlsx`. Para 2027: [Orden HAC/623/2026](https://www.boe.es/boe/dias/2026/06/23/pdfs/BOE-A-2026-13573.pdf), págs. 9-14. | `GF00/Ejemplo_renta_imputada.pdf` (2018-2019; las páginas del impreso son imagen) y la predeclaración `OV17-M210` (si pide identificación: NO CONFIRMADO). | — |
| **211 / 213** | F-txt + DR | [Orden EHA/3316/2010](https://www.boe.es/boe/dias/2010/12/23/pdfs/BOE-A-2010-19707.pdf): 211 en págs. 29-35, 213 en págs. 36-40. | — | — |
| **214 / 215** | Supr. | — | — | 214: derogado por la Orden EHA/3788/2008. 215: devengos hasta el 31-12-2010 (preámbulo de EHA/3316/2010). |
| **216** | F-txt + DR | BOE-A-2024-1772, pág. 24: una sola página con las casillas 01-21. | Buen candidato para una prueba futura del lector. | — |
| **217** | DR | `DR217e16.xls` (Orden HFP/1922/2016). | — | Es del Impuesto sobre Sociedades (gravamen especial del 19 % a SOCIMI), no del IRNR. Solo con certificado. |

### Haciendas forales: equivalentes al 100, al 130 y al 303

**Ningún territorio foral usa las casillas del 130 ni del 303 estatal**, ni siquiera cuando el número del modelo coincide. Ningún territorio publica un AcroForm ni un ejemplo oficial rellenado. Las cuatro Rentas van por programa, plataforma o propuesta, siempre con identificación.

| Territorio | Renta | Pago fraccionado | IVA trimestral | Mejor para maquetación |
|---|---|---|---|---|
| **Bizkaia** | Modelo 100 (OF 144/2026, según fuente secundaria; NO CONFIRMADO), por sede o app con BAK/BAKQ | 130: orden e impreso vigentes **NO CONFIRMADOS** | **303 propio** (OF 362/2023, BOB de 22-09-2023, págs. 7-8, texto vectorial). Casillas 03/04 (4 %), 110/111 (5 %), 05/06 (10 %), 07/08 (21 %), 23 total devengado, 30 total a deducir, 32/33 % y cuota de Bizkaia, 38-40 resultado. Solo telemático. | BOB OF 362/2023, págs. 7-8 |
| **Gipuzkoa** | **Modelo 109** (OF 91/2025; para 2025, OF 112/2026), por Zergabidea o propuesta | 130 propio (OF 121/2018, BOG de 22-03-2018): 01 rendimiento del penúltimo año × 5 % = 02, 03 minoración, 12 total. Admite papel. | **Modelo 300**, no 303 (OF 421/2021, BOG de 26-07-2021): 02/03 (21 %), 04/05 (10 %), 06/07 (4 %), 16 devengado, 25 deducible, 35 resultado | BOG pág. 7 renderizada (las fuentes no tienen mapa de caracteres: el texto no se puede extraer) |
| **Álava** | OF 101/2026 (número del modelo NO CONFIRMADO) | 130 solo para el año de inicio de actividad (OF 179/2019, BOTHA de 12-04-2019): 01 × 5 % = 02 | **303 propio** (OF 555/2024, BOTHA de 04-11-2024, págs. 3-4): solo la 01-03 al 4 % coincide; 207-209 (21 %), 28 devengado, 60 resultado | BOTHA 2024/125, págs. 3-4 |
| **Navarra** | **F-90** (Renta Navarra o propuesta) | 130 propio: el impreso en papel se suprimió en 2026 (OF 23/2026); 01-03 como el estatal, 08 retenciones, 15 a ingresar | **F-69** (OF 280/2006 y siguientes): 03/13 general, 20 devengado, 50 deducible, 63 resultado | Diseño de registro de 2019 (copia en Iustel) |

**Riesgo para la app (verificado con PDF sintéticos):** el lector detecta el modelo solo por el título. Por eso acepta un 303 de Bizkaia, un 300 de Gipuzkoa o un 130 de Álava y lee sus casillas con el significado estatal, sin avisar. En el 303 de Bizkaia, por ejemplo, la 08 es la cuota al 21 %, no el tipo. Hay que rechazar los PDF que digan «Diputación Foral», «Bizkaia», «Gipuzkoa», «Álava/Araba», «Navarra» o «F-69».

## 2. El lector real de la app sobre los documentos

| Documento | Resultado | Casillas bien | Casillas mal y por qué |
|---|---|---|---|
| 303 del Manual de IVA 2026, por trimestre (`Cap_9_303`, 1T-4T) | `ok`, año 2026 y trimestre 1-4 | Todas las que se imprimen con decimales: 07-11, 14-15, 22-24, 27-33, 36-37, 40-41, 45-46, 58-60, 64, 66, 69, 71, 78, 87 y 110 | Los **importes sin decimales** («-6.000», «0») se ignoran: en el 2T se pierde la 40 y en todos la 87 y la 110 cuando valen 0, porque `PRINTED_AMOUNT` exige coma decimal. |
| Ídem, de 2025 | `ok`, pero **año `null`** | Igual | «Ejercicio» se extrae en dos piezas («202» y «5»). |
| 303 simplificado (`Cap7_303_1T/4T`) | `ok`, con solo **5 casillas** | 58, 64, 66, 69, 71 | Las casillas 47-57 del régimen simplificado no están en `BOXES`. Tampoco 88-99, 107, 125-128, 500-524 ni 700-735. |
| PDF de 4 trimestres sin partir | `ok`, con **datos mezclados** | — | Se queda con el primer valor de cada casilla (de cualquier página) y devuelve el trimestre 1. |
| 390 del Manual (2025 y 2026) | `ok` como **303**, con 18 casillas | — | **Falso positivo grave:** el título del 390 también dice «Impuesto sobre el Valor Añadido» y «autoliquidación», así que las casillas del 390 se leen como si fueran del 303. |
| BOE con anexo del 390 (BOE-A-2026-1761, BOE-A-2022-19290 y otros) | `ok` como 303, con 1 casilla | — | Falso positivo 41 = 1,75: es el tipo de recargo impreso. |
| Manual Renta 2025, parte 1 | `ok` como 303, con 1 casilla | — | Falso positivo: un manual enorme cita el IVA. |
| AcroForm 130 (2009), rellenado | `ok`, año y trimestre | 01-19 | — |
| AcroForm 110 (sustituto del 111), rellenado | `ok` como 111 | 01-30 | Año y periodo `null`: «Ejercicio» y «Período» no van junto a su campo. |
| AcroForm 115 (2002), rellenado | **`unknownModel`** | — | Título con saltos `\r` y etiquetas de 1 dígito. |
| AcroForm 303 de 2009 (clubdelasesor), rellenado | `ok`, con 46 casillas | Empareja por posición | La numeración de 2009 (01-49) no es la vigente: solo sirve para el camino AcroForm. |
| AcroForm 131 (2009), rellenado | `noBoxes` (clasificado como **130**) | — | No tiene números de casilla. |
| Facsímiles del BOE (111, 130, 303, 322, 353) | `noBoxes` | — | Correcto: no tienen importes. |
| PDF de Renta WEB (modelo 100) | (no soportado) | — | Casilla a la **derecha** del importe: si se amplía el lector al 100, hay que aceptar las dos posiciones. |
| AcroForm 030 y 840 | (no soportado) | — | Etiqueta **encima** del campo, no a la izquierda. |

`BOXES` del 303 incluye casillas que ya no existen en 2026 (61, 67, 82, 85, 113-119 y 121) y le falta la nueva 112.

### 2.1 Correcciones del lector (19-10-2026)

Todos los fallos de la tabla anterior están corregidos en `frontend/src/modules/finances/domain/{taxModelDetect,taxModelPdf}.ts`, con pruebas sobre PDF sintéticos (`src/__tests__/finances/taxModelDetect.test.ts`) y sobre las piezas reales del Manual de IVA 2025 (`vatModels.test.ts`):

| Fallo | Corrección |
|---|---|
| 390 leído como 303 | Manda el número del modelo impreso en grande en la cabecera; si no hay texto de título, el periodo «0A» o las casillas 600-698 (solo existen en el 390) lo identifican. |
| Falsos positivos (BOE 41 = 1,75; manual de Renta) | Un PDF con «Boletín Oficial del Estado», «cve: BOE-» o «Verificable en www.boe.es», o de más de 40 páginas (salvo la Renta), se rechaza con `notAForm`. |
| Modelos forales | «Diputación Foral de…», «… Foru Aldundia», «Hacienda Foral/Tributaria de Navarra», «Gobierno de Navarra», «F-69», «F-90» → rechazo `foral` con el territorio y aviso al usuario. Los nombres sueltos (Bizkaia, Navarra…) no bastan, porque el 303 estatal los imprime en las casillas 89-92. |
| Varios trimestres en un PDF | Se lee el periodo de cada página; si hay más de uno, rechazo `severalPeriods` con la lista, sin mezclar cifras. |
| Importes sin decimales | «-6.000» y «0» se aceptan si van justo después de su casilla, en una página que tenga algún importe con céntimos (así no se toman las tablas de enunciado del Manual). |
| 47-57, 112, 500-524 y 700-735 del 303 | En `BOXES`, que es ahora la lista exacta del diseño de 2026 (la misma que la maquetación de la vista previa). |
| Año partido («202» «5») | Se unen las piezas de dígitos seguidas a la derecha de «Ejercicio»; también «Ejercicio 2025» en una pieza y el año bajo su etiqueta (AcroForm del 110). |
| Renta WEB (casilla a la derecha) | Lectura del modelo 100: casillas de 4 cifras, y el lado (derecha o izquierda) se decide por mayoría de líneas. |
| Etiqueta encima (030, 840) | Un campo sin número en su línea se empareja con el número justo encima (máx. 16 pt). El 030 y el 840 no se importan en la app: solo se ha generalizado el emparejamiento. |
| 115 antiguo | Título con espacios y saltos normalizados y casillas de 1 dígito («1»…«5»). |
| Ida y vuelta de las vistas previas | `npm run taxforms:verify`: 130 19/19, 111 30/30, 115 5/5 y 303 **185/185**. (El 100 llegó a leer 838/838; su vista previa se retiró después por decisión del dueño.) |

El facsímil del 100 (BOE-A-2026-7041, pág. 32) imprime un «0543» fantasma encima de las casillas 1608, 0592, 0593, 0594 y 0600; `extract-layout.mjs` lo descarta con `GHOSTS` si se vuelve a medir. La entrada 0543 de [renta-casillas.json](renta-casillas.json) arrastra el mismo error: su etiqueta real es el tipo medio de gravamen autonómico (pág. 42 del BOE).

## 3. Plan para las vistas previas idénticas

Regla general. Si hay un **AcroForm oficial**, se toman las coordenadas exactas de cada campo (/Rect de pypdf o `getAnnotations()` de pdf.js) y del fondo, y se reproduce el formato A4 595×842. Si solo hay **facsímil en texto vectorial**, se miden con pdf.js las posiciones (`transform`) de cada número de casilla y de las etiquetas en la página del anexo. La caja de importe va a su derecha, donde termina la celda del dibujo (hay que medir también los trazados del operador `re`). Si el facsímil es **imagen o trazados sin texto**, se renderiza la página a 2× y se mide a mano. Las etiquetas literales salen siempre del diseño de registro vigente; la maquetación sale del facsímil.

| Modelo | De dónde sale la maquetación exacta | Qué falta |
|---|---|---|
| **130** | Facsímil BOE-A-2015-1656, pág. 6 (texto vectorial: números 01-19 en x ≈ 434-435). Para el tamaño de las cajas, los /Rect del AcroForm de 2009 (`dato.4` [475.3, 578.6, 564.3, 588.9] … `dato.22`). | Literales de la 13 y la 16 del texto vigente (`DR130e15v12.xls` e instrucciones). Cabecera de 2026, mejor con una predeclaración del dueño (§4). |
| **111** | Facsímil BOE-A-2011-4948, pág. 14 (01 en (271, 523), 28 en (431, 270), 30 en (431, 232)). Cajas: /Rect del AcroForm del 110 (`dato.15` [306.5, 563.9, 370.2, 576.4]). | Confirmar que el impreso web actual es igual al facsímil de 2011, con una predeclaración del dueño. |
| **115** | /Rect del AcroForm de 2002 (`dato.15`…`dato.19`) más literales de `DR115e15v13.xls`. El facsímil del BOE es un escaneo. | Cabecera actual: predeclaración del dueño. |
| **303** | BOE-A-2026-1761, anexo III, págs. 12-17. Comprobar con los ejemplos rellenados del Manual 2026, que tienen la misma rejilla con importes y sirven para colocar las cifras. | Nada imprescindible. Opcional: borrador Pre303 del dueño. |
| **390** | BOE-A-2026-1761, anexo IV, págs. 18-26, más el ejemplo del Manual 2026. | — |
| **131** | BOE-A-2015-1656, pág. 8. | Etiquetas de `DR131_2026.xlsx`. |
| **100 y anexos** | BOE-A-2026-7041, págs. 21-72 (texto vectorial). Las etiquetas salen del diccionario XSD y del catálogo [renta-casillas.json](renta-casillas.json). | La «vista de declaración» de Renta WEB es una lista de las casillas con valor, con la casilla a la derecha: para imitarla, un PDF de Renta WEB Open con datos ficticios. |
| **714** | BOE-A-2026-7041, págs. 77-87, o el proyecto de hacienda.gob.es (más limpio). | — |
| **102** | Modelo102.pdf (AEAT). | — |
| **123, 216, 309, 322, 353, 347, 349, 211, 213, 121, 122, 143, 190, 193** | La página del facsímil citada en las tablas de §1 (texto vectorial). | Etiquetas del diseño de registro. |
| **030, 840** | /Rect de los AcroForm oficiales (vigentes). | El lector necesita «etiqueta encima». |
| **036** | BOE-A-2025-410, págs. 7-18, y un PDF de la predeclaración BU36-M036 con datos ficticios. | Generarlo. |
| **718** | DR718_2025.xlsx más medición a mano del anexo de BOE-A-2026-14011 (trazados sin texto). | OCR o medición. |
| **720, 721, 196, 180, 184, 200, 217** | No hay impreso con casillas: la vista previa será un resumen propio, no una copia. | — |
| **Forales** | Bizkaia 303: BOB, págs. 7-8. Álava 303 y 130: BOTHA. Gipuzkoa 300 y 130: página renderizada del BOG. Navarra: solo diseño de registro. | Bizkaia 130: orden vigente sin localizar. |
| **RETA** | No hay impreso vigente: resumen propio con los datos de Import@ss. | — |

## 4. Documentos que el dueño puede generar

### 4.1 Sin identificarse (públicos, con datos ficticios)

- **Renta WEB Open 2025** (modelo 100): `www2…/PARE-RW25/OPEN/index.zul`. El NIF se teclea pero no se contrasta, y genera un PDF de simulación. Que tenga el mismo formato que el PDF de Renta WEB está NO CONFIRMADO.
- **Simulador del 390** (ejercicio 2025): `www2…/PAIV-M390/E2025/OPEN/index.zul` → «Vista previa» → PDF borrador.
- **Predeclaración del 036**: `www2…/BU36-M036/MOD036/index.zul`. Según su ayuda, sin Cl@ve ni certificado.
- **Predeclaración del 140**: `www2…/DAMA-PRES/F140Pre`.

### 4.2 Identificándose (DNI o NIE con dato de contraste, Cl@ve o certificado)

Ninguno de estos pasos **presenta** una declaración. Generar el PDF de una predeclaración o de un borrador no envía nada a Hacienda: solo surte efecto si se firma y se entrega en un banco u oficina. Aun así, **el PDF lleva el NIF y el nombre del dueño**. No debe subirse al repositorio público tal cual: se usa en local para medir y probar, y si se quiere un fixture, se regenera con importes inventados y se tapan NIF, nombre, número de justificante, CSV y código de barras.

Fuentes: páginas de ayuda técnica de la AEAT de cada predeclaración y de «Consulta de declaraciones presentadas» (comprobadas el 19-10-2026).

| Documento | Para qué | Identificación | Pasos |
|---|---|---|---|
| **Predeclaración del 111** | Impreso vigente del 111 en PDF de la AEAT: maquetación y prueba con un PDF auténtico | DNI + fecha de validez (fecha de expedición si el DNI es permanente) o NIE + número de soporte; solo el titular | Ficha GH01 → «Modelo 111. Ejercicio 2020 y siguientes. Formulario para su presentación (predeclaración)» → identificarse → ejercicio y periodo (p. ej. 2026 3T) → importes inventados (01 = 1, 02 = 1.000,00, 03 = 150,00; 07 = 2, 08 = 2.000,00, 09 = 300,00) → «Validar declaración» → «Seleccionar Ingreso/Devolución» → «A ingresar» sin IBAN → «Generar predeclaración» → descargar el PDF (justificante que empieza por 112). **No llevarlo al banco.** |
| **Predeclaración del 115** | Lo mismo con las casillas 01-05 | Igual | Ficha GH02 → predeclaración → identificarse → ejercicio y periodo → 01 = 1, 02 = 3.000,00, 03 = 570,00 → «Validar» → «Seleccionar Ingreso/Devolución» → «Generar predeclaración» |
| **Predeclaración del 130** | Impreso vigente del 130 (hoy solo hay el AcroForm de 2009) | Igual | Ficha G601 → «Modelo 130. Ejercicio 2026. Formulario para su presentación (predeclaración)» → casillas 01-19 → «Validar» → «Generar predeclaración» |
| **Predeclaración del 131** | Impreso vigente del 131 | Igual | Ficha G602 → «Modelo 131. Ejercicio 2026. Formulario… (predeclaración)» |
| **Borrador del 303 de 2026** | 303 vigente con la casilla 112 | Predeclaración OPEN E2026 (`A303-FWME/E2026/OPEN`): DNI + validez o NIE + soporte. Pre303: Cl@ve o certificado | Ficha G414 → Pre303 o formulario → periodo → rellenar → botón «Borrador» (PDF «no válido para su presentación»). **No pulsar «Presentar».** |
| **Predeclaración del 309** | Impreso del 309 | DNI o NIE + dato de contraste | Ficha G404 → formulario → «Generar predeclaración» |
| **347, 349, 180, 190 (formulario)** | Resúmenes anuales e informativas en PDF de la AEAT | Certificado o Cl@ve | Ficha → «Presentación (hasta 40.000 registros)» → datos inventados → «Validar» → «Vista previa» o «Generar PDF» (sin presentar) |
| **Renta WEB / Patrimonio WEB** | PDF de la declaración real (casillas de 4 cifras; en el 100, a la derecha del importe) | Cl@ve, certificado o número de referencia | Renta WEB → «Vista previa» o «Imprimir» (sale con la marca «Borrador no válido») |
| **Copias de lo ya presentado** (130, 303, 111, 115, 390, 347, 100…) | PDF auténticos con el formato «copia de la declaración». **Llevan datos reales: solo uso privado.** | Certificado, DNIe o Cl@ve (número de referencia para el 100 y el 714) | Sede → «Consulta de declaraciones presentadas» → NIF, modelo, ejercicio y periodo → «Buscar» → «Ver» en «Obtención del justificante» (hoja de presentación con CSV más copia de la declaración) o en «Fichero» (TXT con el diseño de registro) |
| **RETA** | Resolución de alta, recibos y certificado de bases | Cl@ve, SMS o certificado | Import@ss (portal.seg-social.gob.es) → trámite de alta del autónomo, recibos de cotización o informe de bases → descargar el PDF (nombres exactos de menú NO CONFIRMADOS) |

## 5. Lo que no existe (comprobado)

- Ningún PDF oficial rellenable **vigente** del 111, 115, 130, 131, 303, 309, 322, 347, 349, 390, 100, 714 ni 036. Para el 111 no ha existido nunca: solo el del 110.
- Ningún ejemplo público rellenado con datos ficticios del 111, 115, 130, 190, 347 ni 100. Las búsquedas en gestorías, universidades, ayuntamientos y cámaras solo dieron guías web, capturas o material de antes de 2017. El «ejemplo» del 130 de ua.es está en blanco.
- TA.0521 vigente, recibos del RETA o certificado de bases públicos.
- PDF de las instrucciones de 2026 del 303 y del 390; simulador abierto del 390 de 2026.
- Impreso del 130 de Bizkaia localizado; impreso de Navarra en papel desde 2026.
- Modelos **103**, **214**, **215**, **037** y **340**: no existen o están suprimidos.

## 6. Consecuencias para la app (para decidir)

1. **Proteger el lector frente a falsos positivos.** Un 390, un PDF con varios trimestres o un 303, 130 o 300 foral se leen como 303 o 130 estatales sin aviso. Habría que rechazarlos o avisar.
2. **303:** aceptar importes sin decimales; añadir 47-57, 88-99, 107, 112, 125-128 y 500-524/700-735 si se quieren; quitar las casillas que ya no existen; y unir los años partidos («202» + «5»).
3. **115:** normalizar los espacios del título y aceptar etiquetas de 1 dígito, para leer el único impreso oficial que existe.
4. **Fixtures de tests:**
   - generar con pdf-lib PDF propios que imiten la rejilla de los facsímiles (no copiar los de terceros);
   - para el 303, citar el ejemplo oficial del Manual de IVA 2026 con sus cifras;
   - para el 130 y el 111, reproducir la geometría de los AcroForm medidos.
5. Las vistas previas idénticas del 111, 115 y 130 serán exactas cuando el dueño genere una predeclaración vigente (§4.2) y se mida en local.

## 7. Ficheros para importar en la sede (19-10-2026)

La app escribe, en el dispositivo, el fichero de cada modelo según su diseño de registro para que el usuario lo importe en la sede, se identifique y lo presente él mismo. **Finanverso no presenta ni firma nada.** Código: `frontend/src/modules/finances/application/aeatFiles/` (tablas generadas con `frontend/scripts/aeatfiles/extract-designs.py`; escritor y lector de ida y vuelta comparten la misma tabla). Pantalla: «Descargar fichero para la sede», junto a las vistas previas de Autónomos (303, 130, 349, 390) y de las retenciones (111, 115).

| Modelo | Diseño usado | ¿La sede admite el fichero? (ayuda técnica) | Nombre del fichero |
|---|---|---|---|
| 111 | `dr111e16v18.xls` (página 01, 1.000 posiciones) | Sí: botón «Importar», fichero de texto que se ajuste al diseño lógico vigente (`…/ayuda-tecnica/modelo-111.html`) | NIF + ejercicio + periodo + `.111` |
| 115 | `DR115e15v13.xls` (página 01, 500) | Sí: «Importar», fichero «formato BOE» exportado o de programa externo (`modelo-115.html`); el formulario exporta «NIF, ejercicio, periodo y extensión .115» | `.115` |
| 130 | `DR130e15v12.xls` (página 01, 600) | Sí: «Importar» (`modelo-130.html`) | `.130` |
| 303 | `DR303e26v101.xlsx` (páginas 01, 03 y DID; 2026 y siguientes) | Sí: «Importar» en la ventana inicial del formulario 2026 (`modelo-303.html`) | `.303` |
| 349 | `DR_Anexo_349.pdf` (registros tipo 1 y 2 de 500) | Sí: «Importar» del formulario, fichero «formato BOE» (`declaraciones-informativas-ayuda-tecnica/modelos-349-720.html`); más de 40.000 registros, TGVI online | `.349` |
| 390 | `dr390e2025.xlsx` (páginas 1, 2, 2 bis, 3, 4, 6 y, con contenido, 7) | Sí, pero como **«Presentación (con fichero)» → «Leer declaración»**, con los campos **no editables** (`modelo-390/modelo-390-presentacion-mediante-fichero.html`) | `.390` |

**NO CONFIRMADO (hay que probarlo importando un fichero en la sede):**
- Codificación ISO-8859-1 en los ficheros `<T…>` (solo la fijan expresamente los diseños del 349, 347 y 190) y ausencia de salto de línea final.
- 349: separación de registros con CR LF (el diseño no lo dice).
- Campos «Versión del programa» y «NIF empresa desarrollo» del bloque `<AUX>` en blanco (son para entidades desarrolladoras registradas).
- 390 de 2026: el diseño publicado es el de 2025; la app avisa.
- Que la sede acepte la extensión `.111`/`.130`/`.303`/`.390` (la ayuda del 111 habla de «texto plano (.txt)»): si el selector no la admite, basta renombrar.
- Clave de actividad del 390 (letra y dos cifras) y CNAE de 3 caracteres con prorrata: formato comprobado solo contra el diseño.

**Fuera por ahora:** página 2 (régimen simplificado) y 5 (prorratas y sectores diferenciados) del 303; páginas 5 y 8 del 390; 303 de exonerados del 390 (página 4); autoliquidaciones complementarias o rectificativas; modelos 131, 180, 190 y 347 (aún no están en `develop`).
