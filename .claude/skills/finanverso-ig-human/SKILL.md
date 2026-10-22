---
name: finanverso-ig-human
description: Limpia y revisa en español cualquier texto de Finanverso antes de mostrarlo: caracteres invisibles, espacios raros, muletillas, frases de relleno y palabras prohibidas. Úsala siempre antes de dar un pie, guion o mensaje al dueño.
allowed-tools: Read Grep Glob Bash(python3 -I *)
---

# Texto limpio y natural

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Qué hace
Deja el texto claro y propio de la voz de Finanverso. Esta skill **no sirve para ocultar que el texto lo ha redactado una IA** ni promete saltarse detectores: solo quita ruido y relleno.

## Pasos
1. Guarda el borrador y pásalo por `python3 -I limpiar.py < borrador.txt > limpio.txt` (en la carpeta de esta skill; el informe sale por pantalla). Elimina caracteres invisibles, cambia espacios raros por espacio normal y quita muletillas («sin más dilación», «cabe destacar que», «descubre cómo»...).
2. Revisa a mano lo que marque «REVISAR A MANO»: construcciones «no solo..., sino también», rayas largas y palabras prohibidas.
3. Lectura final con el oído de una persona mayor: ¿se entiende a la primera? Frases de 8 a 15 palabras, verbos sencillos, un dato concreto por frase, sin anglicismos innecesarios.
4. Comprueba las reglas duras de `finanverso-ig-voz` (demostración, sin «gestor», sin «perfecto/exacto/garantizado», la app no presenta).
5. Entrega el texto limpio y la lista de cambios.
