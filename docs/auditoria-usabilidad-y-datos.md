# Auditoría de usabilidad y de importar/exportar datos

Fecha: 2026-10-21. Base: `origin/develop` (0375603, v1.60.0). Solo inspección: no se ha cambiado código de la app.
Método: lectura de código (grep y rangos) y recorrido real de la app (frontend en :5955, backend en :3955, base temporal en `/tmp/gf55-db`, usuaria y datos inventados, Chrome con Playwright en 390 px y 1280 px).
Capturas: `/tmp/gf55-shots/` (fuera del repo). Scripts del recorrido: `/tmp/gf55-tools/`.

Reglas que sigue este documento y deben seguir los tickets: la app no presenta ni representa; en la interfaz no aparecen «gestor» ni «NO CONFIRMADO»; nada de «perfecto», «exacto» o «garantizado»; no se tocan los textos legales; los datos de ejemplo son inventados y sin datos personales.

---

## 1. Matriz de cobertura de importar y exportar

Leyenda: SÍ = existe y se usa hoy; PARCIAL = existe en parte (se explica); NO = no existe. «Falta ...» = hueco respecto al objetivo del dueño («toda la aplicación acepta y exporta PDF y CSV»).

Piezas que ya existen (se reutilizan en el plan, apartado 3):

| Pieza | Ruta | Qué hace hoy |
|---|---|---|
| CSV: escribir | `frontend/src/modules/finances/application/hooks/useExportCSV.ts` (`csvCell`, `downloadFile`, `exportMonthCSV`, `exportAnnualCSV`, `exportAllCSV`, `exportReportCSV`, `exportSelectionCSV`) | Descarga CSV con textos en el idioma y la moneda del usuario |
| CSV: leer | `frontend/src/modules/finances/domain/importParsers.ts` (`parseCSV`, `detectDelimiter`, `detectColumns`, `rowsFromCSV`, `parseAmount`, `parseDate`) | Detecta delimitador, columnas, importes y fechas |
| Excel: leer | `frontend/src/modules/finances/application/spreadsheet.ts` (con `fflate`) | Lee .xlsx/.xlsm; CSV/TXT como una hoja; rechaza .xls. NO escribe .xlsx |
| Norma 43: leer | `importParsers.ts` (`looksLikeNorma43`, `parseNorma43`) | Extractos .n43/.q43/.aeb/.txt |
| PDF bancario: leer | `frontend/src/modules/finances/application/bankPdf/` (`index.ts`, `generic.ts`, `ibercaja.ts`, `balance.ts`) | CaixaBank, BBVA, Santander, ING, Revolut, Ibercaja |
| PDF: leer texto | `frontend/src/modules/tools/application/readPdf.ts` (pdfjs-dist, carga perezosa) y `finances/application/taxModelPdf.ts` (`readImportPdf`, `classifyPdf`) | Texto con posiciones; clasifica facturas y modelos |
| PDF: escribir | `jspdf` + `jspdf-autotable` en `tools/application/reportPdf.ts` (informe de inversiones), `finances/application/autonomoPdf.ts` (borrador de autónomos), `taxforms/application/formPdf.ts` (impresos de modelos) | Descarga o compartir con `shared/utils/shareImage.ts` |
| Imprimir | `AnnualReportDialog.tsx` (`window.print()` + `@media print` en `AnnualReportDialog.css`) | Única impresión de pantalla |
| JSON | `SettingsView.tsx` (`exportJson`) → `GET /api/export` (`DataServices.exportAll`) | Copia de los datos de la cuenta |
| Plantillas | `frontend/public/plantillas/` (facturas-emitidas.xlsx, facturas-recibidas.xlsx, modelo-111/115/130/303/349/390-plantilla.pdf) | Enlaces de descarga en `AutonomoImport.tsx` |
| Ficheros AEAT | `finances/application/aeatFiles/*` y `ui/components/SedeFiles.tsx` | Genera ficheros de ancho fijo para la sede (descarga o compartir) |
| Ficheros de otros brokers | `tools/application/investImport.ts`, `tools/domain/invest/{formats,detect,read}.ts`; `ui/renta/invest/InvestImport.tsx` | Entra .csv .txt .xlsx .xlsm .json .pdf (y .csv/.zip del BCE) |

