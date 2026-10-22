---
name: finanverso-ig-viral
description: Analiza qué ganchos y formatos funcionan en Instagram a partir de ejemplos que el dueño aporte a mano (capturas o tabla con cuenta, seguidores, visualizaciones y gancho). Úsala para «qué está funcionando». No rastrea ni descarga nada.
allowed-tools: Read Grep Glob Bash(python3 -I *)
---

# Qué funciona (investigación manual)

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Datos (los aporta el dueño)
Una tabla pequeña (6 a 12 cuentas del sector, de tamaño parecido) con: cuenta, seguidores, visualizaciones del vídeo, visualizaciones típicas de la cuenta, texto del gancho y duración. Se rellena a mano mirando Instagram con el propio navegador del dueño, o con capturas. **Esta skill no navega por Instagram, no usa herramientas de descarga ni de rastreo, y no entra en cuentas.**

## Pasos
1. Calcula el múltiplo de cada vídeo: visualizaciones ÷ visualizaciones típicas de su cuenta. Más de 3 es señal; ordena por múltiplo, no por cifras brutas.
2. Identifica el tipo de gancho de cada uno con los 20 de `GANCHOS.md` y compara el tercio superior con el inferior.
3. Copia la **estructura** (pregunta, lista, error común, dato), nunca el texto ni las ideas literales de otros creadores.
4. Traduce los 3 mejores patrones a ganchos de Finanverso con datos de demostración y pásalos por `python3 -I ../finanverso-ig-reel/ganchos.py`.
5. Salida: tabla ordenada, patrones, 5 ganchos propios candidatos y límites (muestra pequeña = conclusión débil).

## Cumplimiento
Rastrear Instagram con programas automáticos incumple sus condiciones. Se trabaja solo con lo que el dueño mire y anote a mano, en pocas cuentas.

## Prohibido
Plagiar textos, citar cifras de otros como propias, rastreo automático.
