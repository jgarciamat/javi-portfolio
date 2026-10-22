---
name: finanverso-ig-reel
description: Escribe guiones de Reels de Finanverso (9:16, máx. 59 s): elige gancho del catálogo del dueño, lo puntúa con la herramienta local, redacta locución y texto en pantalla y calcula tiempos. Úsala para «guion de reel», «gancho para el vídeo N». Solo borradores.
allowed-tools: Read Grep Glob Bash(python3 -I *)
---

# Reel: gancho, guion y tiempos

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Datos de entrada
Id del vídeo del calendario maestro (p. ej. N107) o idea suelta. Lee su fila en `CALENDARIO-MAESTRO.csv`, su guion en `guiones-v2/` y `GANCHOS.md`. Si falta un dato concreto (número de pasos, plazo, función exacta de la app), pregúntalo en un solo mensaje; no lo inventes.

## Pasos
1. **Una idea, un vídeo.** Escríbela en una frase («Prepara tu trimestre en 8 pasos guiados»). Si hay dos ideas, son dos vídeos.
2. **Tres ganchos** de tres tipos distintos de `GANCHOS.md`, distintos del gancho del vídeo anterior y siguiente del calendario. Cada gancho: 4 a 12 palabras, con un dato concreto (número de pasos, plazo, función), dirigido al espectador («tu», «te»), sin saludo, sin emojis y sin palabras prohibidas.
3. **Puntúalos** con `python3 -I ganchos.py "gancho 1" "gancho 2" "gancho 3"` (en la carpeta de esta skill). La nota es orientativa: sirve para descartar ganchos flojos, no para predecir visitas. Descarta los «NO USAR».
4. **Guion**: gancho (≤3 s), 4 a 6 bloques de demostración en la app (una acción por bloque, frases de 8 a 15 palabras, ritmo lento), remate con el aviso («orientativo; la app no presenta nada») si es fiscal. El cierre fijo lo pone el render: «Finanverso, disponible en Google Play y en finanverso punto app».
5. **Tiempos**: guarda la locución en una línea por bloque y pásala por `python3 -I tiempos.py < guion.txt`. Corrige lo que avise (gancho >3 s, bloque >6 s, total con cierre >59 s).
6. **Texto en pantalla**: ≤6 palabras por tarjeta, dentro de la zona segura, el gancho como primera tarjeta.
7. **Pie**: entrégalo a `finanverso-ig-caption`.

## Salida
Tabla: gancho elegido (y alternativas con nota), locución por bloque con segundo de entrada, escena de la app, texto en pantalla, aviso fiscal y estado de las reglas duras. Termina con «Borrador para tu revisión; no se ha tocado el calendario ni se ha publicado nada».

## Prohibido
Datos reales, promesas de ahorro, «gestor», decir que la app presenta o gestiona trámites, comparar con otras marcas.
