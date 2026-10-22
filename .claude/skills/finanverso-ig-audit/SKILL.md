---
name: finanverso-ig-audit
description: Analiza lo que ha funcionado en Instagram a partir de los datos que el dueño pase (capturas o exportación de Instagram Insights) y propone qué repetir y qué cambiar. Úsala a las 2 semanas de publicar. Solo análisis.
allowed-tools: Read Grep Glob
---

# Auditoría de resultados

**Antes de empezar lee `finanverso-ig-voz`** (reglas duras: datos de demostración, nunca «gestor», sin «perfecto/exacto/garantizado», la app no presenta, cierre «Disponible en Google Play y en finanverso.app», #finanverso, 9:16). Esta skill solo produce borradores: no publica, no sigue, no comenta ni manda mensajes; el dueño revisa y publica a mano.

## Datos que necesita (los da el dueño; esta skill no entra en Instagram)
Capturas o exportación de **Instagram Insights** por publicación: alcance, visualizaciones, % de retención a los 3 s, tiempo medio de visualización, guardados, compartidos, seguidores nuevos. Si solo hay visualizaciones, vale, pero la conclusión será más débil. Cruza con la columna `estado_instagram` y el gancho usado en `CALENDARIO-MAESTRO.csv`.

## Pasos
1. Calcula, por publicación: **múltiplo sobre la mediana propia** (visualizaciones ÷ mediana de la cuenta), guardados y compartidos por alcance, seguidores nuevos por alcance.
2. Ordena por múltiplo y por compartidos/guardados, no por visualizaciones brutas.
3. Compara las 5 mejores con las 5 peores: gancho (número de `GANCHOS.md`), tema (Renta, autónomos, importar...), longitud, pie, día. La hora la última: rara vez pesa.
4. Cada hallazgo con su evidencia y su confianza. **Con menos de 10 publicaciones no hay patrón firme**: dilo.
5. Diagnóstico: muchas visualizaciones y pocos seguidores = problema de perfil (`finanverso-ig-profile`); pocas visualizaciones = problema de gancho.
6. Salida: qué repetir, qué dejar, qué probar la semana siguiente. Pásalo a `finanverso-ig-plan`.

## Prohibido
Inventar cifras que no estén en los datos, entrar en la cuenta, usar herramientas de terceros para sacar datos.
