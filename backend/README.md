# Backend — resumen rápido

Este directorio contiene el backend de la aplicación (TypeScript + Express) organizado siguiendo DDD / arquitectura hexagonal: capas Domain, Application y Infrastructure.

Ubicación principal del código: `backend/src`

## Qué contiene

- `domain/` — entidades, value objects y contratos (interfaces de repositorio).
- `application/` — casos de uso (orquestación de lógica de negocio) y puertos.
- `infrastructure/` — adaptadores: controladores HTTP, persistencia (InMemory/SQLite), servidor Express y middlewares.
- `tests/` — tests unitarios e integración (Jest).

## Variables de entorno (ejemplo)

Crea un fichero `.env` a partir de `.env.example` (si existe) o exporta las variables en tu entorno. Valores típicos:

- PORT=4000
- NODE_ENV=development
- DATABASE_URL=./data/db.sqlite
- JWT_SECRET=tu_secreto_jwt

## Comandos útiles

Desde la raíz del monorepo:

```
npm run dev:backend     # arranca el backend en modo dev (ts-node-dev)
npm run test:backend    # ejecuta tests en backend (jest)
npm run build:backend   # compila TypeScript -> dist/
```

Directamente dentro de `backend/`:

```
npm install
npm run dev
npm test
npm run test:coverage
npm run build
```

## Estructura de ejemplo (dentro de `src`)

- `domain/entities` — `Transaction.ts`, `Category.ts`, `User.ts`, `MonthlyBudget.ts`.
- `domain/value-objects` — `Amount.ts`, `TransactionId.ts`, `TransactionType.ts`.
- `application/use-cases` — `CreateTransaction.ts`, `GetTransactions.ts`, `GetFinancialSummary.ts`, etc.
- `infrastructure/controllers` — `TransactionController.ts`, `CategoryController.ts`, `AuthController.ts`.
- `infrastructure/persistence` — `InMemory*` y `Sqlite*` repositories.
- `infrastructure/express/server.ts` — entrypoint HTTP.

## Diagrama (mermaid)

> Diagrama fuente disponible en `backend/diagram/architecture.mmd` — puedes renderizarlo localmente con `mmdc` (mermaid-cli) o verlo en GitHub si tu integrador lo soporta.

```mermaid
flowchart TB
    %% High level flow: HTTP -> Controller -> UseCase -> Domain -> Repository -> DB
    subgraph HTTP
        H[HTTP Request / Express Router]
        M[Auth Middleware]
    end

    subgraph Infra [Infrastructure]
        C[Controller (REST)]
        R[Repository (Sqlite / InMemory)]
        S[Express Server]
        DB[(SQLite / DB)]
    end

    subgraph App [Application]
        U[Use Case (orchestration)]
        P[Ports (repository interfaces)]
    end

    subgraph Dom [Domain]
        E[Entities]
        V[Value Objects]
        Rules[Domain Rules]
    end

    H --> M --> C
    C --> U
    U --> P
    P --> R
    R --> DB
    U --> E
    E --> V
    E --> Rules

    classDef infra fill:#fff7ed,stroke:#92400e;
    classDef app fill:#eef2ff,stroke:#3730a3;
    classDef dom fill:#f8fafc,stroke:#111827;
    class HTTP fill:#f0f9ff,stroke:#0ea5e9;

    class C,R,S infra;
    class U,P app;
    class E,V,Rules dom;
    class H,M HTTP;

    %% notes
    click C "./src/infrastructure/controllers" "Controllers folder"
    click U "./src/application/use-cases" "Use-cases folder"
    click R "./src/infrastructure/persistence" "Persistence implementations"

```

Puedes encontrar el diagrama en formato mermaid en `backend/diagram/architecture.mmd` y una versión renderizada SVG en `backend/diagram/architecture.svg` (si la generas). Para renderizar localmente:

```
npx @mermaid-js/mermaid-cli -i backend/diagram/architecture.mmd -o backend/diagram/architecture.svg
```


## Testing y coverage

- Tests unitarios: `npm test` desde `backend/` (usa Jest + ts-jest).
- Coverage: `npm run test:coverage` (genera `backend/coverage/` con `lcov` y HTML).

## Buenas prácticas al desarrollar

- Mantener la lógica de negocio en `domain` y `application`. Los controladores deben ser delgados.
- Añadir tests unitarios por cada Value Object, entidad y caso de uso.
- Para persistencia, implementar repositorios que cumplan los contratos definidos en `domain/repositories`.
