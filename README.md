# 📁 Estructura del Proyecto - Money App

## 🎯 Estructura Completa

```
money-app/
│
├── 📄 package.json              # Workspace raíz con scripts para todo el proyecto
├── 📄 README.md                 # Documentación principal
├── 📄 .gitignore                # Archivos a ignorar en git
│
├── 📂 backend/                  # Backend con Node.js + Express
│   ├── 📄 package.json          # Dependencias del backend
│   ├── 📄 tsconfig.json         # Configuración TypeScript
│   ├── 📄 jest.config.js        # Configuración Jest
│   ├── 📄 .eslintrc.js          # Configuración ESLint
│   ├── 📄 .env.example          # Variables de entorno ejemplo
│   │
│   ├── 📂 src/                  # Código fuente (Arquitectura Hexagonal)
│   │   │
│   │   ├── 📂 domain/           # ⭕ CAPA DE DOMINIO
│   │   │   ├── entities/        # Entidades del dominio (Shipment, Product, etc)
│   │   │   ├── value-objects/   # Value Objects (ShipmentId, TransportType, etc)
│   │   │   └── repositories/    # Interfaces de repositorios (puertos)
│   │   │
│   │   ├── 📂 application/      # ⭕ CAPA DE APLICACIÓN
│   │   │   ├── use-cases/       # Casos de uso (CreateShipment, GetShipment, etc)
│   │   │   └── ports/           # Puertos (interfaces para infraestructura)
│   │   │
│   │   ├── 📂 infrastructure/   # ⭕ CAPA DE INFRAESTRUCTURA
│   │   │   ├── controllers/     # Controladores REST
│   │   │   ├── persistence/     # Implementación de repositorios
│   │   │   └── express/         # Configuración de Express (server.ts, routes)
│   │   │
│   │   └── 📂 shared/           # ⭕ CÓDIGO COMPARTIDO
│   │       ├── utils/           # Utilidades
│   │       └── types/           # Tipos compartidos
│   │
│   └── 📂 tests/                # Tests
│       ├── unit/                # Tests unitarios
│       └── integration/         # Tests de integración
│
│
└── 📂 frontend/                 # Frontend con React 19
    ├── 📄 package.json          # Dependencias del frontend
    ├── 📄 tsconfig.json         # Configuración TypeScript
    ├── 📄 tsconfig.node.json    # Configuración TS para Vite
    ├── 📄 vite.config.ts        # Configuración Vite
    ├── 📄 jest.config.js        # Configuración Jest
    ├── 📄 cypress.config.ts     # Configuración Cypress
    ├── 📄 .eslintrc.js          # Configuración ESLint (con reglas SOLID)
    ├── 📄 index.html            # HTML principal
    │
    ├── 📂 public/               # Assets estáticos
    │
    ├── 📂 src/                  # Código fuente (DDD)
    │   │
    │   ├── 📄 main.tsx          # Punto de entrada React
    │   ├── 📄 App.tsx           # Componente principal
    │   ├── 📄 setupTests.ts     # Setup para Jest
    │   ├── 📄 vite-env.d.ts     # Tipos de Vite
    │   │
    │   ├── 📂 modules/          # 🎯 MÓDULOS POR DOMINIO
    │   │   └── shipments/       # Módulo de envíos
    │   │       ├── domain/      # Entidades y lógica de dominio
    │   │       ├── application/ # Casos de uso y hooks
    │   │       ├── infrastructure/ # Servicios y adaptadores API
    │   │       └── ui/          # Componentes React (presentación)
    │   │
    │   ├── 📂 shared/           # 🎯 CÓDIGO COMPARTIDO
    │   │   ├── components/      # Componentes reutilizables
    │   │   ├── hooks/           # Hooks personalizados
    │   │   ├── utils/           # Utilidades
    │   │   └── types/           # Tipos compartidos
    │   │
    │   └── 📂 core/             # 🎯 CONFIGURACIÓN CORE
    │       ├── config/          # Configuración de la app
    │       └── api/             # Cliente HTTP base
    │
    └── 📂 cypress/              # Tests E2E
        ├── e2e/                 # Specs de tests e2e
        ├── fixtures/            # Datos de prueba
        └── support/             # Comandos y configuración
            ├── e2e.ts
            └── commands.ts
```

