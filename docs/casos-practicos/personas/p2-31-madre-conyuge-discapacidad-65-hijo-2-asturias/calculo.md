# Persona Ficticia 31: Madre trabajadora, marido sin rentas con discapacidad del 65 % y un hijo de 2 años

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Ella trabaja (30.000 €); su marido no tiene rentas y tiene reconocida una discapacidad del 65 %. Hijo nacido en 2023. Individual frente a conjunta: en la conjunta cuenta el mínimo por discapacidad del marido.

NIF ficticio 00000031P · Calle Ficticia 31, 33001 Oviedo (dirección inventada) · comunidad: asturias

Qué prueba: conjunta frente a individual; discapacidad del cónyuge en la conjunta; deducción por maternidad; deducción por cónyuge con discapacidad (art. 81 bis); hijo menor de 3 años.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 30.000,00, retenciones 3.900,00, Seguridad Social 1.944,00
- Íntegros (0003) = 30.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.944,00
- Rendimiento neto previo (0017) = **28.056,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **26.056,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 28.056,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **26.056,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 26.056,00 = **26.056,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 26.056,00 = **26.056,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 2.600,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **8.150,00**
- Autonómico de Principado de Asturias (0520): contribuyente 6.105,00 + edad 0,00 + descendientes 2.860,00 (50 % por convivir con el otro progenitor) + ascendientes 0,00 + discapacidad 0,00 = **8.965,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(26.056,00) 2.991,15 − escala(mínimo 8.150,00) 774,25 = 2.216,90
- General autonómica (Principado de Asturias): escala(26.056,00) 2.920,19 − escala(mínimo 8.965,00) 806,85 = 2.113,34
- Cuota íntegra estatal (0545) = **2.216,90**; autonómica (0546) = **2.113,34**

### 9. Deducciones, cuota resultante y resultado

- Maternidad (art. 81): 100 € × 12 meses = 1.200 € (hijo menor de 3 años todo el año)
- Cónyuge no separado con discapacidad (art. 81 bis.1.d): 1.200 €: cónyuge con discapacidad ≥ 33 % y rentas < 8.000 €; tope de cotizaciones 1.944 ≥ 1.200
- Cuota líquida (0587) = 2.216,90 − 0,00 + 2.113,34 − 0,00 = 4.330,24
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **4.330,24**; pagos a cuenta (0609) = 3.900,00; cuota diferencial (0610) = **430,24**
- Deducciones abonables (art. 81 y 81 bis, sin abono anticipado) = 2.400,00
- Resultado (0670) = **-1.969,76** (a devolver)

## Declaración conjunta


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 30.000,00, retenciones 3.900,00, Seguridad Social 1.944,00
- Íntegros (0003) = 30.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.944,00
- Rendimiento neto previo (0017) = **28.056,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **26.056,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 28.056,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **26.056,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 26.056,00 = **26.056,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Reducción por tributación conjunta: 3.400,00 (matrimonio, art. 84.2.4.º)
- Base liquidable general (0500) = 26.056,00 − 3.400,00 = **22.656,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 5.200,00 + ascendientes 0,00 + discapacidad 12.000,00 = **22.750,00**
- Autonómico de Principado de Asturias (0520): contribuyente 6.105,00 + edad 0,00 + descendientes 5.720,00 + ascendientes 0,00 + discapacidad 13.200,00 = **25.025,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(22.656,00) 2.481,15 − escala(mínimo 22.656,00) 2.481,15 = 0,00
- General autonómica (Principado de Asturias): escala(22.656,00) 2.444,19 − escala(mínimo 22.656,00) 2.444,19 = 0,00
- Cuota íntegra estatal (0545) = **0,00**; autonómica (0546) = **0,00**

### 9. Deducciones, cuota resultante y resultado

- Maternidad (art. 81): 100 € × 12 meses = 1.200 € (hijo menor de 3 años todo el año)
- Cónyuge no separado con discapacidad (art. 81 bis.1.d): 1.200 €: cónyuge con discapacidad ≥ 33 % y rentas < 8.000 €; tope de cotizaciones 1.944 ≥ 1.200
- Cuota líquida (0587) = 0,00 − 0,00 + 0,00 − 0,00 = 0,00
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **0,00**; pagos a cuenta (0609) = 3.900,00; cuota diferencial (0610) = **-3.900,00**
- Deducciones abonables (art. 81 y 81 bis, sin abono anticipado) = 2.400,00
- Resultado (0670) = **-6.300,00** (a devolver)
- Comparación: individual -1.969,76 frente a conjunta -6.300,00 → mejor la conjunta
