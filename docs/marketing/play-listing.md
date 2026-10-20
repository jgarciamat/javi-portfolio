# Ficha de Google Play — textos listos para pegar

## Español (es-ES)

**Título (30):** Finanverso: gastos y ahorro

**Descripción breve (80):** Presupuestos, ahorro, renta y autónomos. Gratis, en español y sin anuncios.

**Descripción completa:**
¿Llegas a fin de mes? Finanverso te lo dice antes de que ocurra.

Controla tus gastos y presupuestos, ahorra con metas y prepara tu declaración de la Renta y tus impuestos de autónomo desde el móvil. Gratis, en español y sin anuncios.

CONTROL DE GASTOS Y PRESUPUESTO
• Apunta gastos e ingresos en segundos, por categorías y cuentas
• Presupuestos con avisos antes de pasarte
• Previsión de fin de mes: cuánto puedes gastar al día
• Detección de suscripciones y recordatorios de recibos
• Escanea tickets con la cámara y importa tu extracto bancario (CSV y Norma 43)
• Gastos compartidos y modo pareja: quién debe a quién

AHORRO Y PATRIMONIO
• Metas de ahorro con progreso y fecha
• Inversiones, vivienda y deudas mes a mes
• Plan para salir de deudas (avalancha o bola de nieve)
• Salud financiera: nota de 0 a 100 y retos mensuales

DECLARACIÓN DE LA RENTA
• Calculadora con las deducciones del Estado y de tu comunidad autónoma (Castilla y León, Comunitat Valenciana y más)
• Sube el PDF de tu borrador: lo leemos en tu móvil y te avisamos de las deducciones que no has marcado
• Prueba la renta del año siguiente con los mismos datos

AUTÓNOMOS
• Borrador del modelo 303 (IVA) y del modelo 130 (IRPF) con sus casillas
• Gastos deducibles, cuota de autónomos estimada y fechas límite
• Descarga el borrador en PDF para tu gestor

SEGURIDAD Y COMODIDAD
• Multidivisa, tema claro y oscuro, widget en la pantalla de inicio
• Bloqueo con PIN o huella, resumen semanal y recordatorios
• Tus datos son tuyos: expórtalos o bórralos cuando quieras

Gratis para empezar. Premium opcional (previsión, importación, plan de deudas, Renta y autónomos sin límite, IA y más): 3,49 €/mes, 29,99 €/año o 59 € de por vida.

Las estimaciones fiscales son orientativas: revísalas con tu gestor antes de presentar.

**Palabras clave a cubrir de forma natural:** gastos, presupuesto, ahorro, finanzas personales, renta, declaración de la renta, autónomos, modelo 303, modelo 130, deducciones, control de gastos.

## English (en-GB)

**Title:** Finanverso: spend & save

**Short:** Budgets, savings, income tax and self-employed taxes. Free, ad-free, private.

**Full:** Will you make it to the end of the month? Finanverso tells you before it happens. Log expenses and income in seconds, set budgets with alerts, save towards goals and get an end-of-month forecast.

Also: bank statement import (CSV), auto-categorisation, subscription detection, receipt scanning, split expenses, net worth, debt payoff plan, multi-currency, PIN/biometric lock and a home-screen widget.

For people in Spain: an income tax (Renta) calculator with state and regional deductions that can read your tax draft and point out deductions you may be missing, plus a self-employed quarterly draft (modelo 303 VAT and modelo 130) you can download as a PDF for your adviser. Tax figures are indicative.

Free to start. Optional Premium adds the forecast, import, unlimited tax drafts and an AI financial advisor.

## Capturas y gráfico
- Capturas: docs/marketing/play-screenshots/ (teléfono 1080x1920) y tablet/ (1600x2560, valen para 7" y 10"). Orden y titular de cada una:
  1. Resumen del mes → «Sabe a dónde va tu dinero» (01-home)
  2. Previsión → «¿Llegas a fin de mes?» (02-forecast)
  3. Presupuestos → «Ponle límite a cada categoría» (03-budgets)
  4. Renta guiada → «Haz tu Renta paso a paso» (04-renta)
  5. Autónomos (modelos 130 y 303) → «Tus modelos 130 y 303 listos para copiar» (05-autonomos)
  6. Inversiones y cripto → «Cripto y fondos: ganancias listas para Renta WEB» (06-investments)
  7. Metas → «Ahorra para lo que importa» (07-goals)
  8. Invita a un amigo → «Invita a un amigo y gana Premium» (08-invite)
- Cómo regenerarlas: pila local de demo (BD temporal, usuario demo y datos inventados) → `node scripts/playshots.mjs` (y `TABLET=1`) → `python3 scripts/playcompose.py`. La captura falla si la página dice «Money Manager» (la marca antigua) o «NO CONFIRMADO».
- Gráfico de cabecera (1024x500): play-screenshots/feature-graphic-1024x500.png; variante con etiquetas: assets/play-store-header.png. Los genera también scripts/playcompose.py.

## Plantillas de respuesta a reseñas
- 5★: «¡Gracias por tu valoración! Si echas algo en falta, escríbenos a support@finanverso.app y lo tendremos en cuenta.»
- 1-3★ (fallo): «Lamentamos el problema. ¿Nos cuentas qué versión usas y qué ocurrió en support@finanverso.app? Lo revisamos enseguida.»
- 1-3★ (precio/Premium): «Lo esencial es gratis y sin anuncios; Premium solo añade el asesor con IA y extras. Gracias por tu opinión, nos ayuda a mejorar.»
