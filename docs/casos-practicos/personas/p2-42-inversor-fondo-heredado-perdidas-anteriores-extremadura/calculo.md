# Persona Ficticia 42: Inversor con dividendos, un fondo heredado y pérdidas de 2022 por compensar

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Intereses, dividendos y gastos de custodia; reembolsa un fondo heredado en 2023 (valor de adquisición: el del Impuesto sobre Sucesiones) con ganancia y vende acciones con pérdida; compensa 2.000 € de pérdidas patrimoniales de 2022.

NIF ficticio 00000042L · Calle Ficticia 42, 06800 Mérida (dirección inventada) · comunidad: extremadura

Qué prueba: rendimientos del capital mobiliario y gastos de custodia; fondo heredado: valor del ISD; integración y compensación de ganancias y pérdidas (art. 49); pérdidas de años anteriores (4 años); retenciones del capital.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Capital mobiliario: intereses 1.200 + dividendos 2.500 − custodia y administración 60 (art. 26.1.a) = **3.640,00**
- Fondo heredado en 2023: valor de adquisición el declarado en Sucesiones, 30.000; reembolso 36.500 → ganancia **6.500,00**
- Acciones compradas en 2021 por 9.000 y vendidas por 7.500 → pérdida **−1.500,00**
- Ganancias y pérdidas entre sí: 6.500 − 1.500 = 5.000; menos pérdidas pendientes de 2022 (−2.000, art. 49.1.b, dentro de los 4 años) = **3.000,00**
- Base del ahorro = 3.640 + 3.000 = **6.640,00**; retenciones del capital 228 (intereses) + 475 (dividendos) + 1.235 (fondo) = 1.938,00

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 52.000,00, retenciones 10.200,00, Seguridad Social 3.369,60
- Íntegros (0003) = 52.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 3.369,60
- Rendimiento neto previo (0017) = **48.630,40**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **46.630,40**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Otras rentas 6.640,00 > 6.500: no hay reducción.
- Rendimiento neto reducido (0025) = **46.630,40**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 46.630,40 = **46.630,40**
- Base imponible del ahorro (0460) = **6.640,00** (detalle en el apartado 0)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 46.630,40 = **46.630,40**
- Base liquidable del ahorro (0510) = **6.640,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Extremadura (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(46.630,40) 6.477,37 − escala(mínimo 5.550,00) 527,25 = 5.950,12
- General autonómica (Extremadura): escala(46.630,40) 6.736,38 − escala(mínimo 5.550,00) 444,00 = 6.292,38
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 6.640,00 → estatal 637,20 y autonómica 637,20
- Cuota íntegra estatal (0545) = **6.587,32**; autonómica (0546) = **6.929,58**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 6.587,32 − 0,00 + 6.929,58 − 0,00 = 13.516,90
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **13.516,90**; pagos a cuenta (0609) = 12.138,00 (incluye 1.938,00 de retenciones del capital o del alquiler); cuota diferencial (0610) = **1.378,90**
- Resultado (0670) = **1.378,90** (a ingresar)
