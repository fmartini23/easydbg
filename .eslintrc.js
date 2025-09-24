// .eslintrc.js

'use strict';

module.exports = {
  // Ambiente base para todo o projeto
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  // Estende as regras recomendadas do ESLint
  extends: 'eslint:recommended',
  // Regras que se aplicam a todos os arquivos
  rules: {
    'strict': ['error', 'global'], // Exige 'use strict'; no topo dos arquivos
    'no-console': 'warn',          // Avisa sobre o uso de console.*
    'no-unused-vars': ['warn', { 'args': 'none' }], // Avisa sobre variáveis não usadas
    'semi': ['error', 'always'],   // Exige ponto e vírgula
    'quotes': ['error', 'single', { 'avoidEscape': true }], // Exige aspas simples
  },
  // Seção de "overrides" para aplicar regras a arquivos específicos
  overrides: [
    {
      // Regras específicas para arquivos de teste
      files: ['test/**/*.js'],
      // Estende as regras recomendadas do plugin do Jest
      extends: ['plugin:jest/recommended'],
      // Desabilita a regra 'no-console' apenas para os testes
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Regras específicas para a CLI
      files: ['bin/**/*.js'],
      // Desabilita a regra 'no-console' apenas para a CLI
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
