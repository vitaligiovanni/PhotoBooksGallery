/* Basic ESLint config for React + TS */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: undefined,
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    es2021: true,
    node: false,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'src/lib/photobookUtils_old.ts',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
