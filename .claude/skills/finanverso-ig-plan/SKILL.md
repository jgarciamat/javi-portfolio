---
name: finanverso-ig-plan
description: Crea el plan semanal de contenido de Instagram de Finanverso a partir del calendario maestro, con formato, gancho y tema de cada día. Úsala para «plan de la semana». Solo planifica.
allowed-tools: Read Grep Glob
---

# Plan semanal

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Pasos
1. Lee `CALENDARIO-MAESTRO.csv` (7 próximos días), `PUBLICADOS.md` y `GANCHOS.md`. Si existe un informe de auditoría reciente (`finanverso-ig-audit`), úsalo.
2. Respeta las fechas ancladas y ventanas del calendario maestro; **no muevas ni edites nada ahí**: si algo no encaja, proponlo en el plan como «cambio sugerido».
3. Por día: vídeo (id y título), gancho recomendado (distinto al del día anterior y posterior), una historia con pegatina, y si toca carrusel.
4. Alterna tipos: paso a paso, error común, dato, función de la app. No dos de lo mismo seguidos. Los temas con plazo (trimestre, Renta) van antes del plazo.
5. Hora: 12:00 (España), como en el calendario; solo sugerir otra si la auditoría lo respalda.
6. Salida: tabla semanal + lista de pendientes para el dueño («aprobar pie del lunes», «grabar historia del martes»).

## Cuentas y comentarios
La skill **no genera listas de cuentas para comentar a diario** ni rondas de engagement automáticas. Si el dueño quiere interactuar, usa `finanverso-ig-comment` sobre publicaciones concretas que él pegue, y comenta él mismo.

## Prohibido
Programar o publicar, editar el calendario, inventar plazos: los plazos fiscales se confirman en la web de la Agencia Tributaria.
