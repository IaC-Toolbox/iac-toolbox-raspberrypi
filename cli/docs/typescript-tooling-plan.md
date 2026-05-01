# TypeScript and code-quality tooling plan

## Goal

Bring `iac-toolbox-cli` onto a cleaner TypeScript-based developer workflow with linting and formatting commands, while keeping the current Ink CLI behavior intact.

## Requested changes

- migrate the CLI source from plain JavaScript to TypeScript
- add a TypeScript configuration suitable for a small Node-based Ink CLI
- add linting in the style Viktor commonly uses in other projects
- add formatting support
- expose pnpm commands for lint and format
- keep the setup straightforward and easy to extend

## Proposed implementation

1. Replace the Babel-based development entrypoint with a TypeScript-friendly setup.
2. Convert `src/app.js` and `src/cli.js` to `.tsx` / `.ts` as appropriate.
3. Add `tsconfig.json` tuned for Node + React JSX in Ink.
4. Add ESLint with TypeScript and React support.
5. Add Prettier and matching scripts.
6. Update `.gitignore` if build artifacts need to be excluded.
7. Update README with the new development commands.

## Expected scripts

- `dev`
- `build`
- `start`
- `typecheck`
- `lint`
- `lint:fix`
- `format`
- `format:check`

## Notes

- Keep implementation small; this is a tooling upgrade, not a product redesign.
- Preserve the current CLI output and visual feel unless a small refactor is needed for TypeScript correctness.
- Prefer widely used defaults over clever custom setup.

## Reference preferences from Viktor

Use these conventions as the preferred baseline unless a small adaptation is required for this Node + Ink CLI:

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "lib"]
}
```

### `.eslintrc`

```json
{
  "root": true,
  "env": { "node": true, "browser": true, "es2020": true },
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "ignorePatterns": ["dist", ".eslintrc.cjs"],
  "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
  "settings": { "react": { "version": "detect" } },
  "plugins": ["react-refresh", "react", "@typescript-eslint", "prettier"],
  "rules": {
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
    "react/jsx-no-target-blank": "off",
    "quotes": [2, "single", { "avoidEscape": true }]
  }
}
```

### `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80
}
```

### `.eslintignore`

```txt
node_modules
build
coverage
cypress-bin

# temporary ignored
src/react-app-env.d.ts
```

## Package and script conventions from Viktor's reference project

Prefer these conventions where they fit this CLI project:

- add `engines` for modern Node/pnpm versions when appropriate
- use `typescript`, `eslint`, `prettier`, `@typescript-eslint/*`, `eslint-config-prettier`, `eslint-plugin-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`
- prefer a `lint` script shaped like:
  - `tsc --noEmit && eslint . --ext .js,.jsx,.ts,.tsx`
- prefer a fix script named:
  - `lint-fix`
- keep script names practical and unsurprising for the repo

## Implementation note

Follow the reference closely, but make pragmatic adjustments where Node/Ink CLI requirements differ from a browser-oriented app template. Preserve a good local developer experience for an Ink-based Node CLI.
