import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default [
  { ignores: ['**/dist/', '**/node_modules/', '**/.wrangler/', '**/test-results/', '**/playwright-report/'] },
  js.configs.recommended,
  jsdoc.configs['flat/recommended'],
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'jsdoc/require-jsdoc': ['warn', { publicOnly: true }],
    },
  },
  {
    files: ['widget/src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['worker/src/**/*.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['**/test/**/*.js', '**/e2e/**/*.js', '**/*.config.js', 'widget/build.js', 'widget/scripts/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'jsdoc/require-jsdoc': 'off' },
  },
];
