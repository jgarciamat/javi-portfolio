# Persona Ficticia 28: Inquilino con contrato de 2014: deducción estatal transitoria

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Paga 7.200 € de alquiler de su vivienda habitual con contrato de 2014 y base imponible de 20.476 €: la base máxima de 9.040 € baja por tramo.

NIF ficticio 00000028M · Calle Ficticia 28, 47001 Valladolid (dirección inventada) · comunidad: castilla-y-leon

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 24.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.524,00
- Rendimiento neto previo (0017) = 24.000,00 − 1.524,00 = **22.476,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 22.476,00 − 2.000,00 = **20.476,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 22.476,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **20.476,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 20.476,00 = **20.476,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 20.476,00 = **20.476,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Castilla y León (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(20.476,00) 2.154,15 − escala(mínimo 5.550,00) 527,25 = 1.626,90
- General autonómica (Castilla y León): escala(20.476,00) 2.089,14 − escala(mínimo 5.550,00) 499,50 = 1.589,64
- Cuota íntegra estatal (0545) = **1.626,90**; autonómica (0546) = **1.589,64**

### 9. Deducciones, cuota resultante y resultado

- Alquiler de vivienda habitual, régimen transitorio (DT 15.ª LIRPF, art. 68.7 en su redacción de 2014): base imponible 20.476,00: base máxima 9.040 − 1,4125 × (20.476,00 − 17.707,20) = 5.129,07; 5,025 % × min(7.200,00, 5.129,07) = 257,74 en la cuota estatal (0562) y otro tanto en la autonómica (0563): 515,48 en total. Se rebaja la BASE máxima, no el importe de la deducción (caso oficial renta-c16-03)
- Cuota líquida (0587) = 1.626,90 − 257,74 + 1.589,64 − 257,74 = 2.701,06
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **2.701,06**; retenciones (0609) = 2.900,00; cuota diferencial (0610) = **-198,94**
- Resultado (0670) = **-198,94** (a devolver)
