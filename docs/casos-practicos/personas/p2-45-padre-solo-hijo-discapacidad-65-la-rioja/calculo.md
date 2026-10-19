# Persona Ficticia 45: Padre solo con un hijo con discapacidad del 65 %: mínimo propio de La Rioja

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Custodia exclusiva de un hijo de 10 años con discapacidad del 65 %, sin convivir con la madre. La Rioja eleva el mínimo por discapacidad de los descendientes (9.900 €) pero no el resto. Individual frente a conjunta monoparental.

NIF ficticio 00000045E · Calle Ficticia 45, 26001 Logroño (dirección inventada) · comunidad: la-rioja

Qué prueba: mínimo autonómico por discapacidad de descendientes (La Rioja); asistencia por discapacidad ≥ 65 %; monoparental conjunta (2.150); deducción por descendiente con discapacidad.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 33.000,00, retenciones 4.700,00, Seguridad Social 2.138,40
- Íntegros (0003) = 33.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.138,40
- Rendimiento neto previo (0017) = **30.861,60**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **28.861,60**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 30.861,60: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **28.861,60**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 28.861,60 = **28.861,60**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 28.861,60 = **28.861,60**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 12.000,00 = **19.950,00**
- Autonómico de La Rioja (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 12.900,00 = **20.850,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(28.861,60) 3.411,99 − escala(mínimo 19.950,00) 2.082,75 = 1.329,24
- General autonómica (La Rioja): escala(28.861,60) 2.995,48 − escala(mínimo 20.850,00) 1.905,90 = 1.089,58
- Cuota íntegra estatal (0545) = **1.329,24**; autonómica (0546) = **1.089,58**

### 9. Deducciones, cuota resultante y resultado

- Descendiente con discapacidad (art. 81 bis.1.a): 1.200 €; tope de cotizaciones 2.138,40
- Cuota líquida (0587) = 1.329,24 − 0,00 + 1.089,58 − 0,00 = 2.418,82
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **2.418,82**; pagos a cuenta (0609) = 4.700,00; cuota diferencial (0610) = **-2.281,18**
- Deducciones abonables (art. 81 y 81 bis, sin abono anticipado) = 1.200,00
- Resultado (0670) = **-3.481,18** (a devolver)

## Declaración conjunta


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 33.000,00, retenciones 4.700,00, Seguridad Social 2.138,40
- Íntegros (0003) = 33.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.138,40
- Rendimiento neto previo (0017) = **30.861,60**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **28.861,60**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 30.861,60: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **28.861,60**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 28.861,60 = **28.861,60**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Reducción por tributación conjunta: 2.150,00 (familia monoparental, art. 84.2.4.º)
- Base liquidable general (0500) = 28.861,60 − 2.150,00 = **26.711,60**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 12.000,00 = **19.950,00**
- Autonómico de La Rioja (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 2.400,00 + ascendientes 0,00 + discapacidad 12.900,00 = **20.850,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(26.711,60) 3.089,49 − escala(mínimo 19.950,00) 2.082,75 = 1.006,74
- General autonómica (La Rioja): escala(26.711,60) 2.703,08 − escala(mínimo 20.850,00) 1.905,90 = 797,18
- Cuota íntegra estatal (0545) = **1.006,74**; autonómica (0546) = **797,18**

### 9. Deducciones, cuota resultante y resultado

- Descendiente con discapacidad (art. 81 bis.1.a): 1.200 €; tope de cotizaciones 2.138,40
- Cuota líquida (0587) = 1.006,74 − 0,00 + 797,18 − 0,00 = 1.803,92
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **1.803,92**; pagos a cuenta (0609) = 4.700,00; cuota diferencial (0610) = **-2.896,08**
- Deducciones abonables (art. 81 y 81 bis, sin abono anticipado) = 1.200,00
- Resultado (0670) = **-4.096,08** (a devolver)
- Comparación: individual -3.481,18 frente a conjunta -4.096,08 → mejor la conjunta