### 1.1 Matriz por sección

| Sección / función | Entra hoy | Sale hoy | Falta | Código / endpoint |
|---|---|---|---|---|
| Mes y movimientos (`monthly`) | CSV, Excel, Norma 43, PDF de 6 bancos (modal «Importar extracto»); alta manual; foto de ticket (OCR, solo imagen) | CSV del mes («Exportar mes (CSV)») y CSV de la selección (acciones en bloque) | **Falta exportar PDF** del mes. **Falta exportar Excel.** **Falta importar el JSON propio** (restaurar copia). Falta importar PDF/foto de otros bancos y de recibos con varias líneas. Falta plantilla CSV descargable de movimientos | `ImportModal.tsx`, `useImport.ts`, `importParsers.ts`, `bankPdf/`, `MonthActions.tsx`, `useExportCSV.ts`; `POST /api/transactions/import`, `GET /api/months/:y/:m` |
| Búsqueda y resultados (`search`) | — (filtros) | **Nada** | **Falta exportar CSV de los resultados** (aunque se pueden seleccionar y exportar a mano) y **PDF** de los resultados; falta «exportar todo lo filtrado» sin seleccionar | `SearchView.tsx`, `TransactionBulkActions.tsx` (solo selección); `GET /api/transactions/search` |
| Balance anual (`annual`) | — | CSV del año («Exportar año (CSV)») | **Falta exportar PDF** del balance (existe PDF por impresión en el informe, no aquí) | `AnnualChart.tsx`, `exportAnnualCSV`; `GET /api/transactions/annual/:year` |
| Informe anual | — | CSV («app.report.csv») y «Imprimir» (`window.print`, el usuario elige «Guardar como PDF») | PDF real descargable con jsPDF (en móvil e Android `window.print` es poco fiable); Excel | `AnnualReportDialog.tsx`; `GET /api/stats/report/:year` |
| Análisis (tendencias, previsión, suscripciones detectadas, patrimonio) | — | **Nada** | **Falta exportar CSV y PDF** de tendencias, previsión y suscripciones detectadas | `AnalysisView.tsx`, `ForecastPanel.tsx`; `GET /api/stats/trends/:y/:m`, `/stats/forecast`, `/stats/subscriptions`, `/stats/net-worth` |
| Presupuestos | — (alta manual) | **Nada** (van dentro del JSON completo) | **Falta exportar CSV/PDF** de presupuesto frente a gasto; falta importar CSV de presupuestos | `BudgetsView.tsx`, `BudgetProgress.tsx`; `/api/budgets`, `/budget/carryover/:y/:m` |
| Metas | — | **Nada** (solo JSON completo) | **Falta exportar CSV/PDF**; falta importar CSV | `GoalsView.tsx`; `/api/goals` |
| Cuentas y transferencias | — (alta manual); el extracto se asigna a una cuenta | **Nada** (solo JSON completo; el CSV de movimientos trae la cuenta) | **Falta exportar CSV/PDF** de cuentas, saldos y transferencias; falta importar cuentas desde CSV | `AccountsView.tsx`, `AccountCards.tsx`; `/api/accounts`, `/api/transfers` |
| Gastos fijos, suscripciones y automáticos | — (alta manual) | **Nada** (solo JSON completo) | **Falta exportar CSV/PDF** de la lista de operaciones automáticas y de las suscripciones; falta importar CSV | `RecurringRulesTab.tsx`; `/api/recurring-rules`, `/api/stats/subscriptions` |
| Alertas personalizadas | — | **Nada** (solo JSON) | Exportar CSV (baja prioridad) | `CustomAlertsTab.tsx`; `/api/custom-alerts` |
| Patrimonio, inversiones y deudas (`assets`) | — (alta manual de activos y valores) | **Nada** salvo JSON | **Falta exportar CSV/PDF** de activos, valores y plan de deudas; falta importar CSV de valores | `AssetsView.tsx`, `AssetsCard.tsx`, `DebtPlanCard.tsx`; `/api/assets`, `/assets/:id/values`, `/assets/:id/terms`, `/stats/net-worth` |
| Inversiones en la Renta (ganancias de brokers/cripto) | CSV, TXT, XLSX/XLSM, JSON, PDF de muchos brokers; CSV/ZIP de tipos de cambio del BCE | PDF del informe de inversiones (`reportPdf`) y guía de Renta WEB | **Falta exportar CSV** de las operaciones leídas y de las ganancias; falta plantilla CSV de operaciones | `InvestImport.tsx`, `investImport.ts`, `RentaWebPanel.tsx`, `reportPdf.ts` |
| Hogar compartido (pareja, gastos compartidos) | — | **Nada** | **Falta exportar CSV/PDF** de deudas y liquidaciones del grupo; falta importar CSV de gastos | `SplitView.tsx`, `HouseholdCard.tsx`; `/api/splits*`, `/api/household*` |
| Categorías y reglas | — (alta manual) | **Nada** (solo JSON) | **Falta exportar e importar CSV** de categorías y reglas de categorización | `CategoryManager.tsx`, `CategoryRulesCard.tsx`; `/api/categories`, `/api/category-rules` |
| Facturas de autónomos | Excel (plantillas emitidas/recibidas), CSV, TXT, **PDF** de factura (lectura con pdfjs); varios a la vez | **Nada** (ni libro ni facturas) | **Falta exportar CSV/Excel del libro de facturas emitidas y recibidas** y PDF del libro | `AutonomoImport.tsx`, `InvoicePdfRow.tsx`, `InvoiceReview.tsx`, `domain/invoiceBook.ts`, `domain/invoiceLedger.ts`, `domain/invoicePdf.ts`; `/api/business/data` |
| Libro de IVA y resúmenes de IVA (`AutonomoVat*`) | (parten de las facturas importadas) | **Nada** | **Falta exportar CSV/PDF** del libro de IVA y de los totales por trimestre/año | `AutonomoVatQuarter.tsx`, `AutonomoVatYear.tsx`, `AutonomoVatResult.tsx`; `GET /api/business/tax/:year` |
| Borradores 303, 130, 111, 115, 349, 390 | Los PDF oficiales de los modelos se leen (`readImportPdf`/`classifyPdf`) para comparar | **PDF** del borrador completo («Prepara tu borrador», `autonomoPdf`, con límite de plan `autonomoPdfs`), **PDF de impreso** de cada modelo (`FormPreview`/`formPdf`), **ficheros de la sede** (`SedeFiles`/`aeatFiles`) | **Falta exportar CSV** de las casillas y cifras de cada modelo; falta importar CSV de casillas. Revisar que 347 y 190 (informativas, `SedeRecords`) tienen la misma salida | `AutonomoDraftResult.tsx`, `autonomoPdf.ts`, `taxforms/*`, `aeatFiles/*`, `SedeFiles.tsx`; `POST /api/business/draft/pdf`, `/business/draft` |
| Renta (modelo 100) y calculadora | Borrador de la Renta: PDF, XML de la Agencia («.txt») y texto (`readDraftFile.ts`, `DraftStep.tsx`); datos de autónomo traídos desde la app | PDF solo de inversiones. **El resultado de la Renta y la calculadora no tienen salida** | **Falta exportar PDF y CSV del resultado de la Renta** (cálculo, comparación con el borrador, optimizador); falta importar CSV de rentas | `RentaWizard.tsx`, `ResultStep.tsx`, `DraftStep.tsx`, `DraftComparison.tsx`, `Optimizer.tsx`; `/api/renta/draft`, `/api/renta/calculation` |
| Calculadoras públicas (`/calculadora-*`) | Escriben los datos a mano | **Nada** | Exportar/imprimir PDF del resultado (útil para compartir) | `modules/tools/ui/*Calculator*.tsx` |
| Informes de salud financiera y asesor IA | — | **Nada** (ni salud, retos, asesor, resumen del mes) salvo imagen de resumen mensual (`RecapShare`) | **Falta exportar PDF** de salud, asesor y resumen del mes; el PDF del resumen mensual solo existe como imagen | `HealthView.tsx`, `AIAdvisor.tsx`, `AskAssistant.tsx`, `MonthRecap.tsx`, `RecapShare.tsx`; `POST /api/ai/advice`, `/ai/ask` |
| Ajustes, perfil y RGPD | Correo entrante de facturas/recibos (`/api/inbox`, `/inbound/email`) | JSON completo y CSV de movimientos («Descargar todo (JSON)», «Descargar movimientos (CSV)»); códigos de recuperación 2FA (descarga) | **Falta exportar un PDF legible** del «mis datos» (útil para personas mayores y para derecho de acceso); falta CSV por tabla (cuentas, categorías, reglas, presupuestos, metas…); **falta restaurar** desde el JSON (no hay importación) | `SettingsView.tsx` (`DataCard`), `TwoFactorSection.tsx`; `GET /api/export`, `DELETE /api/profile/account` |
| Copia de seguridad | Nada para el usuario | Copias del servidor (SQLite backup) para el operador, no para el usuario | **Falta «copia de seguridad» para el usuario**: exportar (JSON, ya existe) e **importar/restaurar** (no existe); no hay recordatorio periódico ni cifrado opcional | `backend/src/infrastructure/backup/BackupService.ts` (solo operador), `DataServices.exportAll` |