## 🎨 Principios Aplicados

### Backend - Arquitectura Hexagonal

**Dominio (Centro)**
- Contiene la lógica de negocio pura
- Sin dependencias de frameworks
- Entidades y Value Objects

**Aplicación (Casos de Uso)**
- Orquesta la lógica de dominio
- Define interfaces (puertos)
- Casos de uso específicos

**Infraestructura (Adaptadores)**
- Implementa los puertos
- API REST con Express
## Money Manager — Estructura y arquitectura (DDD)

Este repositorio contiene una aplicación para gestionar finanzas personales (gastos, ingresos, categorías y presupuestos). Está organizada siguiendo principios de DDD/arquitectura hexagonal para mantener la lógica de negocio aislada y testable.

## Visión rápida

- Monorepo con dos workspaces: `backend` y `frontend`.
- Backend en TypeScript con arquitectura por capas (Domain / Application / Infrastructure / Shared).
- Frontend en React + Vite siguiendo una estructura por módulos (DDD aplicada en UI).

## Estructura relevante (resumen)

- `package.json` (raíz): scripts para arrancar ambos workspaces y tareas comunes.
- `backend/`: código del backend (TypeScript + Express). Aquí está la arquitectura DDD/hexagonal.
- `frontend/`: UI en React (Vite) organizada por módulos/dominios.

## Backend — ubicación y responsabilidades

Ruta principal: `backend/src`

Estructura dentro de `backend/src` (conceptual):

- `domain/` — Entidades, Value Objects y contratos (interfaces) de repositorio.
    - ejemplos en el repo: `entities/Category.ts`, `entities/Transaction.ts`, `entities/User.ts` y value-objects (`Amount.ts`, `TransactionId.ts`, `TransactionType.ts`).

- `application/` — Casos de uso (orquestación de la lógica de dominio) y puertos (interfaces que los adaptadores deben implementar).
    - Ejemplos: `use-cases/CreateTransaction.ts`, `use-cases/GetTransactions.ts`, `use-cases/GetFinancialSummary.ts`, `use-cases/Auth.ts`, `use-cases/Budget.ts`.

- `infrastructure/` — Adaptadores: controladores HTTP, servidores, persistencia e implementaciones concretas de repositorios.
    - Controladores REST: `infrastructure/controllers/*Controller.ts` (p.ej. `TransactionController.ts`, `CategoryController.ts`, `AuthController.ts`).
    - Express server: `infrastructure/express/server.ts`.
    - Persistencia: implementaciones concretas (`persistence/`) como `InMemoryTransactionRepository.ts`, `SqliteTransactionRepository.ts`, `SqliteDb.ts`, `SqliteUserRepository.ts`, `SqliteMonthlyBudgetRepository.ts`.

- `shared/` — utilidades, tipos y helpers compartidos por las capas.

### Contratos / Puertos

Los puertos (interfaces) están en `domain/repositories` y definen las operaciones que la capa de aplicación necesita sin acoplarse a la tecnología de persistencia. Implementaciones concretas están en `infrastructure/persistence`.

## Principios aplicados

- Separación clara: la lógica de dominio (entidades y reglas) no conoce Express, la DB ni detalles de infra.
- Dependencia en abstracciones: la capa de aplicación depende de interfaces; la infraestructura implementa esas interfaces.
- Repositorios y VO: identificadores y tipos del dominio encapsulados en Value Objects (p. ej. `TransactionId`, `Amount`).
- Tests: la organización facilita tests unitarios de dominio y tests de integración/infrastuctura.

