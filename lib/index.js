// lib/index.js

'use strict';

/**
 * easydbg - Um Conector de Banco de Dados e Query Builder para Node.js
 *
 * @module easydbg
 *
 * Ponto de entrada principal do pacote.
 * Exporta a classe EasyDBGClient, que é a fachada principal para todas as
 * funcionalidades da biblioteca.
 */

const EasyDBGClient = require('./client');

// --- Exportação Principal ---

/**
 * Cria e retorna uma nova instância do EasyDBGClient.
 * Esta é a função principal que os usuários irão importar.
 *
 * @param {object} config - A configuração da conexão, passada diretamente para o construtor do cliente.
 * @returns {EasyDBGClient} Uma nova instância do cliente de banco de dados.
 *
 * @example
 * const easydbg = require('easydbg');
 *
 * const db = easydbg({
 *   client: 'postgres',
 *   connection: {
 *     host: 'localhost',
 *     user: 'user',
 *     password: 'password',
 *     database: 'my_db',
 *   },
 * });
 *
 * async function getUsers() {
 *   const users = await db.table('users').where('active', true).get();
 *   console.log(users);
 *   await db.disconnect();
 * }
 *
 * getUsers();
 */
function createClient(config) {
  return new EasyDBGClient(config);
}

// Exporta a função principal como o default do módulo.
module.exports = createClient;

// --- Exportações Adicionais (Opcional) ---

// Também exportamos a classe diretamente, caso alguém prefira usar `new EasyDBGClient()`.
module.exports.EasyDBGClient = EasyDBGClient;

// Exportar as classes de erro é uma boa prática para permitir tratamento de erros específico.
module.exports.errors = {
  ConnectionError: require('./errors/ConnectionError'),
  QueryError: require('./errors/QueryError'),
  TransactionError: require('./errors/TransactionError'),
  MigrationError: require('./errors/MigrationError'),
};
