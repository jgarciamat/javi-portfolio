# Persona Ficticia 30: Pensionista de 78 años con discapacidad del 33 % y movilidad reducida

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Pensión de jubilación de 24.000 € e intereses de 600 €. Discapacidad del 33 % con movilidad reducida acreditada: suma 3.000 € de gastos de asistencia (art. 60.3) aunque no llegue al 65 %.

NIF ficticio 00000030F · Calle Ficticia 30, 33001 Oviedo (dirección inventada) · comunidad: asturias

Qué prueba: pensionista; mayor de 75; discapacidad 33 % + asistencia (art. 60.3); mínimos de Asturias; sin incremento de gastos del trabajo por discapacidad (pensionista).

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Intereses de una cuenta 600,00 (retención 19 % = 114,00) → base del ahorro **600,00**

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Instituto Ficticio de Pensiones (Q00000301): íntegros 24.000,00, retenciones 2.600,00
- Íntegros (0003) = 24.000,00 (de ellos 24.000,00 de pensión o prestación)
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 0,00
- Rendimiento neto previo (0017) = **24.000,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (pensionista: sin incremento por discapacidad)
- Rendimiento neto (0022) = **22.000,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 24.000,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **22.000,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 22.000,00 = **22.000,00**
- Base imponible del ahorro (0460) = **600,00** (detalle en el apartado 0)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 22.000,00 = **22.000,00**
- Base liquidable del ahorro (0510) = **600,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Gastos de asistencia (art. 60.3): con un 33 % y movilidad reducida acreditada se suman 3.000 € al mínimo por discapacidad
- Estatal (0519): contribuyente 5.550,00 + edad 2.550,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 6.000,00 = **14.100,00**
- Autonómico de Principado de Asturias (0520): contribuyente 6.105,00 + edad 2.805,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 6.600,00 = **15.510,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(22.000,00) 2.382,75 − escala(mínimo 14.100,00) 1.380,75 = 1.002,00
- General autonómica (Principado de Asturias): escala(22.000,00) 2.352,35 − escala(mínimo 15.510,00) 1.487,70 = 864,65
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 600,00 → estatal 57,00 y autonómica 57,00
- Cuota íntegra estatal (0545) = **1.059,00**; autonómica (0546) = **921,65**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 1.059,00 − 0,00 + 921,65 − 0,00 = 1.980,65
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **1.980,65**; pagos a cuenta (0609) = 2.714,00 (incluye 114,00 de otros pagos a cuenta: capital, alquiler o actividades); cuota diferencial (0610) = **-733,35**
- Resultado (0670) = **-733,35** (a devolver)
