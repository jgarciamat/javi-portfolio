# Plan de crecimiento de Finanverso (octubre 2026 a junio 2027)

Para: el dueño de Finanverso. Fecha: 20-10-2026. Es un **plan para leer y aprobar: no se ha ejecutado nada** (no se ha publicado, gastado ni cambiado en cuentas).

Reutiliza, sin repetir la investigación: [`informe-tiktok-instagram.md`](informe-tiktok-instagram.md), [`seo-plan.md`](seo-plan.md), [`youtube-plan.md`](youtube-plan.md), [`play-listing.md`](play-listing.md), [`growth-kit.md`](growth-kit.md), [`../informe-calidad-app.md`](../informe-calidad-app.md) y [`../plan-operacion-y-cumplimiento.md`](../plan-operacion-y-cumplimiento.md). No hay un informe de precios de la competencia en `docs/`; los precios de la competencia de §7 salen de una búsqueda rápida y están marcados.

Convención: **[M]** medido hoy, **[F]** fuente externa con fecha, **[S]** supuesto mío (hay que validarlo con datos propios). Todo número sin [M] o [F] es una estimación, no una promesa.

---

## Resumen ejecutivo (media página)

**Recomendación en una línea:** vamos por buen camino en lo **técnico y de contenido** (la base es sólida y está lista antes de la campaña de la Renta), pero **hoy no podemos demostrar que vayamos bien en lo comercial**, porque no medimos nada: ni Search Console, ni embudo, ni registros por origen. La prioridad de las próximas 4 semanas es **medir**, no gastar. **No pagar anuncios ahora; sí una prueba pequeña (≈300 € en total) en abril-mayo de 2027**, y solo si se cumplen unos requisitos (§7.5).

Lo esencial:

1. **Diagnóstico.** Sitio bien montado [M]: 76 URL en el sitemap con `lastmod`, `robots.txt` correcto, JSON-LD en las páginas clave, Lighthouse móvil 83-91 en las páginas públicas (LCP 3,0-4,4 s en 4G lenta simulada). Pero **mis búsquedas no encontraron ninguna página de finanverso.app** ni por marca ni por «modelo 303 casillas» [M, ver §1.2 y sus límites]: hoy es muy probable que estemos fuera de las 100 primeras posiciones. Es normal en un dominio con semanas de vida; no es un fallo, pero hay que decirlo claro.
2. **Cómo ganar usuarios.** El crecimiento serio llega con el **SEO fiscal por fechas** (guías y calculadoras publicadas 4-8 semanas antes de cada plazo), con **vídeos que apuntan a esas guías** y con la **ficha de Play**. Los 199 cortos y 20 largos ya programados son un activo; faltan enlaces, UTM y medición.
3. **Premium.** Con 14 días de Premium al registrarse, el dinero se gana en **tres momentos**: fin de la prueba, primer límite gratis y los picos de la Renta (abril-junio) y de los trimestres (20-abr, 20-jul, 20-oct, 20-ene). Hoy **no hay recuperación al terminar la prueba** [M, informe de calidad D]: es la mejora de mayor retorno.
4. **Esperar o acelerar.** No esperar con el **contenido y la medición** (empezar ya). Sí esperar con el **dinero** hasta tener datos y hasta la Renta. Hitos que justifican acelerar: §4.
5. **Pagar.** Con un Premium de 29,99 €/año, el valor neto de un registro ronda **0,3-0,8 € [S]**. Casi ningún canal de pago llega a ese coste por registro (§7). El único con sentido es **pagar solo por resultado** (afiliación/referidos) y una prueba mínima en Google Ads en abril.
6. **Realismo.** Un objetivo razonable para el proyecto en solitario es **pasar de ≈0 a unos cientos de registros al mes en invierno y a 1.000-3.000/mes en abril-junio [S]**, con un 2-4 % a Premium. Eso son **cientos de euros al mes**, no miles, al menos hasta el segundo año. Quien prometa más está vendiendo humo.

**Decisiones que necesito de ti:**

| # | Decisión | Mi propuesta |
|---|---|---|
| D1 | Verificar Search Console (dominio) y enviar el sitemap esta semana (1 h tuya) | Sí, hoy |
| D2 | Aprobar la analítica respetuosa y el embudo (Plausible/Umami + eventos propios) | Sí; sin banner si no hay cookies |
| D3 | **Muro de registro en las guías**: ahora ocultan casi todo el texto a Google y a quien no tiene cuenta | Abrir 8-10 guías «de captación» enteras y dejar bajo cuenta las calculadoras y los borradores (§1.1) |
| D4 | Quitar el guardado de `mm_acq` antes del registro, o añadir banner (LSSI art. 22.2) | Quitarlo y medir el origen con UTM en el servidor |
| D5 | Recuperación al terminar la prueba (emails/push) | Sí, antes del 20-01-2027 |
| D6 | Presupuesto de pago | 0 € hasta marzo; **300 € máx.** en abril-mayo (§7.5) |
| D7 | Programa de afiliación para creadores (pago por Premium conseguido) | Sí, con tope y contrato simple |
| D8 | Cambiar títulos de los vídeos largos (palabra clave primero) y crear playlists públicas | Sí; yo preparo los textos, tú autorizas |

---

## 1. ¿Vamos por buen camino? Diagnóstico con lo medible hoy

### 1.1 SEO técnico del sitio

