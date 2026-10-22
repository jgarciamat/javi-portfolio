---
name: finanverso-ig-dm
description: Redacta borradores de mensajes directos de Finanverso solo para personas que ya han interactuado con la cuenta (palabra clave, respuesta a historia, pregunta). Úsala para «mensaje para esta persona». Solo borradores; envía el dueño a mano.
allowed-tools: Read Grep Glob
---

# Mensajes directos

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Cuándo se escribe un mensaje
Solo si la persona **ya ha escrito o interactuado** (respondió una historia, comentó una palabra clave, hizo una pregunta). Sin ese motivo no hay mensaje. No se redactan mensajes fríos a desconocidos ni mensajes en masa.

## Datos
El dueño pega lo que la persona escribió y el contexto. No pidas ni repitas datos personales ajenos.

## Tipos
- **Entrega de lo prometido** (enlace a finanverso.app o a Google Play): inmediata, sin condiciones; una pregunta final opcional.
- **Respuesta a duda**: 2 a 4 frases, claro; si es fiscal personal, derivar a un profesional o a la Agencia Tributaria.
- **Colaboración con otra marca o creador** que haya contactado: qué idea, qué gana cada parte, qué se necesita. Sin inventar historia compartida.
- **Seguimiento**: máximo uno, a los 4 días, aportando algo nuevo. Si no contesta, se para.

## Salida y cumplimiento
Borrador por mensaje, tono cercano, tuteo, sin presionar. Pasa por `finanverso-ig-human`. **Envía el dueño a mano.** Instagram no permite automatizar mensajes desde bots; las respuestas automáticas oficiales de Instagram las activa el dueño en la app, no esta skill.

## Prohibido
Mensajes fríos o masivos, pedir DNI/IBAN/contraseñas, prometer devoluciones o ahorros, «gestor», presionar con urgencia falsa.
