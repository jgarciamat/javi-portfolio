# Persona Ficticia 13: Hipoteca de la vivienda habitual comprada en 2010

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Paga 10.000 € al año de hipoteca (capital e intereses) de la vivienda que compró en 2010 y por la que ya dedujo: régimen transitorio, 15 % de hasta 9.040 €.

NIF ficticio 00000013J · Calle Ficticia 13, 28001 Madrid (dirección inventada) · comunidad: madrid

Fuentes: Ley 35/2006 del IRPF (BOE-A-2006-20764) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Las escalas y mínimos autonómicos se toman de `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts` (cada archivo cita su fuente). Autónomos: modelos 130, 303, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA).


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Íntegros (0012) = 42.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.667,00
- Rendimiento neto previo (0017) = 42.000,00 − 2.667,00 = **39.333,00**
- Otros gastos art. 19.2.f) (0019) = **2.000,00** (2.000 general)
- Rendimiento neto (0022) = 39.333,00 − 2.000,00 = **37.333,00**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 39.333,00: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **37.333,00**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 37.333,00 = **37.333,00**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 37.333,00 = **37.333,00**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Comunidad de Madrid (0520): contribuyente 5.956,65 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.956,65**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(37.333,00) 4.757,36 − escala(mínimo 5.550,00) 527,25 = 4.230,11
- General autonómica (Comunidad de Madrid): escala(37.333,00) 4.173,29 − escala(mínimo 5.956,65) 506,32 = 3.666,97
- Cuota íntegra estatal (0545) = **4.230,11**; autonómica (0546) = **3.666,97**

### 9. Deducciones, cuota resultante y resultado

- Vivienda habitual, régimen transitorio (DT 18.ª LIRPF): base máxima 9.040 € × 7,5 % tramo estatal = 678 € + 9.040 × 7,5 % tramo autonómico (Madrid no tiene porcentaje propio) = 678 €
- Cuota líquida (0587) = 4.230,11 − 678,00 + 3.666,97 − 678,00 = 6.541,08
- Deducción por rendimientos del trabajo (0414) = 0,00 (340 € hasta 16.576 € de íntegros del trabajo, menos 0,2 por euro hasta 18.276; otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **6.541,08**; retenciones (0609) = 7.600,00; cuota diferencial (0610) = **-1.058,92**
- Resultado (0670) = **-1.058,92** (a devolver)