| Aspecto | Estado hoy | Fuente | Veredicto |
|---|---|---|---|
| Sitemap | 200 OK, **76 URL**, `lastmod` 18/19-10-2026 | [M] `curl` 20-10-2026 | Bien. El informe de calidad avisaba de desfase; ya está regenerado |
| `robots.txt` | Permite todo salvo `/api/` y rutas de verificación; apunta al sitemap | [M] | Bien |
| Títulos y descripciones | Únicos por página; títulos ≤ 65 y descripción ≈ 150-185 caracteres (la portada y `/pricing` pasan de 155: ajustar) | [M] | Bien, afinar 3-4 páginas |
| Datos estructurados | Portada: `Organization`, `WebSite`, `WebApplication`, `MobileApplication`, `FAQPage` con ofertas reales. Guías: `Article` + `BreadcrumbList`. Calculadora: `WebApplication` | [M] | Bien y sin valoraciones inventadas |
| Core Web Vitals (laboratorio, móvil 4G lenta) | Portada 91 (LCP 3,0 s, CLS 0,026); `/guias` 90; `/calculadora-renta` 83 (LCP 4,4 s) | [M] informe de calidad A.4 | Aceptable; el LCP de la calculadora supera los 2,5 s «bueno» |
| Core Web Vitals reales (campo) | **Sin datos**: no hay Search Console ni CrUX todavía | — | Pendiente |
| Panel con sesión | CLS 0,68 y TBT 560 ms en móvil | [M] | No afecta al SEO (es privado) pero sí a la retención |
| Páginas con muro | Las guías, Hacienda paso a paso y las calculadoras solo muestran H1, introducción y 2 párrafos sin cuenta | [M] `seo-plan.md`, tercera ronda | **Mi mayor duda de SEO**, ver abajo |

**El muro de registro (D3).** El 18-10 se decidió ocultar el texto completo de guías y calculadoras sin cuenta. Es honesto (Google y el usuario ven lo mismo, no es *cloaking*), pero tiene un coste: **menos texto indexable, menos señales de contenido útil y menos enlaces naturales** (nadie enlaza a una página que no puede leer entera). Las guías son justo lo que compite con TaxDown, Quipu o Billin por «modelo 303 casillas». Mi propuesta de equilibrio:

- **Abiertas del todo** (captación): las 9 guías nuevas de intención de búsqueda (Renta 2025 paso a paso, plazos, casillas del 303, alta de autónomo, tarifa plana, VERI*FACTU, IMV, bono social, Bono Alquiler Joven) y 4-5 de «ahorro».
- **Con cuenta**: la **calculadora con datos**, el **borrador**, la lectura del PDF, la comparación casilla a casilla y los PDF. Ahí está el valor del producto.
- Si se mantiene el muro, marcarlo con datos estructurados de contenido restringido (`isAccessibleForFree: false` + `hasPart`) para cumplir con las directrices de Google.
- Medirlo como experimento: 4 semanas con las guías abiertas frente a las 4 anteriores (impresiones, clics, registros).

### 1.2 Posicionamiento actual en Google (comprobado con búsquedas reales)

Hice 6 búsquedas el 20-10-2026: `site:finanverso.app`, «app control de gastos España finanverso», «modelo 303 autónomos cómo rellenar paso a paso», «finanverso borrador renta autónomos app», «finanverso.app guías modelo 303 casillas» y precios de competidores.

| Consulta | ¿Aparece finanverso.app? | Quién sale |
|---|---|---|
| `site:finanverso.app` | **No** (devuelve marcas parecidas: Finanfox, Finverse, Finovera…) | otros |
| «app control de gastos» (con y sin la marca) | **No** | Fintonic, Monefy, BBVA, medios (Expansión, AndroidAyuda, Público, EsDiario) |
| «modelo 303 autónomos cómo rellenar paso a paso» | **No** (ni en la búsqueda con la marca) | TaxDown, Quipu, Billin, Stelorder, Declarando, Billeo |
| «borrador renta autónomos» | **No** | Holded, Declarando, TaxDown, InfoAutónomos, El Debate |

**Límites de esta medición, que hay que decir con honestidad:** la herramienta de búsqueda que usé es de EE. UU., no personalizada para España y no da posiciones. «No aparece» significa «no está en los primeros resultados de esa herramienta», **no** «no está indexada». La **única medida fiable es Search Console** (D1), que no está operativa. Tampoco he podido comprobar la ficha de Play ni el canal de YouTube con datos (visitas, impresiones, CTR): Play Console y YouTube Studio solo los ve el dueño.

**Lectura:** zona «sin posición medible» en consultas de alta competencia. Es lo esperable: dominio nuevo frente a sitios con años de autoridad. Los términos de **cola larga y con fecha** («modelo 130 primer trimestre 2027», «bono alquiler joven 2027 requisitos», «tarifa plana autónomos 2026 80 euros») son donde se puede entrar en 2-4 meses [S].

### 1.3 Ficha de Google Play (ASO)

