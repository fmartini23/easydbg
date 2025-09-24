// eslint.config.js
'use strict';

// Importa o plugin do Jest
const jestPlugin = require('eslint-plugin-jest');

module.exports = [
  {
    // Configuração global para todos os arquivos
    languageOptions: {
      ecmaVersion: 2021, // Versão do ECMAScript
      sourceType: 'commonjs', // Nosso projeto usa CommonJS (require/module.exports)
      globals: {
        node: true, // Globais do Node.js (process, etc.)
        es2021: true,
      },
    },
    rules: {
      'no-console': 'warn', // Avisa sobre o uso de console.log
      'no-unused-vars': ['warn', { 'args': 'none' }], // Avisa sobre variáveis não usadas
      'strict': ['error', 'global'], // Exige 'use strict'
      'semi': ['error', 'always'], // Exige ponto e vírgula
      'quotes': ['error', 'single'], // Exige aspas simples
    },
  },
  {
    // Configuração específica para arquivos de teste
    files: ['test/**/*.js'],
    ...jestPlugin.configs['flat/recommended'], // Aplica as regras recomendadas do Jest
    rules: {
      ...jestPlugin.configs['flat/recommended'].rules,
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    },
  },
  {
    // Ignora os diretórios e arquivos que não queremos analisar
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'examples/',
      'bin/',
    ],
  },
];