## API y puntos clave del backend

- Entrypoint del servidor: `backend/src/infrastructure/express/server.ts` — configuración de rutas, middlewares y arranque.
- Controladores: `backend/src/infrastructure/controllers/*Controller.ts` — exponen endpoints que usan casos de uso de `application/use-cases`.
- Repositorios en memoria para tests: `backend/src/infrastructure/persistence/InMemory*.ts`.
- Repositorios SQLite para persistencia real: `backend/src/infrastructure/persistence/Sqlite*.ts` y `SqliteDb.ts`.
- Autenticación: `infrastructure/controllers/AuthController.ts` y `express/authMiddleware.ts`.

### Documentación relacionada

- `backend/README.md` — resumen y comandos del backend (variables de entorno, testing).
- `backend/ONBOARDING.md` — checklist de onboarding para desarrolladores que quieran levantar el backend en local.

## Comandos — cómo ejecutar (desde la raíz del monorepo)

- Instalar todo:

```
npm run install:all
```

- Ejecutar backend y frontend en dev (concurrente):

```
npm run dev
```

- Ejecutar solo backend (desde la raíz):

```
npm run dev:backend
```

- Ejecutar solo frontend (desde la raíz):

```
npm run dev:frontend
```

Alternativamente, dentro del directorio `backend`:

```
cd backend
npm install
npm run dev        # arranca con ts-node-dev: src/infrastructure/express/server.ts
```

Y para producción/compilar:

```
cd backend
npm run build      # compila con tsc -> genera dist/
npm start          # ejecuta dist/infrastructure/express/server.js
```

## Tests

- Backend: `backend` usa Jest. Desde la raíz:

```
npm run test:backend
```

O directamente:

```
cd backend
npm test
```

## Archivos y módulos a revisar primero (para entender el dominio)

- Casos de uso principales: `backend/src/application/use-cases/*` (CreateTransaction, GetTransactions, GetFinancialSummary, CreateCategory, DeleteTransaction, Auth, Budget).
- Entidades del dominio: `backend/src/domain/entities/*` (Transaction, Category, MonthlyBudget, User).
- Value objects: `backend/src/domain/value-objects/*` (Amount, TransactionId, TransactionType, ShipmentId si aplica).
- Repositorios (interfaces): `backend/src/domain/repositories/*`.

## Buenas prácticas y recomendaciones internas

- Añadir nuevas reglas de negocio en `domain` y exponer operaciones mediante un caso de uso en `application`.
- Implementar adaptadores concretos en `infrastructure` (p. ej. nuevos repositorios) que cumplan los puertos.
- Mantener los controladores delgados: recibir request -> validar -> llamar al caso de uso -> mapear respuesta.

---

## 🚀 Release a producción (develop → master)

El proceso de release está **automatizado** mediante GitHub Actions.

### Pasos

```bash
# 1. Estar en develop con todo commiteado y pusheado
git checkout develop && git pull origin develop

# 2. Abrir la PR
gh pr create --base master --head develop --title "Release develop"

# 3. El workflow automático hace:
#    ✅ Añade la label "release"
#    ✅ Calcula el bump semver (major/minor/patch) según los commits
#    ✅ Actualiza "version" en frontend/package.json y commitea a develop
#    ✅ Pone el número de versión en el título de la PR
#    ✅ Genera el changelog agrupado por tipo de commit en el body de la PR

# 4. Revisar y mergear
gh pr merge --merge
```

### Convención de commits → bump de versión

| Prefijo | Bump |
|---|---|
| `feat!:` o `BREAKING CHANGE` | major `1.0.0 → 2.0.0` |
| `feat:` | minor `1.0.0 → 1.1.0` |
| `fix:`, `chore:`, `refactor:`… | patch `1.0.0 → 1.0.1` |

> Documentación completa: [`.agent/workflows/release-to-master.md`](.agent/workflows/release-to-master.md)

---