- Textos propuestos en `play-listing.md` y `seo-plan.md`: título «Finanverso: gastos y la Renta» (29), breve (73) y larga con las palabras clave naturales. Si **los textos propuestos no están ya publicados**, publicarlos requiere tu permiso; **no puedo comprobar la ficha viva sin Play Console**.
- Capturas: 8 de teléfono y 8 de tablet con beneficio escrito, gráfico de cabecera. Bien.
- Falta: **reseñas y valoración** (el motor de crecimiento de Play: sin ellas, la conversión de ficha es baja), y **datos reales** de instalaciones/conversión de ficha [no medibles por mí].
- Riesgo: el nombre de la app cambió desde «Money Manager» (aún hay restos: canal de YouTube «Money Manager» en `youtube-plan.md`, usuario TikTok `@money.manager00`). Para el buscador interesa **unificar la marca** donde se pueda.

### 1.4 YouTube

Hechos [M]: 20 vídeos largos y un plan de playlists y descripciones (`seo-plan.md`, `youtube-plan.md`); los Premium van ocultos y fuera de listas y sitemap. No tengo datos de visitas ni suscriptores. El canal está en **fase de siembra**: lo que cuenta es que cada vídeo lleve a una guía con UTM y que las playlists permitan encadenar visionado.

### 1.5 Veredicto

| Área | Nota | Por qué |
|---|---|---|
| Base técnica web | 8/10 | Todo lo estándar está hecho; falta el campo (CWV reales) |
| Contenido para buscadores | 6/10 | 9 guías nuevas bien dirigidas, pero con muro y sin autoridad ni enlaces |
| Medición | **2/10** | Sin Search Console, sin embudo, sin cohortes; el informe del 14-10 no encontró datos en producción |
| Conversión a Premium | 4/10 | Prueba de 14 días y Stripe/RevenueCat en marcha; sin recuperación de la prueba ni embudo medido |
| Producto para el nicho | 7/10 | Renta y autónomos muy completos; **riesgo de confianza**: ningún fichero probado en la sede y 59 de 62 casos del catálogo reproducidos como tests (55 de los 57 oficiales, 3 de ellos solo en parte; 22-10-2026, ver docs/fiscalidad/auditoria-calculos.md) |

**Conclusión:** buen camino, pero a ciegas. Arreglar la medición cuesta poco y cambia todo lo demás.

---

## 2. Cómo ganar usuarios (web y Play)

### 2.1 Qué canal da qué, a qué velocidad

| Canal | Qué es | Tiempo hasta ver efecto | Coste | Escala |
|---|---|---|---|---|
| SEO programático/guías por fechas | Páginas por plazo y trámite, actualizadas y con fuente oficial | 2-4 meses (cola larga); 6-12 (competitivas) [S] | Tiempo de agentes | Alta, acumulativa |
| Vídeos cortos (199 programados) | Descubrimiento y marca; llevan a guías | Semanas, impredecible | Hecho | Media; picos virales raros |
| YouTube largos | Búsqueda y recomendación de larga vida | 1-3 meses | Hecho (20) | Media-alta en Renta/autónomos |
| ASO de Play | Búsquedas dentro de Play | 2-6 semanas tras publicar texto | 0 | Media |
| Referidos ya existentes | Invitado 1 mes Premium; quien invita hasta 5 | Inmediato pero proporcional a la base | 0 | Baja al principio |
| Alianzas | Creadores, asesores colegiados, comunidades de autónomos | 1-3 meses | 0-bajo | Media |

### 2.2 SEO por fechas (el motor principal)

Principio: **llegar 4-8 semanas antes del pico** y mantener la página con «Actualizado» visible. Calendario de páginas (las marcadas ✔ ya existen):

| Cuándo publicar | Pico de búsqueda | Páginas |
|---|---|---|
| Nov 2026 | Base de cotización autónomos, Black Friday | Cuota autónomos 2027 (cuando salga la norma), calculadora cuota autónomos, método 50/30/20 ✔, suscripciones |
| Dic 2026 | «Antes del 31 de diciembre» (Renta), Navidad | Qué hacer antes del 31-12 para la Renta, aportaciones a planes de pensiones, gastos deducibles de fin de año |
| Ene 2027 | 4T autónomos (111/115 hasta 20-ene; 303/130 hasta 30-ene, previsiblemente lunes 1-feb), 390, 190 | Modelo 303 y 130 del 4T, modelo 390 y 347, calendario fiscal 2027 |
| Feb-Mar 2027 | Prerrenta | Renta 2026: novedades, borrador y cómo pedirlo, deducciones autonómicas por comunidad (366 reglas: **una página por comunidad**, el mayor activo programático), conjunta o individual |
| Abr 2027 (empieza ≈7-8 abr) | Campaña de la Renta | Renta WEB paso a paso 2026, cripto/fondos en Renta, alquileres (cambios del RDL 29/2026 si se convalida), fechas de cita previa y domiciliación (≈25-jun) |
| Abr, Jul, Oct 2027 | Trimestres (20 de cada mes) | 303 y 130 del trimestre: actualizar las mismas URL (no crear nuevas) |

Reglas para que sea programático **sin ser basura**: una página por intención real, texto original, fuente oficial con fecha, un único enlace a su calculadora y al registro, y retirada o fusión de páginas sin impresiones tras 90 días. No generar cientos de páginas casi iguales: Google lo penaliza.

Autoridad (enlaces): pocos y buenos. Notas útiles para medios locales de economía, presencia en foros de autónomos aportando valor, perfiles en directorios de apps (AlternativeTo, AppBrain), 2-3 asesores colegiados que citen la guía. Nada comprado.

### 2.3 Vídeos → web