### 1.2 Resumen por formato

| Formato | Entra | Sale |
|---|---|---|
| CSV | Movimientos (extractos), facturas de autónomos, operaciones de brokers | Movimientos (mes, año, selección, todo), informe anual. **Nada más** |
| Excel (.xlsx) | Movimientos, facturas, brokers | **Nunca** (no hay escritor .xlsx; `spreadsheet.ts` solo lee) |
| Norma 43 | Movimientos | No aplica (no se exporta) |
| PDF | Extractos de 6 bancos, facturas, modelos oficiales, borrador de la Renta, brokers | Informe de inversiones, borrador de autónomos, impresos de modelos, `window.print` del informe anual. **Nada** en mes, búsqueda, balance anual, presupuestos, metas, cuentas, patrimonio, hogar, salud, Renta |
| JSON | Brokers (formatos de terceros) | Copia completa de la cuenta. **Nunca se importa el propio** |
| Ficheros AEAT | — | Sí (modelos) |

Conteo aproximado: de las funciones de la matriz, solo 8 exportan algo en CSV o PDF (mes, anual, informe anual, selección, ajustes, borrador de autónomos, impresos de modelos, inversiones) y el resto no exporta ni CSV ni PDF (solo salen por el JSON completo). Solo movimientos, facturas, brokers y borrador de la Renta aceptan ficheros de fuera; el resto se escribe a mano.

