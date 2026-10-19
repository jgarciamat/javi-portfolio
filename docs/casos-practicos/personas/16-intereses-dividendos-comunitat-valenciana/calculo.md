# Persona Ficticia 16: Asalariado con intereses y dividendos

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Intereses de una cuenta de 700 € y dividendos de 1.300 €, con retención del 19 %.

NIF ficticio 00000016Q · Calle Ficticia 16, 46001 València (dirección inventada) · comunidad: comunitat-valenciana

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Intereses 700,00 + dividendos 1.300,00 = rendimientos del capital mobiliario **2.000,00** (base del ahorro)
- Retenciones del capital: 133,00 + 247,00 = 380,00 (se suman a las del trabajo, 3.600,00 → 3.980,00)

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 26.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.651,00
- Rendimiento neto previo (0017) = 26.000,00 − 1.651,00 = **24.349,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 24.349,00 − 2.000,00 = **22.349,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 24.349,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **22.349,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 22.349,00 = **22.349,00**
- Base imponible del ahorro (0460) = **2.000,00** (detalle en el apartado del ahorro)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 22.349,00 = **22.349,00**
- Base liquidable del ahorro (0510) = **2.000,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Comunitat Valenciana (0520): contribuyente 6.105,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **6.105,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(22.349,00) 2.435,10 − escala(mínimo 5.550,00) 527,25 = 1.907,85
- General autonómica (Comunitat Valenciana): escala(22.349,00) 2.332,35 − escala(mínimo 6.105,00) 549,45 = 1.782,90
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 2.000,00 → estatal 190,00 y autonómica 190,00
- Cuota íntegra estatal (0545) = **2.097,85**; autonómica (0546) = **1.972,90**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 2.097,85 − 0,00 + 1.972,90 − 0,00 = 4.070,75
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **4.070,75**; retenciones (0609) = 3.980,00; cuota diferencial (0610) = **90,75**
- Resultado (0670) = **90,75** (a ingresar)