- Cada vídeo corto: **palabra clave en los 3 primeros segundos**, comentario fijado y enlace de bio al **destino concreto** con `utm_source` distinto por red y por tipo (`tiktok-bio`, `ig-story`, `yt-desc`).
- Los 199 cortos están programados desde el 28-10: **reordenar lo que se pueda** para que el tema coincida con el calendario fiscal (los de Renta y autónomos, cerca de sus plazos; ver `CALENDARIO.md`) sin tocar los ya publicados.
- Medir por vídeo con la hoja del informe de TikTok/IG (§7.2) y detener lo que no mueva visitas.

### 2.4 ASO de Play

Pasos (proponer, no publicar sin tu permiso): aplicar el texto de `seo-plan.md`; notas de versión con palabra clave; pedir valoración **solo tras un buen momento** (mes cerrado en positivo, meta cumplida); responder a todas las reseñas con las plantillas de `play-listing.md`; probar con los **experimentos de ficha** de Play Console (icono, primera captura) cuando haya ≈1.000 visitas a la ficha al mes [S: sin ese volumen no hay significancia]. Objetivo realista: llegar a **20-50 valoraciones en 6 meses** con un 4,3+ [S].

### 2.5 Referidos y alianzas

- Referidos: ya existen (tramos y `/?ref=CÓDIGO`). Acción: fijar un **vídeo al mes**, un aviso dentro de la app tras la primera semana de uso y el enlace en el pie de los emails.
- Alianzas: (1) microcreadores de finanzas/autónomos (2.000-50.000 seguidores) con producto a cambio (Premium vitalicio) y/o afiliación; (2) asesores/gestorías pequeñas que reciben el borrador en PDF de sus clientes (hay un caso de uso natural: «descarga el borrador en PDF para tu gestor»), sin llamar gestor a la app; (3) comunidades de autónomos (según normas de cada una); (4) coworkings y asociaciones de autónomos (ATA, UPTA): charlas o guía conjunta [probar].

---

## 3. Convertir a Premium

### 3.1 Embudo y qué medir

`visita → registro → primer movimiento (o primer borrador) → uso 2.ª semana → límite gratis → vista del paywall → inicio de pago → Premium → renovación`

| Paso | Métrica | Referencia razonable [S] | Mejora principal |
|---|---|---|---|
| Visita → registro | % | 2-5 % desde guías abiertas; 5-10 % desde enlaces de bio | CTA única y destino coherente con el vídeo |
| Registro → primer movimiento | % | 40-60 % | Onboarding por perfil (asalariado/autónomo/inversor) [F en informe de calidad] |
| Primer movimiento → activo a los 7 días | % | 25-40 % | Resumen semanal, push de víspera de cobros |
| Activo → límite gratis | % | 20-35 % | Límites claros y pensados (3/5/2/5/3; Renta: 3 cálculos; autónomos: 1 borrador por trimestre) |
| Límite → paywall → compra | % | 5-15 % del que llega al límite | Mensaje: lo que desbloquea, no lo que prohíbe |
| Registro → Premium de pago | % | **1-3 % en invierno, 3-6 % en campañas de Renta** | Ver §3.2 |
| Retención anual / mensual | % | 55-70 % anual; 30-40 % mensual a 3 meses | Recordatorios de plazos |

El informe de TikTok/IG daba 2-5 % de registros a Premium como objetivo; yo apunto más bajo en invierno por ser una app sin marca, y más alto en abril por la urgencia fiscal.

### 3.2 Palancas, por orden de retorno

1. **Recuperación al terminar los 14 días** (hoy falta): email/push a los días 10, 13 y 15 con **lo que ha hecho en la app** («tienes 4 presupuestos; el plan gratis permite 5 y el análisis con IA se queda fuera») y la oferta anual. Es lo que más mueve el 1-3 %.
2. **Momentos con urgencia real**: aviso de plazos (el 20-01, el 1-02, el 20-04, el 30-06). Es la mejora P0 prevista para antes del 1-01-2027. **Mantener los recordatorios gratis** (decisión ya recomendada) y que el *borrador*, el PDF y la comparación casilla a casilla sean el motivo de pasar a Premium.
3. **Precios (no tocar hasta tener datos).** Hoy: 3,49 €/mes, 29,99 €/año, plan fundador de 59 € de por vida, pase de 10 € para la Renta. Observaciones: el anual sale a 2,50 €/mes (−28 %), correcto; el vitalicio de 59 € es inferior a 2 años de anual: **atrae caja ahora pero rompe el LTV**, así que dejarlo como «fundador» con fecha o cupo real (no inventar escasez). Experimento (cuando haya ≈300 vistas del paywall): enseñar el anual primero frente al mensual primero; subir el anual a 34,99 € solo si la conversión no cae más del 10 %.
4. **Pase de la Renta de 10 €**: encaja con quien solo quiere hacer la declaración en abril-junio. Medir cuántos lo convierten luego en suscripción (objetivo ≥ 10 % [S]).
5. **Pruebas.** Mantener 14 días sin tarjeta (baja fricción, mejora el registro, empeora la conversión a pago). Probar solo **después** de medir: si el registro→Premium es < 1 % con ≥ 500 pruebas terminadas, probar una prueba de 7 días con tarjeta en la web solo para el anual.
6. **Estacionalidad**: Renta (abr-jun) concentra, en mi estimación, entre el 35 y el 50 % del año en registros y conversiones; los trimestres (20-abr/jul/oct/ene) son picos menores pero **recurrentes** y retienen mejor al autónomo. Quien se registra en abril por la Renta es el candidato a suscripción de autónomo en julio: enlaza ambas historias en los emails.

