# Persona Ficticia 38: Vende un piso comprado en 2008 y recibe una donación de su madre

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Vende el 30-9-2025 un piso vacío comprado en 2008 (con una mejora en 2015): ganancia en la base del ahorro e imputación de renta hasta la venta. Su madre le dona 20.000 € en dinero: no tributa en el IRPF (Impuesto sobre Donaciones de Castilla-La Mancha).

NIF ficticio 00000038S · Calle Ficticia 38, 45001 Toledo (dirección inventada) · comunidad: castilla-la-mancha

Qué prueba: ganancia por venta de inmueble (art. 34-35); mejoras en el valor de adquisición; plusvalía municipal como gasto de venta; imputación de renta por días; donación recibida (ISD, no IRPF); tramos altos de la base del ahorro.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Valor de adquisición (art. 35.1): precio 120.000 + gastos e impuestos de la compra 9.600 + mejora de 2015 8.000 = 137.600,00
- Valor de transmisión (art. 35.2): 185.000 − plusvalía municipal 2.100 − agencia 5.000 = 177.900,00
- Ganancia = 177.900 − 137.600 = **40.300,00** (base del ahorro). Comprado en 2008: no hay coeficientes de abatimiento (DT 9.ª, solo antes de 1995)
- Donación de 20.000 € de su madre: no es renta del IRPF para quien la recibe (art. 6.4 LIRPF); tributa en el Impuesto sobre Sucesiones y Donaciones

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 39.000,00, retenciones 6.900,00, Seguridad Social 2.527,20
- Íntegros (0003) = 39.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.527,20
- Rendimiento neto previo (0017) = **36.472,80**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **34.472,80**

### 3. Imputación de rentas inmobiliarias (LIRPF art. 85)

- Valor catastral 70.000,00 × 1,1 % × 273/365 días = **575,92**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Otras rentas 40.875,92 > 6.500: no hay reducción.
- Rendimiento neto reducido (0025) = **34.472,80**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 34.472,80 + 575,92 (imputación) = **35.048,72**
- Base imponible del ahorro (0460) = **40.300,00** (detalle en el apartado 0)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 35.048,72 = **35.048,72**
- Base liquidable del ahorro (0510) = **40.300,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Castilla-La Mancha (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(35.048,72) 4.340,06 − escala(mínimo 5.550,00) 527,25 = 3.812,81
- General autonómica (Castilla-La Mancha): escala(35.048,72) 4.340,06 − escala(mínimo 5.550,00) 527,25 = 3.812,81
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 40.300,00 → estatal 4.171,50 y autonómica 4.171,50
- Cuota íntegra estatal (0545) = **7.984,31**; autonómica (0546) = **7.984,31**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 7.984,31 − 0,00 + 7.984,31 − 0,00 = 15.968,62
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **15.968,62**; pagos a cuenta (0609) = 6.900,00; cuota diferencial (0610) = **9.068,62**
- Resultado (0670) = **9.068,62** (a ingresar)
