# Javi Portfolio

[![CI/CD](https://github.com/jgarciamat/javi-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/jgarciamat/javi-portfolio/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jgarciamat/javi-portfolio/branch/master/graph/badge.svg)](https://codecov.io/gh/jgarciamat/javi-portfolio)

Portfolio web application con React y FastAPI, siguiendo arquitectura DDD.

## Tecnologías
- Frontend:
  - React 19
  - TypeScript
  - Sass
  - Jest + Testing Library
- Backend:
  - Python FastAPI
  - MyPy para type checking

## Scripts Disponibles

### Frontend
```bash
npm run dev            # Inicia el servidor de desarrollo
npm run build         # Construye la aplicación
npm test             # Ejecuta los tests
npm run test:coverage # Ejecuta los tests con cobertura
npm run lint         # Ejecuta el linter
```

### Backend
```bash
pip install -r requirements.txt  # Instala dependencias
uvicorn api.main:app --reload   # Inicia el servidor de desarrollo
pytest                          # Ejecuta los tests
mypy .                          # Verifica tipos
```

## CI/CD
El proyecto utiliza GitHub Actions para:
- Verificación de tipos
- Linting
- Tests y cobertura de código
- Build
- Integración con Codecov

Los requisitos de cobertura son:
- Cobertura general del proyecto: 90%
- Cobertura de cambios nuevos: 95%

## Plugins de Vite

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
