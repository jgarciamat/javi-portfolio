---
name: finanverso-ig-caption
description: Redacta y revisa pies (captions) de Instagram de Finanverso: primera línea útil en los ~125 caracteres visibles, cierre, avisos y hashtags. Úsala para «pie del vídeo N», «mejora el caption». Solo borradores.
allowed-tools: Read Grep Glob Bash(python3 -I *)
---

# Pie de Instagram

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Qué se ve y qué no
Solo unos 125 caracteres se ven antes de «más». Ahí deben ir: el beneficio o la pregunta, un dato concreto (número, plazo, paso) y la palabra clave del tema (Renta, 303, extracto...), porque Instagram también busca en el texto del pie. Los avisos legales van después; aun así deben estar.

## Estructura del pie (la del calendario maestro)
1. Línea de título con la palabra clave y 👇.
2. Tres viñetas ✅ de lo que se ve en el vídeo.
3. Una sola petición: 💾 «Guárdalo para cuando lo necesites» o «Enlace en el perfil». Nunca varias.
4. 👉 «Disponible en Google Play y en finanverso.app (enlace en el perfil)».
5. ℹ️ «Datos de demostración.» y, si es fiscal, «Orientativo, no es asesoramiento. La app no presenta nada: tú presentas en la Agencia Tributaria.»
6. Hasta 5 hashtags, `#finanverso` siempre, ninguno de relleno.

## Pasos
1. Lee la fila del vídeo en `CALENDARIO-MAESTRO.csv` (sin modificarla) y su guion.
2. Redacta 2 variantes de la primera línea (≤110 caracteres, sin cortar una palabra al llegar a 125).
3. Ensambla el pie completo y pásalo por `python3 -I pie.py < pie.txt`; corrige todo FALLO y valora cada AVISO.
4. Pasa el texto por `finanverso-ig-human`.
5. Entrega: trozo visible, pie completo, resultado de la revisión.

## Prohibido
Enlaces escritos como si fueran pulsables, hashtags de relleno, emojis en exceso, «gestor», «perfecto», «exacto», «garantizado», testimonios o cifras inventadas presentadas como reales.
