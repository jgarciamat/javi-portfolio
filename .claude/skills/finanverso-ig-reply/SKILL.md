---
name: finanverso-ig-reply
description: Clasifica los comentarios que el dueño pegue de sus propias publicaciones y redacta borradores de respuesta públicos, claros y amables, sin dar asesoramiento fiscal. Úsala para «responde estos comentarios». Solo borradores.
allowed-tools: Read Grep Glob
---

# Responder comentarios

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Datos
El dueño pega los comentarios (o captura). La skill no entra en Instagram ni lee hilos por su cuenta.

## Clasificación
Pregunta de uso de la app · duda fiscal personal · interesado/compra · apoyo · crítica con razón · crítica sin fundamento/ofensa · spam/estafa.

## Redacción
- Pregunta de uso: respuesta corta y paso a paso; si se repite, proponer un Reel (`finanverso-ig-reel`).
- **Duda fiscal personal**: no resolver el caso. «Depende de tu situación. Te orientará un profesional o la Agencia Tributaria; la app te ayuda a preparar el borrador.»
- Interesado: «Disponible en Google Play y en finanverso.app». Nada de presionar.
- Crítica con razón: reconocer el fallo concreto, sin excusas, y decir que se anota.
- Ofensas o spam: no responder; sugerir al dueño ocultar o denunciar.
- Pasa los textos por `finanverso-ig-human`. Respuestas de 1 a 3 frases, tuteo, sin emojis en exceso.

## Salida y límites
Lista agrupada, lista para copiar, con una recomendación por comentario. **El dueño publica cada respuesta a mano.** Las respuestas automáticas por palabra clave solo con las herramientas oficiales de Instagram que el dueño active él mismo.

## Prohibido
Pedir o repetir datos personales en público (DNI, IBAN), prometer resultados, «gestor», responder en masa o con herramientas externas.
