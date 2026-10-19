# Persona Ficticia 43: Criptomonedas: permuta de BTC por ETH y venta con pérdida

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Cambia 0,2 BTC (comprados en 2022 por 4.000 €) por ETH valorado en 12.000 € con 20 € de comisión: la permuta es una transmisión (ganancia). Después vende la mitad del ETH por 5.000 € (pérdida).

NIF ficticio 00000043C · Calle Ficticia 43, 06800 Mérida (dirección inventada) · comunidad: extremadura

Qué prueba: permuta entre criptomonedas (art. 37.1.h); valor de adquisición del ETH recibido; ganancia y pérdida en el mismo año; modelo 721 (no obligado).

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 0. Rentas del ahorro

- Permuta (art. 37.1.h): valor de transmisión el mayor de lo entregado o lo recibido, 12.000 − comisión 20 = 11.980; coste 4.000 → ganancia **7.980,00**
- El ETH recibido entra con un valor de adquisición de 12.000 (el de mercado del BTC entregado)
- Vende la mitad del ETH por 5.000; coste 6.000 → pérdida **−1.000,00**
- Saldo: 7.980 − 1.000 = **6.980,00** (base del ahorro). El 721 solo obliga con más de 50.000 € en el extranjero a 31-12

### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 29.000,00, retenciones 4.100,00, Seguridad Social 1.879,20
- Íntegros (0003) = 29.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.879,20
- Rendimiento neto previo (0017) = **27.120,80**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **25.120,80**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Otras rentas 6.980,00 > 6.500: no hay reducción.
- Rendimiento neto reducido (0025) = **25.120,80**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 25.120,80 = **25.120,80**
- Base imponible del ahorro (0460) = **6.980,00** (detalle en el apartado 0)

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 25.120,80 = **25.120,80**
- Base liquidable del ahorro (0510) = **6.980,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Extremadura (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(25.120,80) 2.850,87 − escala(mínimo 5.550,00) 527,25 = 2.323,62
- General autonómica (Extremadura): escala(25.120,80) 2.572,14 − escala(mínimo 5.550,00) 444,00 = 2.128,14
- Ahorro: escala de 9,5 / 10,5 / 11,5 / 13,5 / 15 % en cada mitad sobre 6.980,00 → estatal 672,90 y autonómica 672,90
- Cuota íntegra estatal (0545) = **2.996,52**; autonómica (0546) = **2.801,04**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 2.996,52 − 0,00 + 2.801,04 − 0,00 = 5.797,56
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **5.797,56**; pagos a cuenta (0609) = 4.100,00; cuota diferencial (0610) = **1.697,56**
- Resultado (0670) = **1.697,56** (a ingresar)
