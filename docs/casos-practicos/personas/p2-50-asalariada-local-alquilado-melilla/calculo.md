# Persona Ficticia 50: Asalariada en Melilla que alquila un local en la ciudad

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Trabaja en Melilla y alquila un local comercial situado allí (sin reducción: no es vivienda); el inquilino le retiene el 19 %. Las dos rentas se obtienen en Melilla: deducción del 60 % sobre toda la cuota.

NIF ficticio 00000050G · Calle Ficticia 50, 52001 Melilla (dirección inventada) · comunidad: melilla

Qué prueba: deducción por rentas obtenidas en Melilla (60 %); alquiler de local sin reducción; retención del alquiler en los pagos a cuenta; otras rentas ≤ 6.500.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 28.000,00, retenciones 1.600,00, Seguridad Social 1.814,40
- Íntegros (0003) = 28.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.814,40
- Rendimiento neto previo (0017) = **26.185,60**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **24.185,60**

### 2. Inmueble alquilado (LIRPF arts. 22-23)

- Ingresos 9.600,00 − intereses y reparaciones 600,00 (límite: los ingresos) − otros gastos 850,00 − amortización 3 % de 80.000,00 = 2.400,00 → rendimiento neto **5.750,00**
- Local comercial: la reducción del art. 23.2 es solo para viviendas → reducción 0,00 → rendimiento neto reducido **5.750,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 26.185,60: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **24.185,60**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 24.185,60 + 5.750,00 (alquiler) = **29.935,60**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 29.935,60 = **29.935,60**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Melilla (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(29.935,60) 3.573,09 − escala(mínimo 5.550,00) 527,25 = 3.045,84
- General autonómica (Melilla): escala(29.935,60) 3.573,09 − escala(mínimo 5.550,00) 527,25 = 3.045,84
- Cuota íntegra estatal (0545) = **3.045,84**; autonómica (0546) = **3.045,84**

### 9. Deducciones, cuota resultante y resultado

- Rentas obtenidas en Ceuta o Melilla (art. 68.4 LIRPF): 60 % de la suma de las cuotas íntegras (3.045,84 + 3.045,84) (todas las rentas se obtienen allí, art. 68.4.3.º) = 3.655,01: la mitad en cada cuota (1.827,50 estatal y 1.827,51 autonómica)
- Cuota líquida (0587) = 3.045,84 − 1.827,50 + 3.045,84 − 1.827,51 = 2.436,67
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **2.436,67**; pagos a cuenta (0609) = 3.424,00 (incluye 1.824,00 de retenciones del capital o del alquiler); cuota diferencial (0610) = **-987,33**
- Resultado (0670) = **-987,33** (a devolver)