---

## 2. Inspección de usabilidad

Recorrido real: móvil 390 px y escritorio 1280 px, tema claro; modo «Letra grande» y «Contraste» (solo existen dentro de los asistentes de Autónomos y Renta). Capturas clave en `/tmp/gf55-shots/`:
`m390-02-resumen-mensual.png`, `m390-01-menu.png`, `m390-04-ana-lisis.png`, `m390-05-salud-financiera.png`, `m390-07-cuentas.png`, `m390-09-metas.png`, `m390-14-auto-nomos.png`, `s-01-importar-modal.png`, `s-02-importar-error.png`, `s-03-importar-preview.png`, `s-04-editar-mov.png`, `s-05-confirmar-borrar.png`, `s-06-buscar-vacio.png`, `s-07-autonomos-grande-contraste.png`, `x390-26-ajustes.png`, y las equivalentes `d1280-*.png`.

Resultado medible: carga del panel en 0,9 s en local; sin desborde horizontal salvo la tabla de Análisis; ningún botón sin nombre accesible en los asistentes salvo 2 en Renta; 0 textos en inglés sueltos detectados en el texto visible.

### 2.1 Hallazgos (ordenados por gravedad)

| Id | Hallazgo | Evidencia | Gravedad |
|---|---|---|---|
| U1 | **Exportar e importar está escondido y desigual.** En el mes hay botones grandes, pero en las otras 18 pantallas no hay ninguna acción de descargar. El usuario tiene que saber que «Ajustes → Descargar todo» existe | `m390-02`, `x390-26`; solo 6 componentes usan el icono `download` | Alta |
| U2 | **Importar no dice qué formato esperar ni ofrece plantilla.** El error de un CSV sin columnas reconocibles dice «No se ha podido leer el fichero. Comprueba que es un CSV, Excel, Norma 43 o PDF.» pero no explica las columnas necesarias (Fecha, Concepto, Importe) ni da un CSV de ejemplo; en autónomos sí hay plantillas | `s-02-importar-error.png`, `ImportModal.tsx` | Alta |
| U3 | **El error de importación sale fuera del cuerpo del diálogo**, debajo del recuadro de subida, en rojo y sin icono ni `role="alert"` evidente; el control nativo «Seleccionar archivo» queda a la vista junto al texto del dropzone (dos mensajes para lo mismo) | `s-02` | Media |
| U4 | **Letra grande y Contraste solo en los asistentes** (Autónomos y Renta). No hay ajuste global en Ajustes ni en el menú; una persona mayor que no entre en esos asistentes no los descubre | `Wizard.tsx` líneas 65 a 101; `x390-26-ajustes.png` (Ajustes solo tiene Aspecto claro/oscuro) | Alta |
| U5 | **Tour inicial de 32 pasos** que tapa el panel en el primer inicio de sesión; existe «Saltar el tour» y «No volver a mostrar», pero 32 pasos es mucho para una primera visita y «Saltar» compite con el texto del mismo párrafo | `m390-after-skip.png`, `tourSteps.ts` | Media |
| U6 | **Borrado inconsistente**: borrar un movimiento abre un diálogo propio con «no se puede deshacer», pero el borrado en bloque sí tiene «Deshacer» durante unos segundos. Otros 6 ficheros usan `window.confirm` nativo (InvestCard, InvestImport, Wizard, InboxCard, SplitView, SettingsView) con otro aspecto y sin letra grande | `ConfirmDeleteModal`, `app.bulk.undo.action`, grep `window.confirm` | Media |
| U7 | **Estados vacíos desiguales.** Bien: Metas («Todavía no tienes metas. ¡Crea la primera!» con el formulario debajo), Primeros pasos con progreso. Mal: Análisis («No hemos detectado suscripciones…» sin decir qué hacer), búsqueda sin resultados («No hay movimientos con esos filtros.» sin botón «Quitar filtros»), Cuentas («Crea al menos dos cuentas para poder transferir» sin botón de crear arriba), Presupuestos y Alertas sin ejemplo | `m390-04`, `s-06`, `m390-07` | Media |
| U8 | **Sin «¿qué hago ahora?» tras completar acciones**: tras importar o crear una meta no se propone el paso siguiente (por ejemplo «Ponle un presupuesto a esta categoría»). Los asistentes de Autónomos y Renta sí lo hacen («Te quedan unos 22 minutos, sin prisa») | `m390-14`, `s-03` | Media |
| U9 | **Tabla de Análisis recortada en móvil**: la columna «VS ANTERIOR» se corta y la página desborda en horizontal | `m390-04-ana-lisis.png`, auditoría `overflowX: true` | Media |
| U10 | **Formulario de metas**: el desplegable de categoría muestra «Crear una categoría con el no…» cortado; el icono de la meta aparece solo como emoji sin texto | `m390-09-metas.png` | Baja |
| U11 | **Accesibilidad básica**: no hay enlace «Saltar al contenido» (`skip=false`); los dos campos de fecha de la búsqueda («Desde/Hasta») se anuncian solo como «date»; 1 `input type=date` oculto sin etiqueta (decorativo, con `aria-hidden`); en Renta hay un enlace sin texto y un botón «Leer el texto» sin contexto; casilla «Recordarme» y «Resumen semanal» con la etiqueta lejos de la casilla; objetivos táctiles menores de 36 px: 39 de 90 controles en el mes y 29 de 55 en el balance anual (los meses y botones «Ir»). Se mantiene un contorno de foco visible en las primeras 10 paradas del teclado | `scen.mjs` (TAB ORDER), `_audit-m390.json` | Media |
| U12 | **Textos técnicos para personas mayores**: «Saldo disponible… Acumulado meses anteriores», «Tasa de ahorro», «Sobre 1850,00 € ingresado», «Norma 43», «casilla 0030», «Renta WEB», «modelo 303/130/111/115/349/390». Los asistentes explican algunos con «¿Qué es esto?» y «Leer en voz alta», pero el resto de la app no tiene ayuda contextual | `m390-02`, `m390-14` | Media |
| U13 | **Ayuda contextual solo en los asistentes.** En Cuentas, Presupuestos, Metas, Gastos fijos y Patrimonio no hay «¿Qué es esto?» ni enlace a la videoteca de esa pantalla, aunque existe `/videoteca` y la guía de Hacienda | `x390-23..26`, menú | Media |
| U14 | **Guardar/Cancelar consistente en edición de movimientos** («Guardar cambios»/«Cancelar») pero distinto en alta («Guardar transacción»/«Cancelar»), en metas («Crear meta»), en cuentas («Añadir cuenta»); el modal de importar cierra con «Cerrar» y no «Cancelar». Los iconos van a veces con emoji (⬇️, ➕, ▶️, 🚪) y a veces con el icono de la librería (`Icon`), lo que cambia el aspecto y la lectura en voz alta | `s-04`, `x390-26` | Baja |
| U15 | **Nombres mezclados «transacción» y «movimiento»** en botones y títulos («Nueva transacción», «Transacciones (5)», «movimientos leídos») | `m390-02`, `s-03` | Baja |
| U16 | **Mensaje de límite de intentos** «Demasiados intentos. Espera un poco y vuelve a probar.» no dice cuánto esperar (la API devolvió `RATE_LIMITED`) | prueba real en `/api/auth/login` | Baja |
| U17 | **Atajos de teclado**: casi no hay (solo flechas en el tour y Escape en diálogos). No hay atajo para «Nuevo movimiento», «Buscar» ni «Exportar» | grep `keydown` solo en `BulkSelection`, `Pager`, `useDialog` | Baja |
| U18 | **Rendimiento percibido**: bueno (0,9 s en local, menú con trozos cargados bajo demanda). Los PDF y la lectura de .xlsx se cargan al usarse (bien), pero no hay indicador de «Leyendo extracto…» más allá del texto «leídos» | `s-03`, `readPdf.ts` | Baja |
| U19 | **Idioma**: el control nativo «Seleccionar archivo» sale con el idioma del navegador, no el de la app (se ve distinto a los textos de Finanverso); en inglés (`en.json`) hay las mismas 4870 claves que en español: no se detectan textos mezclados en el recorrido en español | `s-02`, `locales/*.json` | Baja |

