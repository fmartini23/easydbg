// lib/errors/QueryError.js

'use strict';

/**
 * @class QueryError
 *
 * Um erro customizado que é lançado quando uma consulta SQL falha.
 * Ele encapsula a mensagem de erro amigável, a consulta que falhou,
 * seus bindings e o erro original do driver do banco de dados.
 */
class QueryError extends Error {
  /**
   * @param {string} message - A mensagem de erro amigável e legível.
   * @param {object} context - Um objeto contendo informações de depuração.
   * @param {string} context.sql - A consulta SQL que falhou.
   * @param {Array} context.bindings - Os bindings (parâmetros) para a consulta.
   * @param {Error} context.originalError - O erro original lançado pelo driver do banco de dados.
   */
  constructor(message, { sql, bindings, originalError }) {
    // Passa a mensagem principal para o construtor da classe Error pai.
    super(message);

    // Define o nome do erro para fácil identificação em blocos catch.
    this.name = 'QueryError';

    // Anexa as informações de contexto de depuração à instância do erro.
    this.sql = sql;
    this.bindings = bindings;
    this.originalError = originalError;
  }
}

module.exports = QueryError;
