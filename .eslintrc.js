module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['api/**/*.mjs', 'server/**/*.mjs'],
      parser: 'espree',
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      env: { node: true, es2022: true },
      globals: { Response: 'readonly' },
    },
  ],
};
