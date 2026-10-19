# Persona Ficticia 46: Piso alquilado con rendimiento negativo (contrato de 2020)

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Alquila un piso por 500 €/mes con contrato de 2020; este año hizo una reparación grande. Intereses y reparaciones superan los ingresos (el exceso pasa a los 4 años siguientes) y la amortización deja el rendimiento en negativo: sin reducción y restando de la base general.

NIF ficticio 00000046T · Calle Ficticia 46, 26001 Logroño (dirección inventada) · comunidad: la-rioja

Qué prueba: rendimiento de capital inmobiliario negativo; límite de intereses y reparaciones (art. 23.1.a); exceso a 4 años; sin reducción con rendimiento negativo.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 36.000,00, retenciones 6.000,00, Seguridad Social 2.332,80
- Íntegros (0003) = 36.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.332,80
- Rendimiento neto previo (0017) = **33.667,20**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **31.667,20**

### 2. Inmueble alquilado (LIRPF arts. 22-23)

- Ingresos 6.000,00 − intereses y reparaciones 6.000,00 (de 6.700,00: el exceso de 700,00 se deduce en los 4 años siguientes) − otros gastos 1.370,00 − amortización 3 % de 110.000,00 = 3.300,00 → rendimiento neto **-4.670,00**
- Contrato de 2020 (anterior al 26-05-2023): reducción del 60 %, pero solo sobre rendimientos positivos (art. 23.2) → reducción 0,00 → rendimiento neto reducido **-4.670,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 33.667,20: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **31.667,20**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 31.667,20 + -4.670,00 (alquiler) = **26.997,20**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 26.997,20 = **26.997,20**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de La Rioja (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(26.997,20) 3.132,33 − escala(mínimo 5.550,00) 527,25 = 2.605,08
- General autonómica (La Rioja): escala(26.997,20) 2.741,92 − escala(mínimo 5.550,00) 444,00 = 2.297,92
- Cuota íntegra estatal (0545) = **2.605,08**; autonómica (0546) = **2.297,92**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 2.605,08 − 0,00 + 2.297,92 − 0,00 = 4.903,00
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **4.903,00**; pagos a cuenta (0609) = 6.000,00; cuota diferencial (0610) = **-1.097,00**
- Resultado (0670) = **-1.097,00** (a devolver)
