// ESLint for `npm run lint` (the standard Vite + React + TypeScript setup).
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.d.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      {
        allowConstantExport: true,
        // small helpers that live beside the notepad components on purpose
        allowExportNames: ['fmtDate', 'useAnnounce', 'drafts', 'isIPadOS', 'useScrollToNote'],
      },
    ],
    // same rule as tsc's noUnusedLocals: a leading _ marks "unused on purpose"
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
  },
};