### 3.3 Qué NO hacer

Sin «garantizado», «exacto», «perfecto» ni «tu gestor»; sin cuenta atrás falsa; sin ocultar la renovación automática; sin pedir valoración al abrir la app. La confianza es el producto.

---

## 4. ¿Hay que esperar?

**Respuesta corta:** esperar solo con el dinero, no con el trabajo.

| Fase | Fechas | Objetivo | Gasto | Salida de fase |
|---|---|---|---|---|
| 0. Medir y arreglar | 20-oct a 15-nov-2026 | Search Console, analítica, embudo, UTM, decisiones D1-D5 | 0 € | Se ve el embudo completo en un panel |
| 1. Sembrar | 16-nov a 31-dic | Guías de fin de año, playlists, ASO, primeros 100-300 registros orgánicos [S] | 0 € | ≥ 5 páginas con impresiones; 1 canal con registros medibles |
| 2. Autónomos 4T | 1-ene a 15-feb-2027 | Recordatorios de plazos, recuperación de la prueba, primeras conversiones a Premium | 0 € | Registro→Premium medido sobre ≥ 200 pruebas terminadas |
| 3. Prerrenta | 16-feb a 6-abr | Páginas por comunidad, motor 2026 listo (15-03), alianzas, afiliación | 0-100 € | Motor fiscal verificado en la prueba de casos oficiales; ficha de Play lista |
| 4. Campaña de la Renta | ≈7-abr a 30-jun | Conversión; prueba de pago (300 € máx.) | ≤ 300 € | Resultado de la prueba pagada |
| 5. Reevaluar | 1-jul | Decidir si se escala el pago con datos de abril-junio | — | Informe de LTV real |

**Hitos que justifican acelerar** (cualquiera de estos):

- Un vídeo o canal trae > 50 registros en una semana con ≥ 40 % que completa primeros pasos: duplicar ese formato.
- Registro→Premium ≥ 3 % de forma sostenida sobre ≥ 200 pruebas terminadas: ya hay margen para pagar CAC.
- Una guía llega al top 10 de una consulta de ≥ 1.000 búsquedas al mes: reforzarla y enlazarla desde todas las demás.
- Un creador o medio menciona la app: aprovechar con una página de aterrizaje propia.

**Hitos que obligan a frenar:** los casos oficiales de Renta siguen sin reproducirse (riesgo reputacional), un fichero falla en la sede, o la convalidación del RDL 29/2026 cambia reglas a mitad de campaña. **Hay que traer el tráfico después de que el producto sea fiable, no antes.**

Contexto del calendario [F: `plan-operacion-y-cumplimiento.md`, 20-10-2026]: elecciones el 29-11-2026; el RDL 29/2026 pendiente de convalidación a principios de noviembre; la Orden del modelo 100 aún no publicada (en 2026 el proyecto salió el 26-01). Las fechas de la campaña 2027 (≈7-8 abr a 30-jun, domiciliación hasta ≈25-jun) son **previstas, no oficiales**: no anunciarlas como definitivas.

---

## 5. Explotar el nicho: autónomos y declarantes que odian la gestoría

**Posicionamiento:** *«Prepara tus borradores sin presentar.»* Finanverso **no presenta ni sustituye a un profesional**: te enseña qué mirar, calcula el borrador del 303, 130 o la Renta y deja el fichero o la hoja listos para que tú los presentes en la sede (o se lo des a quien quieras). Palabras permitidas: *borrador, prepara, entiende, revisa, paso a paso, orientativo*. Prohibidas: *perfecto, exacto, garantizado, tu gestor, presentamos*.

| Segmento | Dolor | Mensaje | Producto | Contenido |
|---|---|---|---|---|
| Autónomo con 1 actividad que paga 40-100 €/mes de gestoría (cuota que varía mucho) | Paga por algo que entiende a medias | «Entiende tu 303 y tu 130 en 10 minutos» | Borradores 303/130, libros de facturas, fechas | Vídeos trimestre a trimestre, calculadoras, plantilla de gastos deducibles |
| Autónomo recién dado de alta/tarifa plana | No sabe qué le espera | «Tu primer año, paso a paso» | Alta (guía), tarifa plana, IVA e IRPF trimestral | Guías de alta, tarifa plana, VERI*FACTU |
| Asalariado con alquiler, hijos, cripto o varias comunidades | Teme equivocarse con deducciones | «Mira qué no te sale en el borrador» | Lectura del borrador PDF/XML, comparación casilla a casilla, 366 deducciones autonómicas | Renta por comunidad, cripto en Renta WEB |
| Creador de contenido | No sabe si es autónomo (DAC7, habitualidad) | «Creador y Hacienda sin sustos» | Guía, 130/303 | Vídeos cortos (hueco de poca competencia, §3.3 del informe de TikTok) |
| Persona que huye de TaxDown por el precio | Precio de presentar [F: TaxDown muestra planes de autónomo «desde 49 €/año» en su web, y una reseña de 30-09-2026 cita 29,90 y 59,90 €/mes; las fuentes no coinciden] | «Hazlo tú con guía, por 10 € el pase de la Renta» | Pase de la Renta | Comparativa honesta (sin atacar marcas) |