### 2.2 Lo que está bien (conservar)

- Menú agrupado y con etiquetas claras (Resumen, Mi dinero, Hacienda y trabajo, Aprender, Cuenta), con iconos y colores por grupo.
- Los asistentes de Autónomos y Renta: pasos bloqueantes, tiempo estimado, «Leer en voz alta», «¿Qué es esto?», «Empezar de nuevo», avance guardado solo.
- Importar sin duplicados y con vista previa antes de guardar (`s-03`), y con aviso de que el fichero se lee en el dispositivo.
- «Primeros pasos» con barra de progreso y opción «Ocultar».
- Etiquetas de accesibilidad en acciones repetidas («Editar: Cine», «Eliminar: Cine», «Seleccionar: Gasolina»).

---

## 3. Priorización y plan

### 3.1 Mejoras ordenadas por impacto/esfuerzo

P0 = ya y barato, alto impacto. P1 = siguiente. P2 = después. P3 = cuando haya hueco.

| Prio | Ticket | Qué hacer | Esfuerzo | Dónde |
|---|---|---|---|---|
| P0 | T1 Botón «Exportar CSV» en todas las pantallas con tabla | Un componente `ExportButtons` reutilizable (CSV ahora, PDF cuando exista) que reciba columnas y filas; ponerlo en Búsqueda (todo lo filtrado), Cuentas, Presupuestos, Metas, Gastos fijos, Patrimonio, Gastos compartidos, Análisis, Categorías y reglas, Facturas y libro de IVA | M | `useExportCSV.ts` generalizar con `exportRowsCSV(name, head, rows)`; vistas en `modules/finances/ui/views/` |
| P0 | T2 Plantilla CSV descargable en «Importar extracto» y en el aviso de error | Botón «Descargar plantilla CSV» + texto «Columnas: Fecha, Concepto, Importe»; el error muestra qué faltaba | S | `ImportModal.tsx`, `frontend/public/plantillas/movimientos.csv` |
| P0 | T3 Letra grande y Contraste globales | Mover los dos ajustes a Ajustes y al menú («Aspecto»), guardados en el dispositivo; los asistentes los siguen mostrando | M | `Wizard.tsx` (extraer a `core/theme`), `SettingsView.tsx` |
| P0 | T4 Restaurar copia desde el JSON propio | «Importar copia de seguridad (.json)» con vista previa y modo «añadir sin duplicar»; la copia hoy no se puede volver a meter | L (toca datos: escalar a `experto`) | `SettingsView.tsx`, nuevo `POST /api/import` (backend) |
| P1 | T5 PDF del balance anual, del mes y de la búsqueda | Misma tabla que el CSV vía `jspdf-autotable` | M | nuevo `finances/application/tablePdf.ts` reutilizando estilos de `reportPdf.ts` (`PDF_COLORS`, `winAnsi`) |
| P1 | T6 Informe anual: PDF descargable real, no `window.print` | `buildAnnualReportPdf` con jsPDF + `shareImage` (descarga en escritorio, compartir en móvil) | M | `AnnualReportDialog.tsx` |
| P1 | T7 Resultado de la Renta: PDF y CSV | Resumen de cálculo, comparación con el borrador y ahorro posible; sin promesas de exactitud | M | `ResultStep.tsx`, `DraftComparison.tsx` |
| P1 | T8 Facturas y libro de IVA: exportar CSV/Excel/PDF | Libro de emitidas y recibidas y totales por trimestre | M | `domain/invoiceBook.ts`, `AutonomoVat*.tsx` |
| P1 | T9 Borradores 303/130/111/115/349/390: CSV de casillas | Una fila por casilla y valor, junto al PDF actual | S/M | `AutonomoDraftResult.tsx`, `taxforms/application/formView.ts` |
| P1 | T10 Estados vacíos con guía | Un texto y un botón de acción en Análisis, Búsqueda («Quitar filtros»), Cuentas, Presupuestos, Alertas | S | `EmptyState.tsx` ya existe: usarlo |
| P1 | T11 Unificar el borrado | `ConfirmDeleteModal` en lugar de `window.confirm`; «Deshacer» durante unos segundos también en borrado individual | M | los 6 ficheros de `window.confirm`, `TransactionTable.tsx` |
| P2 | T12 Salud, asesor IA y resumen del mes en PDF | Con `jspdf` y gráfico simple; texto IA marcado como orientación | M | `HealthView.tsx`, `AIAdvisor.tsx`, `RecapShare.tsx` |
| P2 | T13 Importar PDF de más bancos y de facturas | Nuevos parsers (Sabadell, Unicaja, Kutxabank, Openbank, N26, Bankinter, Abanca); facturas con varias líneas | L | `bankPdf/index.ts`, `taxModelPdf.ts` |
| P2 | T14 Excel de salida | Escritor .xlsx mínimo con `fflate` (ya instalado) o exportar CSV con BOM abierto en Excel; elegir una vía | M | `spreadsheet.ts` |
| P2 | T15 Ayuda contextual en pantallas | «¿Qué es esto?» y enlace al vídeo de la pantalla (mapa pantalla a vídeo en `/videoteca`) | M | `DashboardPage.tsx`, vistas |
| P2 | T16 Accesibilidad | Enlace «Saltar al contenido»; `aria-label` en fechas de búsqueda; objetivos táctiles de 44 px en meses y «Ir»; enlace y botón sin nombre en Renta; `role="alert"` en errores de importación | M | varios |
| P2 | T17 Tabla de Análisis en móvil | Tarjetas apiladas o desplazamiento con sombra, sin romper la página | S | `AnalysisView.tsx` |
| P3 | T18 Importar CSV de presupuestos, metas, categorías, reglas, cuentas, gastos fijos | Con las mismas plantillas | L | varias |
| P3 | T19 Tour más corto | 6 a 8 pasos esenciales y el resto por pantalla | M | `tourSteps.ts` |
| P3 | T20 Botones y nombres | Homogeneizar «Guardar/Cancelar», «movimiento» vs «transacción», emoji frente a `Icon` | S | `locales/*.json`, vistas |
| P3 | T21 Atajos | «n» nuevo movimiento, «/» buscar (desactivables) | S | `DashboardPage.tsx` |
| P3 | T22 Copia de seguridad guiada | Recordatorio mensual «Descarga tu copia», con cifrado opcional | M | `SettingsView.tsx` |

