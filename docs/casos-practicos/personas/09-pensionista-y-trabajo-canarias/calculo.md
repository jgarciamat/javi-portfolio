# Persona Ficticia 09: Pensionista de 66 años que además trabaja a tiempo parcial

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Pensión de 11.000 € y un trabajo de 5.500 €: dos pagadores. Íntegros por debajo de 16.576 €: la deducción de la casilla 0414 sale igual cuenten o no las pensiones.

NIF ficticio 00000009D · Calle Ficticia 9, 35001 Las Palmas de Gran Canaria (dirección inventada) · comunidad: canarias

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 16.500,00 (de ellos 11.000,00 de pensión o prestación)
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 357,50
- Rendimiento neto previo (0017) = 16.500,00 − 357,50 = **16.142,50**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 16.142,50 − 2.000,00 = **14.142,50**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 16.142,50: 7.302 − 1,75 × (16.142,50 − 14.852); con el límite del rendimiento neto → **5.043,63** (0023)
- Rendimiento neto reducido (0025) = **9.098,87**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 9.098,87 = **9.098,87**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 9.098,87 = **9.098,87**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 1.150,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **6.700,00**
- Autonómico de Canarias (0520): contribuyente 5.606,00 + edad 1.162,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **6.768,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(9.098,87) 864,39 − escala(mínimo 6.700,00) 636,50 = 227,89
- General autonómica (Canarias): escala(9.098,87) 818,90 − escala(mínimo 6.768,00) 609,12 = 209,78
- Cuota íntegra estatal (0545) = **227,89**; autonómica (0546) = **209,78**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 227,89 − 0,00 + 209,78 − 0,00 = 437,67
- Deducción por rendimientos del trabajo (0414) = 340,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **97,67**; retenciones (0609) = 600,00; cuota diferencial (0610) = **-502,33**
- Resultado (0670) = **-502,33** (a devolver)