**Pruebas de confianza** que sí podemos enseñar: fuentes oficiales con fecha en cada guía, exportar o borrar tus datos, cálculo en el dispositivo, sin anuncios. Las que **no** podemos enseñar todavía: «probado en la sede de la AEAT» (cero ficheros probados) y «casos oficiales verificados» (59 de 62 reproducidos en tests el 22-10-2026, 3 solo en parte; falta la revisión de un profesional colegiado). Hasta que cambie, la promesa es *borrador orientativo*.

---

## 6. YouTube: promoción del canal

| Acción | Detalle |
|---|---|
| Títulos | ≤ 70 caracteres, palabra clave primero: «Modelo 303 paso a paso: IVA trimestral para autónomos». Quitar «para tontos» del inicio |
| Descripciones | 1.ª línea: palabra clave + enlace a la guía con UTM (`?utm_source=youtube&utm_medium=video&utm_campaign=vNN`); capítulos; fuente oficial con fecha; aviso «orientativo» |
| Listas públicas | Una por sección (Empieza, App, Hacienda, Autónomos, Renta, Hogar y ayudas). **Premium oculto: fuera de listas y sitemap** |
| Enlaces cruzados | Pantalla final al siguiente vídeo de la lista; tarjeta a la guía; en el comentario fijado, la guía. En la web, vídeo incrustado (ya hecho) |
| Shorts frente a largos | **Shorts**: descubrimiento y suscriptores, poca conversión directa. **Largos**: conversión y búsqueda (la gente que busca «cómo hacer el modelo 303» ve 5-12 min). Plan: ≥ 1 largo al mes por pico (4T, prerrenta, Renta WEB, 1T), 3 Shorts por largo recortados con enlace al largo |
| Calendario | Largo de Renta WEB y deducciones: publicar en marzo (no en abril, que ya es tarde); trimestres: 2-3 semanas antes del día 20 |
| Comunidad | Responder a todos los comentarios las primeras 24 h; usar «Comunidad» para avisos de plazos; pedir suscripción solo una vez |
| Medir | Impresiones, CTR (3-6 % es buen rango en este nicho [S]), retención media, tráfico a finanverso.app con `utm_source=youtube`, suscriptores ganados por vídeo |
| Marca | Unificar nombre del canal con Finanverso (el plan antiguo lo llama «Money Manager») |

---

## 7. ¿Merece la pena PAGAR?

### 7.1 Cuánto vale un usuario (hay que calcularlo con tus datos reales, esto es una hipótesis)

| Concepto | Anual | Mensual | Nota |
|---|---|---|---|
| Precio | 29,99 € | 3,49 € | Con IVA (21 %) [S: asumo precio con IVA incluido] |
| Neto de IVA | 24,79 € | 2,88 € | |
| Comisión (Stripe ≈ 2-3 % o Play ≈ 15 % en suscripciones [S]) | −2 a −4 € | −0,1 a −0,4 € | |
| **Ingreso neto por pago** | **≈ 21-23 €** | **≈ 2,5 €** | |
| Pagos esperados por cliente | 1,5 años [S] | 4-6 meses [S] | |
| **LTV neto por cliente de pago** | **≈ 30 €** | **≈ 12 €** | Mezcla 70/30 → **≈ 25 € [S]** |

Con **2 %** de registro→Premium: **valor por registro ≈ 0,50 €**. Con 1 %: 0,25 €; con 4 %: 1,00 €.
**Coste máximo aceptable por registro (punto de equilibrio) ≈ 0,3-1,0 €**, y para ser rentable de verdad (LTV/CAC ≥ 3), **0,1-0,3 €**.

### 7.2 Canales de pago

| Canal | CAC estimado por registro [S, sin datos propios] | ¿Cubre el equilibrio (≈0,5 €)? | Notas |
|---|---|---|---|
| Google Ads (búsqueda) | 1,5-6 € (clic 0,6-2 € × 5-10 % de conversión a registro); palabras fiscales muy pujadas por TaxDown y otros | **No** en general. Mejor caso: consultas muy específicas en abril con CPC bajo | Sin benchmark español por categoría; fuente genérica: mediana global de CPC 1,61 $ (p25 0,63 $, p75 4,03 $), Synter 1.er semestre 2026 [F] |
| Google Ads de apps (instalaciones de Play) | CPI 1-3 € en Android España; coste por registro 1,5-5 € | **No** | Optimiza instalaciones, no pago; poco volumen inicial para aprender |
| Meta (Instagram/Facebook) | 1-4 €; creatividades de vídeo ya hechas | **No**, salvo creatividad ganadora | Exige verificación de anunciante en finanzas (informe TikTok/IG §6.9) |
| TikTok Ads | 1-3 €; público joven, menos intención fiscal | **No** | Mayores de 18; revisión de anuncios financieros |
| Apple Search Ads | — | **No aplicable** | No hay app en la App Store (solo PWA) [M] |
| Microinfluencers (2k-50k) | 100-500 € por pieza; 20-200 registros por pieza [S] → 1-10 € por registro | **Raramente** | Mejor a cambio de producto o con afiliación |
| **Afiliación/referidos (pago por resultado)** | Coste solo si hay Premium: p. ej. 30 % del primer año ≈ 7 € por cliente | **Sí**, porque no se paga si no vende (7 € frente a un LTV de ≈25 €) | Es el único pago «sin riesgo» |
| Prensa/RR. PP. | 0 € si es gratuita (nota a medios de economía); pagar publirreportajes ≥ 300 € | No como adquisición directa; sirve para autoridad y enlaces | Evitar «contenido patrocinado» disfrazado |

