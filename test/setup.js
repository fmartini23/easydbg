// test/setup.js

'use strict';

// 1. Carregar as variáveis de ambiente do arquivo .env
// Isso garante que process.env tenha todas as credenciais necessárias
// antes que qualquer código de teste que dependa delas seja executado.
require('dotenv').config();

// 2. Aumentar o timeout padrão do Jest para todos os testes
// O timeout padrão é de 5000ms (5 segundos). Testes de banco de dados,
// especialmente em ambientes de CI, podem levar mais tempo para conectar,
// criar tabelas e executar consultas. Aumentar para 30 segundos
// previne falhas de teste por timeout.
jest.setTimeout(30000); // 30 segundos

// 3. (Opcional) Adicionar matchers customizados ou extensões do Jest
// Exemplo: Se estivéssemos usando a biblioteca 'jest-extended',
// a importaríamos aqui para disponibilizar seus matchers em todos os testes.
// const { expect } = require('jest-extended');
// global.expect = expect;

// 4. (Opcional) Configurar mocks globais
// Se precisássemos simular um módulo em todos os testes, poderíamos fazer aqui.
// Exemplo:
// jest.mock('../lib/utils/logger', () => ({
//   log: jest.fn(),
//   error: jest.fn(),
// }));

console.log('Ambiente de teste Jest configurado com sucesso pelo setup.js.');
