# Meter datos sin pereza (sin Open Banking)

Estado: en `develop` (octubre de 2026). Nada de esto está publicado hasta que se haga una versión.

## 1. Importar es gratis e ilimitado

- `backend/src/domain/services/plans.ts`: `imports: Infinity` en todos los planes. Se mantiene el
  recurso `imports` en la API para que las apps ya instaladas lo lean como «ilimitado» (`null`).
- Protección anti-abuso, sin mostrarse como límite de plan: cuerpo JSON de 4 MB, 5.000 filas por
  envío (`MAX_IMPORT_ROWS`) y 60 envíos por hora y usuario en `POST /transactions/import`
  (una vista previa y una importación son dos envíos).

## 2. Pegar texto

`frontend/src/modules/finances/domain/pastedMovements.ts` lee listas copiadas de la app o la web del
banco: una línea por movimiento o bloques (día, concepto, importe), fechas «12/10/2026», «12 oct»,
«12 de octubre», «Oct 12», «hoy», «ayer»; importes «-12,50 €», «+1.800,00», «€45.30», «45,30-».
Si el texto es una tabla con cabecera (tabuladores o «;»), se lee como un CSV con sus columnas.
Las filas se pueden corregir o quitar antes de la vista previa; los duplicados los marca el servidor
igual que con un fichero (misma fecha, importe y concepto).

## 3. Captura de pantalla

- Todo en el dispositivo: `frontend/src/modules/finances/application/ocr.ts` pasa la imagen a gris
  (y la invierte si es un tema oscuro), la lee con Tesseract (`public/ocr`, datos `spa`) y vuelve a
  juntar en una línea lo que el OCR lee como dos columnas (concepto a la izquierda, importe a la
  derecha). La imagen no se envía a ningún servidor; en la app de Android solo se descargan de
  finanverso.app los ficheros del lector (unos 6 MB la primera vez).
- En el ordenador: arrastrar la imagen al importador o pegarla con Ctrl/Cmd+V.

### Prueba con datos reales de OCR

Tres capturas inventadas de apps bancarias (390 px de ancho, 2x y 3x), leídas con el mismo
Tesseract y datos que la app. Las líneas que devolvió el OCR están en
`frontend/src/__tests__/finances/fixtures/ocrScreenshots.ts` y los tests comprueban el resultado.

| Diseño                                                           | Movimientos | Bien leídos | Notas                                    |
| ---------------------------------------------------------------- | ----------- | ----------- | ---------------------------------------- |
| Claro, día encima de cada bloque, importe a la derecha           | 9           | 9           | —                                        |
| Oscuro con iconos, fecha debajo del concepto                     | 6           | 6           | Un concepto con una letra mal («Maptre») |
| Columna de día partida («25» / «OCT») y saldo debajo del importe | 6           | 6           | El saldo se reconoce porque cuadra       |

Sin el paso a gris e invertido, la captura oscura daba 0 de 6 (el OCR leía iconos y texto como
basura), y sin volver a juntar las columnas, 0 de 6 en el diseño oscuro y 0 de 6 en el de saldo.

Además, un e2e (`frontend/e2e/import.spec.ts`) genera una captura en Chrome y la lee con el OCR real
del navegador (unos 2-3 s por captura una vez descargado el lector).

Límites conocidos: fotos de pantalla torcidas o con reflejos, capturas muy pequeñas (menos de unos
300 px de ancho) y diseños donde el importe no está en la misma fila ni justo debajo del concepto.
Por eso las filas son siempre editables antes de importar, y si no se encuentra nada se sugiere pegar
el texto.

## Pendiente

Se completa en los siguientes apartados de este documento.