### 3.2 Plan en olas para cerrar el hueco PDF y CSV

**Ola 1. Exportar CSV en todo lo que tenga tablas** (T1, T9 parcial, T2)
- Reutilizar: `useExportCSV.ts` (`csvCell`, `downloadFile`), ahora con una función genérica por filas.
- Componente único de botones de exportación para que todas las pantallas se vean igual (arregla U1 y U14).
- Pruebas: 100 % de cobertura en el frontend; un test por pantalla que compruebe nombre de fichero y cabeceras en el idioma elegido.

**Ola 2. PDF de todo lo que se imprime** (T5, T6, T7, T12)
- Reutilizar: `jspdf` y `jspdf-autotable` con carga perezosa (patrón de `reportPdf.ts` y `autonomoPdf.ts`), `shareImage.ts` para descarga o compartir, estilos `PDF_COLORS` y `winAnsi` (caracteres españoles).
- Sustituir `window.print` por PDF real; mantener la impresión como atajo.
- Cuidado con límites de plan (`autonomoPdfs` ya cuenta PDF de autónomos): decidir qué PDF son libres y cuáles de pago.

*Hecho (ola 1B: T5 y T6).* `finances/application/tablePdf.ts` hace el PDF de cualquier tabla con las mismas filas que su CSV (cabecera con Finanverso, título, fecha de generación y periodo, «Página X de Y», importes con signo y color que se leen también en blanco y negro, apaisado con más de seis columnas); `annualReportPdf.ts` hace el del informe anual (totales, gráfico de barras, meses, trimestres y categorías) y la impresión queda como botón secundario. Estos PDF son libres en todos los planes y no cuentan en `autonomoPdfs`. Ficheros `finanverso_<pantalla>_<fecha>.pdf`.

