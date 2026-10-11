# Money Manager — kit de crecimiento

Textos listos para copiar. Reglas: ser honesto (somos un proyecto pequeño, un desarrollador), no hacer
spam, no prometer rentabilidades, y publicar solo donde las normas de la comunidad lo permitan.

## 1. Ficha de Google Play (ASO)

**Título (30 car.):** `Money Manager: Gastos`
Alternativas: `Gastos y Presupuesto – MM` · `Money Manager Ahorro`

**Descripción corta (80 car.):**
`Controla tus gastos, crea presupuestos y ahorra más. Simple, en español y privada.`

**Descripción larga:**

> Money Manager te ayuda a saber a dónde se va tu dinero y a ahorrar más cada mes, sin hojas de cálculo.
>
> ✔ Registra gastos e ingresos en segundos
> ✔ Presupuestos por categoría con avisos antes de pasarte
> ✔ Metas de ahorro con progreso y fecha
> ✔ Gastos recurrentes automáticos (alquiler, nóminas, suscripciones)
> ✔ Varias cuentas y transferencias entre ellas
> ✔ «¿Llegas a fin de mes?»: previsión de tu saldo y de cuánto puedes gastar al día
> ✔ Detecta tus suscripciones y te dice cuánto cuestan al año
> ✔ Resumen mensual y informe anual
> ✔ Compartir con tu pareja (modo hogar)
> ✔ Importa movimientos desde un CSV de tu banco
> ✔ Asesor con IA que analiza tus números (no ve tus descripciones)
> ✔ Funciona sin conexión
>
> GRATIS para empezar. 14 días de Premium de regalo al registrarte, sin tarjeta.
> Premium desbloquea cuentas, presupuestos y metas ilimitados, previsión, importación, análisis con IA y modo hogar.
>
> Tus datos son tuyos: puedes exportarlos o borrar tu cuenta cuando quieras.
> Sin anuncios.

Palabras clave a repetir de forma natural: gastos, presupuesto, ahorro, control de gastos, finanzas personales.

**Capturas (en este orden, con el beneficio escrito arriba en cada una):**
1. Resumen del mes → «Sabe a dónde va tu dinero»
2. Presupuestos → «Ponle límite a cada categoría»
3. Metas de ahorro → «Ahorra para lo que importa»
4. «¿Llegas a fin de mes?» → «Mira el futuro de tu saldo»
5. Suscripciones → «Descubre lo que pagas sin usar»
6. Modo hogar → «Finanzas en pareja»

**Pedir valoración:** solo tras un buen momento (cerrar un mes en positivo o cumplir una meta), nunca al abrir la app.

## 2. Comunidades (publícalo tú, con tu cuenta)

Antes de escribir, lee las normas de cada sitio y mira si permiten autopromoción. Si no, participa primero
ayudando a la gente y menciona la app solo cuando venga a cuento.

**r/PersonalFinanceSpain — ejemplo de post (si lo permiten):**

> **Título:** Hice una app gratuita de control de gastos en español; busco feedback
>
> Llevo un tiempo desarrollando Money Manager, una app para registrar gastos, poner presupuestos por categoría
> y ver si llegas a fin de mes. Es mi proyecto personal (soy el único desarrollador) y quiero que sea útil de verdad.
> Es gratis; hay un plan Premium opcional que financia el desarrollo.
>
> Me ayudaría mucho saber: ¿qué le falta a las apps que usáis hoy? ¿Qué os haría dejar la hoja de cálculo?
> Web: https://www.winjgm.com · Android en Google Play.

**Comentario tipo cuando alguien pregunta «¿qué app uso?»:**
> Yo hice una, Money Manager, por si te sirve (soy el desarrollador): es gratis, en español y sin anuncios. Aun así,
> lo importante es el hábito: cualquier herramienta que uses cada día vale más que la perfecta que abandonas.

**Hilo para Telegram/Facebook de ahorro:** comparte una guía, no la app: «Os dejo una guía corta sobre el método 50/30/20,
por si ayuda» + https://www.winjgm.com/guias/metodo-50-30-20.

## 3. Vídeos cortos (20–30 s) — guiones

Formato: vertical, texto grande en pantalla, subtítulos, sin música con derechos.

1. **«El café que te cuesta 400 € al año»** — 0-3 s: «1,50 € al día…» · 3-10 s: cuenta con calculadora: 33 €/mes, 400 €/año · 10-22 s:
   pantalla de la app anotando el gasto en 3 toques · 22-28 s: «Anotar es lo que te hace consciente. Enlace en bio».
2. **«Cuánto necesitas ahorrar para que tu dinero trabaje»** — 100 €/mes, 10 años, 3 % → ~13.945 € (aportas 12.000 €).
   Muestra el simulador. Cierre: «Es una simulación, no una promesa».
3. **«Regla 50/30/20 con tu sueldo»** — pregunta «¿cuánto cobras?» y calcula en pantalla con la calculadora (enlace en bio).
4. **«Suscripciones que pagas sin usar»** — enseña la detección de suscripciones y el total al año.

Hashtags: #finanzaspersonales #ahorro #presupuesto #educacionfinanciera

## 4. Lanzamientos y directorios

- **Product Hunt:** requiere cuenta personal tuya. Tagline: «Control de gastos simple, en español, con previsión de fin de mes».
  Primer comentario: historia breve (por qué la hiciste) + pedir feedback concreto.
- **AlternativeTo:** alta de «Money Manager» como alternativa a Fintonic, Wallet y Spendee.
- Directorios de apps: AppBrain, Uptodown (requiere APK), listas de «mejores apps de finanzas».
- **Google Search Console:** añade https://www.winjgm.com, envía `sitemap.xml` y pide indexar `/guias`.

## 5. Medir

- Instalaciones y conversión de ficha: Play Console → Estadísticas.
- Uso real: `npm run stats` (métricas anónimas).
- Una acción por semana y mira cuál mueve la aguja antes de gastar en anuncios.

## 6. Capturas de Play ya generadas

`docs/marketing/play-screenshots/`: 6 capturas 1080×1920 con el beneficio escrito encima (datos de demostración, no reales)
y el gráfico de funciones 1024×500. Para regenerarlas: `docs/marketing/tools/capture.mjs` (captura con Playwright) y
`compose.mjs` (añade el texto). Hay que lanzar el backend con `SEED_DEMO_USER=true` y datos de ejemplo.