Fuentes de este bloque: informe de TikTok/IG de este repo (políticas, presupuesto de prueba), la búsqueda sobre CPC del 20-10-2026 (Synter 2026-H1, WordStream 2025, Cyberclick, Lionelz; **sin dato español específico de finanzas personales: NO VERIFICADO**) y las páginas de TaxDown citadas en §5. **No hay cifras públicas fiables de CAC en finanzas personales en España**: la única medida válida será la de la propia prueba.

### 7.3 Punto de equilibrio con números

Ejemplo: con un clic a 0,50 € y un 10 % de clics que se registran, el registro cuesta 5 €. Con un 2 % a Premium (LTV ≈ 25 €) el registro vale 0,50 €: **se pierden unos 4,50 € por registro**. Para empatar haría falta, por ejemplo, un clic a 0,05 € o una conversión a Premium del 20 %. Conclusión sin rodeos: **con el precio actual, la publicidad directa de registro no sale rentable.** Se hace rentable solo si: (a) el LTV sube (más planes anuales, más retención), (b) el CAC baja por creatividad o intención muy alta (abril, «borrador renta autónomos»), o (c) se mide por pago y no por registro.

### 7.4 Recomendación

| Pregunta | Respuesta |
|---|---|
| ¿Pagar ya? | **No.** Sin Search Console, sin embudo y con el producto fiscal aún por validar, pagar es tirar dinero |
| ¿Cuándo? | **Abril-mayo de 2027**, con la campaña de la Renta abierta, el producto verificado y ≥ 200 pruebas terminadas medidas |
| ¿Cuánto? | **300 € máx. en total**: 150 € Google Ads (búsqueda, concordancia exacta, 5 consultas) + 150 € Meta o TikTok con el vídeo orgánico ganador. Ajustar a mano, sin reinvertir automáticamente |
| ¿Y antes? | Solo **pagar por resultado**: afiliación (D7) y producto a cambio de reseña/colaboración |

### 7.5 Presupuesto de prueba y criterios de parada

| Campaña | Presupuesto | Duración | Éxito si… | Parar si… |
|---|---|---|---|---|
| Google Ads búsqueda («borrador renta autónomos», «modelo 130 primer trimestre», etc.) | 150 € (≈10 €/día × 15 días) | 2-3 semanas en abril | Coste por registro ≤ 2 € y ≥ 2 % a Premium en pruebas terminadas | Tras 100 clics: coste por registro > 4 €, o rebote > 80 % |
| Meta/TikTok con vídeo orgánico top | 150 € (≈10 €/día × 15 días) | 2 semanas en abril-mayo | Coste por registro ≤ 1,5 € y ≥ 40 % completa primeros pasos | Tras 100 clics: > 3-4 € por registro (criterio del informe de TikTok/IG) |
| Requisitos antes de encender nada | — | — | Analítica con `utm_source=meta-ads`/`google-ads`, embudo visible, política de privacidad al día, cuentas verificadas, textos sin «gestor/perfecto/garantizado» | Si falta alguno, no se enciende |

Regla: **no se aumenta el gasto** hasta que el pago real (no el registro) cubra el coste de la prueba a 60 días. Cripto, forex, promesas de ahorro o rentabilidad: nunca en anuncios.

---

## 8. Calendario de 90 días (20-oct-2026 a 18-ene-2027) y checklist

| Semana | Fechas | Hitos | Responsable |
|---|---|---|---|
| 1 | 20-26 oct | **D1**: verificar Search Console, enviar sitemap, pedir indexar `/`, `/calculadora-renta`, `/videoteca` y las 9 guías; empezar los 199 cortos (28-oct) con enlace/UTM; decisión D3 y D4 | Dueño + `seo` |
| 2 | 27-oct a 2-nov | Analítica y embudo (eventos: registro, primer movimiento, límite, paywall, prueba, pago); `utm_source` por red; hoja de seguimiento de vídeos | `app` |
| 3 | 3-9 nov | Plantillas de email de fin de prueba (días 10/13/15); títulos y descripciones de los 20 largos + playlists públicas | `app`, `seo`, `youtube` |
| 4 | 10-16 nov | Informe de la semana 3 con **primera lectura real**: impresiones, CTR, registros por origen. Fin de Fase 0 | `seo` |
| 5-6 | 17-30 nov | Guías: base de cotización 2027, Black Friday, calculadora cuota autónomos; primer contacto con 5 microcreadores (propuesta personal, una a una) | `seo`, dueño |
| 7-8 | 1-14 dic | «Antes del 31 de diciembre»; ASO: actualizar ficha de Play (con tu permiso); afiliación D7 | `seo`, dueño |
| 9-10 | 15-28 dic | Recordatorios de plazos en producción; vídeo largo del 4T | `app`, `videos` |
| 11-12 | 29-dic a 11-ene | Guías 4T (111/115 hasta 20-ene; 303/130 hasta 30-ene, previsiblemente 1-feb) con «Actualizado»; revisar los recordatorios con tu móvil | `seo`, `gestor-fiscal` |
| 13 | 12-18 ene | Primer informe de conversión a Premium; decisión de pasar a Fase 3 | `seo`, dueño |