| Pantalla | PDF | Por qué |
|---|---|---|
| Mes (movimientos y totales), Balance anual, Informe anual | Sí | Lo que se imprime o se envía |
| Búsqueda (todo lo filtrado, con totales y fechas del filtro) | Sí | Igual que su CSV, no solo la página |
| Cuentas, Transferencias, Presupuestos, Metas, Gastos fijos | Sí | Listados que se leen como tabla |
| Tendencias, Evolución del patrimonio, Suscripciones, Inversiones y deudas, Gastos compartidos | Sí | Tablas de consulta |
| Categorías y Reglas | No, solo CSV | Son ajustes para guardar o editar, no para imprimir |
| Facturas, libros de IVA y casillas de los modelos | No (sin cambios) | Son de Autónomos, que ya tiene sus PDF y su límite |

**Ola 3. Importar PDF de otros bancos y de facturas** (T13, T4, T18)
- Reutilizar: `readPdf.ts` (pdfjs), `taxModelPdf.ts` (`tokensFromPdf`, `classifyPdf`), `bankPdf/` (patrón `generic.ts` y `ibercaja.ts` y la comprobación de saldo `balance.ts`).
- Cada banco nuevo = un parser y un fichero de prueba con datos inventados.
- Restaurar JSON propio (T4): requiere backend nuevo; pasar a `experto`.

