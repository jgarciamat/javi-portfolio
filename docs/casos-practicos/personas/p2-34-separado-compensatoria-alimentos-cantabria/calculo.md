# Persona Ficticia 34: Separado que paga pensión compensatoria y alimentos a sus hijos

> Datos INVENTADOS. Simulación orientativa: no es el modelo oficial. Comprobado el 2026-10-19.

Por sentencia paga 6.000 € de pensión compensatoria a su excónyuge (reduce la base, art. 55) y 4.800 € de alimentos a sus dos hijos, que viven con la madre: no aplica el mínimo por descendientes y la escala se aplica por separado a las anualidades (arts. 64 y 75).

NIF ficticio 00000034B · Calle Ficticia 34, 39001 Santander (dirección inventada) · comunidad: cantabria

Qué prueba: pensión compensatoria (art. 55); anualidades por alimentos a hijos (arts. 64 y 75); sin mínimo por descendientes; escala de Cantabria.

Fuentes: Ley 35/2006 del IRPF ([BOE-A-2006-20764](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)), Reglamento del IRPF ([BOE-A-2007-6820](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820)), Ley 37/1992 del IVA ([BOE-A-1992-28740](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740)) y Manual práctico de Renta 2025 de la AEAT: [trabajo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c03-rendimientos-trabajo.html), [inmuebles](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-inmobiliario.html), [imputación](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c10-regimenes-especiales-imputacion-atribucion-rentas/regimen-imputacion-rentas-inmobiliarias/determinacion-importe-renta-imputable.html), [ganancias](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales.html), [integración](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c12-integracion-compensacion-rentas.html), [reducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c13-determinacion-renta-contribuyente-sujeta-gravamen.html), [mínimo](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c14-adecuacion-impuesto-circunstancias-personales-familiares-contribuyente.html), [cuotas](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras.html), [deducciones](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota.html), [cuota diferencial](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c18-cuota-liquida-resultante-autoliquidacion.html). Autónomos: [instrucciones del 303 de 2026](https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html), [IVA devengado como ingreso en estimación directa](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/ingresos-integros-computables/iva-devengado.html), modelos 130, 111 y 115 (sede de la AEAT) y Orden PJC/297/2026 (RETA). Escalas y mínimos autonómicos: `frontend/src/modules/tools/data/renta/ccaa/<comunidad>.ts`.


## Declaración individual del primer declarante


### 1. Rendimientos del trabajo (LIRPF arts. 17-20)

- Pagador Empresa Ficticia Empleadora, S.L. (B00000901): íntegros 42.000,00, retenciones 7.900,00, Seguridad Social 2.721,60
- Íntegros (0003) = 42.000,00
- Gastos art. 19.2 a) a e): Seguridad Social (0013) 2.721,60
- Rendimiento neto previo (0017) = **39.278,40**
- Otros gastos art. 19.2.f) (0019) = **2.000,00**
- Rendimiento neto (0022) = **37.278,40**

### 4. Reducción por obtención de rendimientos del trabajo (art. 20)

- Sobre el rendimiento neto previo 39.278,40: desde 19.747,50 → 0; con el límite del rendimiento neto → **0,00** (0023)
- Rendimiento neto reducido (0025) = **37.278,40**

### 5. Bases imponibles (LIRPF arts. 45-49)

- Base imponible general (0435) = 37.278,40 = **37.278,40**

### 6. Reducciones de la base y bases liquidables (arts. 50-55 y 84)

- Pensión compensatoria al excónyuge por decisión judicial (art. 55): **6.000,00**. Las anualidades por alimentos a los hijos NO reducen la base: van por el art. 64
- Base liquidable general (0500) = 37.278,40 − 6.000,00 = **31.278,40**
- Base liquidable del ahorro (0510) = **0,00**

### 7. Mínimo personal y familiar (arts. 56-61)

- Estatal (0519): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**
- Autonómico de Cantabria (0520): contribuyente 5.550,00 + edad 0,00 + descendientes 0,00 + ascendientes 0,00 + discapacidad 0,00 = **5.550,00**

### 8. Cuotas íntegras (arts. 63-66 y 74-76)

- Anualidades por alimentos a los hijos por decisión judicial: 4.800,00 < base liquidable general → la escala se aplica por separado (caso oficial renta-c15-02, [Manual](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/especialidades-determinacion-cuota-integra-estatal-autonomica/anualidades-alimentos-favor-hijos/ejemplo-anualidades-alimentos-favor-hijos.html))
- Estatal (art. 64): escala(anualidades 4.800,00) 456,00 + escala(resto 26.478,40) 3.054,51 − escala(mínimo 5.550,00 + 1.980) 715,35 = 2.795,16
- Autonómica (Cantabria) (art. 75): escala(anualidades 4.800,00) 408,00 + escala(resto 26.478,40) 2.779,37 − escala(mínimo 5.550,00 + 1.980) 640,05 = 2.547,32
- Cuota íntegra estatal (0545) = **2.795,16**; autonómica (0546) = **2.547,32**

### 9. Deducciones, cuota resultante y resultado

- Cuota líquida (0587) = 2.795,16 − 0,00 + 2.547,32 − 0,00 = 5.342,48
- Deducción por rendimientos del trabajo (0414) = 0,00 (DA 61.ª: 340 € hasta 16.576 € de íntegros, otras rentas ≤ 6.500; límite: la cuota)
- Cuota resultante (0595) = **5.342,48**; pagos a cuenta (0609) = 7.900,00; cuota diferencial (0610) = **-2.557,52**
- Resultado (0670) = **-2.557,52** (a devolver)
