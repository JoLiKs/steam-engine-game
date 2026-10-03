// Линтер: рекомендованные правила + мягкие настройки под код игры (браузер, node-тесты).
const js = require('@eslint/js');
const globals = require('globals');
module.exports = [
  { ignores: ['dist/**', 'node_modules/**', 'screenshots/**', 'backend/**', '_worker.js', 'tests/compat/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'boot.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser, __SEG_API_BASE__: 'readonly', __SEG_WS_BASE__: 'readonly' } },
    rules: { 'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }], 'no-prototype-builtins': 'off', 'no-constant-condition': ['error', { checkLoops: false }] },
  },
  { files: ['admin/**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: globals.browser }, rules: { 'no-unused-vars': 'off' } },
  { files: ['boot.js'], languageOptions: { sourceType: 'script' } },
  {
    files: ['tests/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}', 'tools/**/*.{js,mjs}', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': 'off', 'no-empty': 'off', 'no-undef': 'off', 'no-useless-escape': 'off', 'no-control-regex': 'off', 'no-cond-assign': 'off', 'no-unsafe-finally': 'off', 'no-redeclare': 'off' },
  },
];
