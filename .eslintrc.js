// .eslintrc.js

module.exports = {
  // 'root: true' impede que o ESLint procure por arquivos de configuração em diretórios pais.
  root: true,

  // Define os ambientes onde o código será executado.
  // Isso adiciona variáveis globais predefinidas para cada ambiente.
  env: {
    node: true,     // Variáveis de ambiente do Node.js (ex: 'process', 'require').
    commonjs: true, // Suporte para módulos CommonJS ('require', 'module.exports').
    es2021: true,   // Suporte para funcionalidades do ES2021 (ECMAScript 12).
    jest: true,     // Variáveis globais do Jest (ex: 'describe', 'it', 'expect').
  },

  // Estende configurações recomendadas. A ordem importa.
  extends: [
    'eslint:recommended', // Regras recomendadas pelo ESLint.
    'plugin:jest/recommended', // Regras recomendadas para arquivos de teste do Jest.
  ],

  // Configurações do parser, que converte o código em uma árvore abstrata que o ESLint pode analisar.
  parserOptions: {
    ecmaVersion: 'latest', // Usa a versão mais recente do ECMAScript.
    sourceType: 'module',  // Permite o uso de 'import'/'export', embora usemos CommonJS.
  },

  // Personalização de regras. Aqui podemos sobrescrever ou adicionar regras específicas.
  // Níveis de erro: "off" (0), "warn" (1), "error" (2).
  rules: {
    // --- Regras de Estilo e Consistência ---
    'indent': ['error', 2, { 'SwitchCase': 1 }], // Força indentação de 2 espaços.
    'linebreak-style': ['error', 'unix'],       // Força o uso de quebras de linha no estilo Unix (LF).
    'quotes': ['error', 'single'],              // Força o uso de aspas simples.
    'semi': ['error', 'always'],                // Força o uso de ponto e vírgula no final das declarações.
    'no-trailing-spaces': 'error',              // Proíbe espaços em branco no final das linhas.
    'comma-dangle': ['error', 'always-multiline'], // Força vírgula no final de listas multilinhas.

    // --- Regras de Qualidade de Código ---
    'no-unused-vars': ['warn', { 'args': 'none' }], // Avisa sobre variáveis não utilizadas (mas ignora argumentos de função).
    'no-console': 'off', // Permite o uso de 'console.log', 'console.error', etc., pois nosso conector loga informações úteis.
    'no-throw-literal': 'error', // Proíbe lançar literais (ex: throw "error") em vez de `new Error()`.
    'eqeqeq': ['error', 'always'], // Força o uso de '===' e '!==' em vez de '==' e '!='.

    // --- Regras Específicas do Jest ---
    'jest/no-disabled-tests': 'warn', // Avisa sobre testes desabilitados (ex: 'xit', 'describe.skip').
    'jest/no-focused-tests': 'error', // Proíbe testes focados (ex: 'fit', 'describe.only') no commit final.
    'jest/no-identical-title': 'error', // Proíbe títulos de testes idênticos.
  },
};
