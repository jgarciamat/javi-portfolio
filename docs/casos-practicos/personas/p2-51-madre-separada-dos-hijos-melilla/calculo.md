# Persona Ficticia 51: Madre separada con dos hijos que no recibe alimentos

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Separada, vive con sus dos hijos (8 y 5 años) y no cobra anualidades por alimentos: mínimo completo por los dos hijos y deducción abonable del art. 81 bis.1.d. Reside y trabaja en Melilla: deducción del 60 %. (La conjunta monoparental no se calcula aquí.)

NIF ficticio 00000051M · Calle Ficticia 51, 52001 Melilla (dirección inventada) · comunidad: melilla

Qué prueba: ascendiente separado con dos hijos sin alimentos (art. 81 bis); mínimo por descendientes completo; deducción del 60 % de Melilla.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 26.000,00, retenciones 1.500,00, Seguridad Social 1.684,80
- Íntegros (0003) = 26.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 1.684,80
- Rendimiento neto previo (0017) = **24.315,20**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **22.315,20**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 24.315,20: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **22.315,20**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 22.315,20 = **22.315,20**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Base liquidable general (0500) = 22.315,20 = **22.315,20**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 5.100,00 + ascendientes 0,00 + discapacidad 0,00 = **10.650,00**
- Autonómico de Melilla (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 5.100,00 + ascendientes 0,00 + discapacidad 0,00 = **10.650,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- General estatal: escala(22.315,20) 2.430,03 − escala(mínimo 10.650,00) 1.011,75 = 1.418,28
- General autonómica (Melilla): escala(22.315,20) 2.430,03 − escala(mínimo 10.650,00) 1.011,75 = 1.418,28
- Cuota íntegra estatal (0545) = **1.418,28**; autonómica (0546) = **1.418,28**

### 9. Deducciones, cuota resultante y resultado

- Ascendiente separado con dos hijos sin anualidades por alimentos (art. 81 bis.1.d): 1.200 €; tope de cotizaciones 1.684,80
- Rentas obtenidas en Ceuta o Melilla (art. 68.4 LIRPF): 60 % de la suma de las cuotas íntegras (1.418,28 + 1.418,28) (todas las rentas se obtienen allí, art. 68.4.3.º) = 1.701,94: la mitad en cada cuota (850,97 estatal y 850,97 autonómica)
- Cuota líquida (0587) = 1.418,28 − 850,97 + 1.418,28 − 850,97 = 1.134,62
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **1.134,62**; pagos a cuenta (0609) = 1.500,00; cuota diferencial (0610) = **-365,38**
- Deducciones abonables (art. 81 y 81 bis, sin abono anticipado) = 1.200,00
- Resultado (0670) = **-1.565,38** (a devolver)