**Ola 4. Plantillas descargables** (T2, T18, T14)
- Reutilizar: carpeta `frontend/public/plantillas/` y el listado de plantillas de `AutonomoImport.tsx` (patrón de enlaces `download`).
- Añadir `movimientos.csv`, `presupuestos.csv`, `metas.csv`, `categorias.csv`, `cuentas.csv`, `gastos-fijos.csv` con 2 o 3 filas inventadas.
- Excel de salida (T14) con `fflate` o CSV compatible con Excel (punto y coma y BOM).

### 3.3 Qué no se debe tocar

- Textos legales (términos, privacidad, cláusulas de contratación).
- La política de no presentar ni representar: los botones nuevos solo descargan, nunca envían a la sede.
- Los textos nuevos evitarán «gestor», «NO CONFIRMADO», «perfecto», «exacto» y «garantizado».

---

## 4. Límites de esta inspección

- El recorrido móvil y de escritorio se hizo en tema claro; el modo oscuro y los tamaños de letra del sistema operativo no se revisaron a fondo.
- «Perfil» no se pudo abrir de forma fiable con el script; queda por revisar a mano.
- No se probó un lector de pantalla real; los datos de accesibilidad vienen del árbol del DOM.
- La matriz se basa en el código de `origin/develop` a 2026-10-21; no se ejecutaron los endpoints de exportación de borradores con datos reales.
