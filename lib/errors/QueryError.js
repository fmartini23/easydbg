// lib/errors/QueryError.js

'use strict';

/**
 * @class QueryError
 * @extends Error
 *
 * Representa um erro que ocorre durante a execução de uma consulta SQL no banco de dados.
 *
 * Esta classe é usada para encapsular erros provenientes diretamente dos drivers
 * do banco de dados durante operações como SELECT, INSERT, UPDATE ou DELETE.
 * Ela anexa informações contextuais, como a consulta SQL que falhou e os parâmetros
 * utilizados, para facilitar a depuração.
 *
 * @example
 * try {
 *   await db.table('users').insert({ email: 'user@example.com' }); // Supondo que o email já existe
 * } catch (error) {
 *   if (error instanceof QueryError) {
 *     console.error(`Falha na consulta SQL: ${error.message}`);
 *     console.error(`SQL: ${error.sql}`);
 *     console.error(`Bindings: ${JSON.stringify(error.bindings)}`);
 *     // Aqui, a aplicação pode retornar um erro 409 (Conflict), por exemplo.
 *   }
 * }
 */
class QueryError extends Error {
  /**
   * Cria uma instância de QueryError.
   * @param {Error} originalError - O erro original lançado pelo driver do banco de dados (ex: erro de sintaxe).
   * @param {object} queryContext - O contexto da consulta que falhou.
   * @param {string} queryContext.sql - A string da consulta SQL que foi executada.
   * @param {Array} [queryContext.bindings=[]] - Os parâmetros (bindings) que foram passados para a consulta.
   */
  constructor(originalError, { sql, bindings = [] }) {
    // Chama o construtor da classe Error com a mensagem do erro original do driver.
    super(originalError.message);

    // Define o nome da classe do erro para fácil identificação.
    this.name = 'QueryError';

    // Armazena a consulta SQL que causou o erro. Essencial para depuração.
    this.sql = sql;

    // Armazena os parâmetros usados na consulta.
    this.bindings = bindings;

    // Mantém uma referência ao erro original completo para acesso a detalhes
    // específicos do driver, como códigos de erro (ex: '23505' para unique_violation no Postgres).
    this.originalError = originalError;

    // Constrói um stack trace mais limpo, omitindo o construtor da nossa própria classe.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryError);
    }
  }
}

module.exports = QueryError;
