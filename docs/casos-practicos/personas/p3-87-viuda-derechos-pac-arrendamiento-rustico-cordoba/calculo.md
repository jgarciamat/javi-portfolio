# Persona Ficticia 87: Viuda que arrienda la finca de su marido y vende sus derechos de pago básico

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Pensión de viudedad de 12.500 €. Heredó la explotación: arrienda las tierras (rendimiento del capital inmobiliario de una finca rústica, sin reducción y sin retención) y vende los derechos de pago básico heredados (ganancia: valor de venta menos el de la herencia).

NIF ficticio 00000087H · Calle Ficticia 87, 41001 Sevilla (dirección inventada) · comunidad: andalucia

Qué prueba: pensión de viudedad; arrendamiento de finca rústica; venta de derechos de pago básico heredados; mínimos andaluces.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`. Módulos agrarios: [Orden HAC/1347/2024](https://www.boe.es/buscar/act.php?id=BOE-A-2024-24949) y [caso práctico oficial del Manual, cap. 9](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c09-rendimientos-actividades-economicas-eo-fores/caso-practico.html).


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Derechos de pago básico: venta 10.000 − valor en la herencia (Impuesto sobre Sucesiones) 7.500 = ganancia **2.500,00** (base del ahorro)

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Instituto Ficticio de Pensiones (viudedad) (Q00000871): íntegros 12.500,00, retenciones 200,00
- Íntegros (0003) = 12.500,00 (de ellos 12.500,00 de pensión o prestación)
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 0,00
- Rendimiento neto previo (0017) = **12.500,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **10.500,00**

### 2. Inmueble alquilado (LIRPF arts. 22-23)

- Ingresos 9.000,00 − intereses y reparaciones 0,00 (límite: los ingresos) − otros gastos 600,00 − amortización 3 % de 0,00 = 0,00 → rendimiento neto **8.400,00**
- Finca rústica: sin reducción (art. 23.2 solo para viviendas); IBI rústico como gasto → reducción 0,00 → rendimiento neto reducido **8.400,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Otras rentas 10.900,00 > 6.500: no hay reducción.
- Rendimiento neto reducido (0025) = **10.500,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 10.500,00 + 8.400,00 (alquiler) = **18.900,00**
- Base imponible del ahorro (0460) = **2.500,00** (detalle en el apartado 0)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 18.900,00 = **18.900,00**
- Base liquidable del ahorro (0510) = **2.500,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 1.150,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **6.700,00**
- Autonómico de Andalucía (0520): contribuyente 5.790,00 + edad 1.200,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **6.990,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(18.900,00) 1.956,75 − escala(mínimo 6.700,00) 636,50 = 1.320,25
- General autonómica (Andalucía): escala(18.900,00) 1.943,00 − escala(mínimo 6.990,00) 664,05 = 1.278,95
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 2.500,00 → estatal 237,50 y autonómica 237,50
- Cuota íntegra estatal (0545) = **1.557,75**; autonómica (0546) = **1.516,45**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 1.557,75 − 0,00 + 1.516,45 − 0,00 = 3.074,20
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **3.074,20**; pagos a cuenta (0609) = 200,00; cuota diferencial (0610) = **2.874,20**
- Resultado (0670) = **2.874,20** (a ingresar)
