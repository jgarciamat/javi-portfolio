# Persona Ficticia 44: Taxista en estimación objetiva (módulos) en Mérida

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Taxista (epígrafe 721.2) en módulos con IVA simplificado: modelos 131 y 303 simplificado, sin libro de facturas de ventas. Segundo caso de módulos del banco (el 25 es de Andalucía) con otros signos: un conductor asalariado a media jornada y 45.000 km al año.

NIF ficticio 00000044K · Calle Ficticia 44, 06800 Mérida (dirección inventada) · comunidad: extremadura

Qué prueba: estimación objetiva; IVA simplificado; personal asalariado en módulos.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


### IRPF: rendimiento neto por módulos

- Unidades (instrucción 2.1 del anexo II, [Orden HAC/1425/2025](https://www.boe.es/boe/dias/2025/12/11/pdfs/BOE-A-2025-25272.pdf)): personal asalariado 900 h / 1.800 = **0,5**; personal no asalariado (el titular) **1**; distancia **45** miles de km. Los asientos no son módulo del taxi.
- Rendimiento neto previo (1465) = 0,5 × 1.346,27 + 1 × 7.656,89 + 45 × 45,08 = **10.358,63**
- Minoración por empleo (1466): sin aumento de plantilla (0,5 el año pasado), tramo hasta 1,00 → 0,10 × 0,5 × 1.346,27 = **67,31**
- Rendimiento minorado (1468) = **10.291,32**; índice del taxi en un municipio de 50.001 a 100.000 habitantes (2.3.a.2) 0,90: rendimiento neto de módulos (1474) = **9.262,19**; reducción general del 5 % (DA 1.ª, 1475) = **463,11**; rendimiento neto de la actividad (1479) = **8.799,08**

### Modelo 131

- Con los mismos datos a 1 de enero (instrucción 3), casilla 01 = **8.799,08**; con 0,5 personas asalariadas (no más de una) el 3 % (instrucción 4): casilla 02 = **263,97**. Sin retenciones (08). Rendimiento de 2025 8.799,08 ≤ 9.000 €: minoración de 100 € (casilla 09, art. 110.3.c RIRPF). Resultado (15) = **163,97** cada trimestre ([instrucciones del 131](https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-131-irpf______sionales-estimacion-objetiva-fraccionado_/instrucciones.html)).

### Modelo 303 en régimen simplificado

- Personal empleado = asalariados + no asalariados = **1,5** (instrucción 2.1 del IVA); cuota devengada C = 1,5 × 903,46 + 45 × 8,78 = **1.750,29**; 1T-3T: ingreso a cuenta del 5 % (instrucción 3) = **87,51** (casillas 47 y 71).
- 4T: IVA soportado del año 1.100,00 + 1 % de difícil justificación 17,50 = G **1.117,50**; I = C − G = **632,79**; cuota mínima del 10 % = **175,03**; M = **632,79** (casilla 48); ingresos a cuenta del año (49) **262,53**; resultado (50 y 71) = **370,26**.
