# Persona Ficticia 105: Asalariada que alquila una vivienda de uso turístico en Menorca

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Alquila por días, sin servicios hoteleros, un piso de Ciutadella (16.000 € al año): rendimiento del capital inmobiliario sin reducción (no es vivienda habitual del inquilino). Gastos de la plataforma y limpieza.

NIF ficticio 00000105J · Calle Ficticia 105, 07701 Maó (dirección inventada) · comunidad: baleares

Qué prueba: vivienda de uso turístico sin servicios (capital inmobiliario); sin reducción del art. 23.2; otras rentas > 6.500.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`. Módulos agrarios: [Orden HAC/1347/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-24949) y [caso práctico oficial del Manual, cap. 9](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c09-rendimientos-actividades-economicas-eo-fores/caso-practico.html).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 31.000,00, retenciones 4.800,00, Seguridad Social 2.008,80
- Íntegros (0003) = 31.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.008,80
- Rendimiento neto previo (0017) = **28.991,20**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **26.991,20**

### 2. Inmueble alquilado (LIRPF arts. 22-23)

- Ingresos 16.000,00 − intereses y reparaciones 2.100,00 (límite: los ingresos) − otros gastos 3.900,00 − amortización 3 % de 110.000,00 = 3.300,00 → rendimiento neto **6.700,00**
- Alquiler turístico de temporada: no es vivienda habitual del inquilino; sin reducción. Comunidad y servicios incluye la limpieza y la comisión de la plataforma → reducción 0,00 → rendimiento neto reducido **6.700,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Otras rentas 6.700,00 > 6.500: no hay reducción.
- Rendimiento neto reducido (0025) = **26.991,20**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 26.991,20 + 6.700,00 (alquiler) = **33.691,20**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 33.691,20 = **33.691,20**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Illes Balears (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(33.691,20) 4.136,43 − escala(mínimo 5.550,00) 527,25 = 3.609,18
- General autonómica (Illes Balears): escala(33.691,20) 4.155,96 − escala(mínimo 5.550,00) 499,50 = 3.656,46
- Cuota íntegra estatal (0545) = **3.609,18**; autonómica (0546) = **3.656,46**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 3.609,18 − 0,00 + 3.656,46 − 0,00 = 7.265,64
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **7.265,64**; pagos a cuenta (0609) = 4.800,00; cuota diferencial (0610) = **2.465,64**
- Resultado (0670) = **2.465,64** (a ingresar)