**Checklist (marcar al hacer):**

- [ ] Search Console (dominio) verificado y sitemap enviado
- [ ] Bing Webmaster Tools importado
- [ ] Analítica respetuosa sin cookies de seguimiento; `mm_acq` eliminado o con banner
- [ ] Eventos del embudo y panel semanal
- [ ] UTM distintos por vídeo, bio y descripción
- [ ] Decisión del muro (D3) y experimento de 4 semanas
- [x] Recuperación de la prueba (emails/push; el aviso posterior al fin solo por push) activa en `develop` (D5; ver `docs/analitica.md`, «Avisos del fin de la prueba»); pendiente de publicar
- [ ] Recordatorios de plazos activos antes del 1-01-2027
- [ ] Playlists públicas y títulos de los largos corregidos (Premium oculto sigue oculto)
- [ ] Ficha de Play actualizada y respuesta a todas las reseñas
- [ ] 5 colaboraciones propuestas; afiliación aprobada
- [ ] Revisión de las guías cuando se convalide el RDL 29/2026 y salga el calendario 2027
- [ ] Sin «gestor/perfecto/exacto/garantizado» en vídeos, guías y anuncios

### KPI (revisión semanal los lunes, 10 min)

| KPI | Dónde | Meta 30 días | Meta 90 días | Tipo |
|---|---|---|---|---|
| Páginas indexadas / 76 | Search Console | ≥ 60 | ≥ 74 | Realista |
| Impresiones/mes | Search Console | 1.000-5.000 | 10.000-40.000 | [S] |
| Clics orgánicos/mes | Search Console | 30-150 | 300-1.500 | [S] |
| Registros/mes (todos los orígenes) | Backend | 50-150 | 150-500 | [S] |
| % registros que completan primeros pasos | App | ≥ 40 % | ≥ 50 % | del informe TikTok/IG |
| Registro → Premium | App / Stripe / RevenueCat | medir | 1-3 % | [S] |
| Valoraciones de Play | Play Console | 5 | 15-25 | [S] |
| Suscriptores de YouTube | YouTube Studio | +30-100 | +200-600 | [S] |

Los objetivos de redes (seguidores, retención a 3 s, guardados) están en el §7.1 del informe de TikTok/IG; no se repiten.

### Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un error fiscal en un borrador o fichero que el usuario presenta | **Alto**: reputación y confianza | No acelerar tráfico antes de validar casos oficiales; aviso «orientativo»; fuentes con fecha |
| Cambios legales (RDL 29/2026, elecciones del 29-11, Orden del modelo 100 tardía) | Medio | Reglas activables por ejercicio; contenido «previsto» claramente marcado |
| El muro de registro frena el SEO | Medio | D3 y experimento medido |
| Dependencia de TikTok/IG y baneos | Medio | Que cada vídeo lleve a una guía y a un email, no solo a seguidores |
| Pedir reseñas con presión o comprar reseñas | Alto (Play suspende) | Solo tras un buen momento; nunca compradas |
| LSSI/RGPD por `mm_acq`, IA en EE. UU. | Medio | D4; DPA y registro de actividades (bloque 5 del plan de operación) |
| Un solo servidor sin alertas durante un pico | Alto en abril | Monitorización y límites de memoria antes del 15-03-2027 |
| Gastar en anuncios sin medición | Medio | Requisitos de §7.5 |
| Resultados por debajo de lo esperado | Medio | Los rangos son [S]; el plan se corrige con datos de la semana 4 |

### Fuentes y fecha de consulta

- Repo: `docs/informe-calidad-app.md` (20-10-2026), `docs/plan-operacion-y-cumplimiento.md` (20-10-2026), `docs/marketing/informe-tiktok-instagram.md` (19-10-2026), `seo-plan.md` (18-10-2026), `play-listing.md`, `youtube-plan.md`.
- Mediciones propias 20-10-2026: `https://finanverso.app/sitemap.xml`, `robots.txt`, `/`, `/pricing`, `/calculadora-renta` y `/guias/como-hacer-la-renta-2025-paso-a-paso` (códigos HTTP, títulos, JSON-LD).
- Búsquedas web 20-10-2026 (herramienta US-only, sin posiciones): resultados de TaxDown, Quipu, Billin, Stelorder, Declarando, Billeo, Holded, InfoAutónomos, Fintonic, Monefy; [TaxDown precios](https://taxdown.es/precios) y [autónomos](https://taxdown.es/servicios/autonomos); reseña [Getrenn sobre TaxDown](https://getrenn.com/es/blog/taxdown-opiniones) (30-09-2026); [Synter, benchmark CPC 2026-H1](https://syntermedia.ai/benchmarks/2026-h1/google-ads/cpc); [Cyberclick](https://www.cyberclick.es/numerical-blog/cuanto-cuesta-contratar-una-agencia-google-ads-en-espana).
- **No se pudo verificar:** posiciones reales en Google España, datos de Play Console y YouTube Studio, precios en euros de Monefy/Spendee/Fintonic, CAC en finanzas personales en España, tarifas de microinfluencers. Todo lo marcado [S] debe sustituirse por datos propios en cuanto existan.
