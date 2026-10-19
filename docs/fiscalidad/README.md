# Fiscalidad: mapa de modelos, casillas y cobertura de Finanverso

> **Aviso:** información orientativa, **no asesoramiento fiscal**. Las normas cambian y esta documentación puede contener errores. Verifica siempre en la fuente oficial (Agencia Tributaria, BOE, Seguridad Social) antes de tomar decisiones o presentar una declaración.
>
> **Fecha de comprobación:** 19-10-2026. **Ejercicio de referencia:** IRPF 2025 (campaña de 2026); modelos de autónomo y RETA de 2026.

## Contenido

| Documento | Qué es |
|---|---|
| [modelos.md](modelos.md) | Inventario de los modelos tributarios y de Seguridad Social de una persona física, un autónomo (estimación directa o módulos), un inversor o arrendador, y los casos especiales que quedan fuera. Incluye plazos de 2026, normas, obligatoriedad, relaciones entre modelos y si la app los trata. |
| [renta-casillas.md](renta-casillas.md) · [renta-casillas.json](renta-casillas.json) | Catálogo de las **2.205 casillas** de 4 cifras y las **70 de identificación** del modelo 100 de Renta 2025, sacado del impreso oficial del BOE: apartado, página, tipo, fórmula impresa, normas, dependencia autonómica y confianza de la etiqueta. |
| [cobertura.md](cobertura.md) · [cobertura.json](cobertura.json) | Mapa entre ese catálogo y el código de la app: qué casillas calcula, lee, cubre en parte o no soporta, con porcentajes por apartado y por modelo; **24 discrepancias** con la norma ordenadas por gravedad, y las cifras fijas comprobadas. |
| [documentos-oficiales.md](documentos-oficiales.md) · [documentos-oficiales.json](documentos-oficiales.json) | Qué documento oficial existe de cada modelo (rellenable, facsímil, diseño de registro), la mejor fuente para las vistas previas, fallos del lector de PDF y qué PDF puede generar el dueño identificándose. |
| [hoja-de-ruta.md](hoja-de-ruta.md) | Propuesta priorizada (14 bloques con esfuerzo S/M/L/XL) para llegar a una Renta y unos modelos de autónomo lo más completos posible, cómo validarlos y qué textos usar para no prometer de más. |

## Metodología

1. **Fuentes primarias** (citadas con URL en cada documento):
   - el BOE: Orden HAC/277/2026 con el impreso del modelo 100 de 2025, el texto consolidado de la Ley 35/2006 del IRPF, la Orden PJC/297/2026 de cotización y la Ley 20/2007 del Estatuto del Trabajo Autónomo;
   - la sede de la AEAT: Manual práctico de Renta 2025, calendario del contribuyente 2026, fichas de procedimiento de cada modelo e instrucciones del 303 y del 130.
2. **Extracción del impreso:** el PDF del BOE se leyó con `pdfjs-dist` (el del propio `frontend/node_modules`) mediante scripts temporales **fuera** del repositorio. Las casillas, etiquetas y fórmulas proceden del texto impreso. Cuando la asociación etiqueta-casilla es dudosa (celdas de tabla), se marca `confianza_etiqueta: "baja"`.
3. **Lectura del código** de la app, solo lectura, y clasificación casilla a casilla (ver el método en [cobertura.md](cobertura.md)).
4. **Contraste de cifras:** cada cifra fija de la app se comparó con el artículo o la tabla oficial. Las 15 escalas autonómicas se compararon tramo a tramo con el Manual.
5. **Regla de prudencia:** lo que no se pudo comprobar en una fuente oficial lleva la marca **«NO CONFIRMADO»**. No se ha inventado ningún número de casilla ni ninguna fórmula.
6. **Privacidad:** se consultó un borrador real **solo** para entender cómo imprime el borrador las casillas. No se ha copiado ningún dato personal (nombres, NIF, IBAN, referencias catastrales ni direcciones) en estos documentos.

## Resultados en una frase

- **Modelo 100:** la app cubre (calculado o leído) el **29,7 %** de las casillas de importe del núcleo del asalariado, y el 46,3 % contando las parciales. Del modelo entero cubre el 3,8 % (25,5 % con parciales, sobre todo por el anexo B de deducciones autonómicas). No trata actividades económicas, ganancias patrimoniales detalladas ni regímenes especiales.
- **Autónomo:** 130 al 68 % (sección I), 303 al 21 %, 111 al 40 %, 115 al 100 % y RETA 2026 correctos; 390, 190 y 347 solo con el plazo.
- **Discrepancias más graves:** mínimo por discapacidad sin los gastos de asistencia; aportación propia a planes sin el límite de 1.500 €; resultado sin restar los abonos anticipados (140/143); mínimo de mayores de 65 en Baleares; ventas sin IVA en la casilla 150 del 303.

## Cómo actualizar cada año

Calendario aproximado y pasos (en orden):

1. **Diciembre-enero:** cotización del RETA y del régimen general (orden anual de cotización en el BOE) y módulos (orden de estimación objetiva del año). Actualizar `reta2026.ts` (y su espejo en el backend) y las cifras de [modelos.md](modelos.md).
2. **Enero:** calendario del contribuyente del nuevo año (sede AEAT → *Calendario del contribuyente*). Revisar los plazos de [modelos.md](modelos.md) y de `deadlinesFor`.
3. **Enero-marzo:** proyecto y orden de modelos de IRPF y Patrimonio del ejercicio anterior (BOE, normalmente en marzo). Volver a generar el catálogo:
   - descargar el PDF de la orden y extraer el anexo I con los scripts de extracción (posición de cada número de casilla y texto a la izquierda o encima; ver el apartado «Método» de [renta-casillas.md](renta-casillas.md));
   - comparar con el JSON del año anterior: casillas nuevas, desaparecidas o con otro texto. Por ejemplo, la 0414 (deducción por rendimientos del trabajo) responde a la DA 61.ª, que según el texto consolidado del BOE se añadió el 25-7-2025. Las 0058/0237 (actividades artísticas excepcionales, DA 60.ª) se presentaron como novedad de 2025 en resúmenes no oficiales del proyecto de orden: NO CONFIRMADO con fuente oficial.
4. **Abril (inicio de la campaña):** Manual práctico del ejercicio. Revisar las escalas autonómicas, los mínimos autonómicos y las deducciones (capítulos 14, 15 y 17), además de la DA 61.ª y los cambios del texto consolidado de la LIRPF (historial de versiones de cada artículo).
5. **Tras cada cambio:** volver a ejecutar la clasificación de cobertura, actualizar los porcentajes de [cobertura.md](cobertura.md) y cerrar o abrir discrepancias.
6. Cambiar en todos los documentos la **fecha de comprobación** y el ejercicio de referencia.

**Cambios ya conocidos para los próximos ejercicios** (detalle en [cobertura.md](cobertura.md), D22-D24):
- Deducción por rendimientos del trabajo de 2026: 590,89 €.
- Nuevas reducciones del alquiler de vivienda (art. 23.2) desde octubre de 2026.
- Imputación de inmuebles por escala desde 2027.
- Deducción por autoconsumo renovable de 2026 (DA 62.ª).

## Convenciones

- Casillas siempre con 4 cifras (`0003`), salvo las de identificación del impreso (`10`, `70`), que en el borrador aparecen como `0010`, `0070`.
- «LIRPF» es la Ley 35/2006; «RIRPF», el RD 439/2007; «LIVA», la Ley 37/1992; «LGSS», el RDLeg 8/2015; «LETA», la Ley 20/2007.
- Los JSON se validan con `python3 -m json.tool`.
