// lib/transaction.js

'use strict';

const QueryBuilder = require('./query/builder');
const SchemaBuilder = require('./schema/builder');
const TransactionError = require('./errors/TransactionError');
const parameterHandler = require('./utils/parameter-handler');

/**
 * @class Transaction
 *
 * Representa uma transação de banco de dados ativa.
 *
 * Esta classe gerencia uma conexão dedicada do pool e fornece uma API de consulta
 * idêntica à do cliente principal, garantindo que todas as operações executadas
 * através dela ocorram dentro do escopo da mesma transação.
 *
 * Uma instância desta classe é criada pelo EasyDBGClient e passada para o
 * callback do método `db.transaction()`.
 */
class Transaction {
  /**
   * Cria uma instância de Transaction.
   * @param {EasyDBGClient} client - A instância do cliente principal.
   * @param {object} connection - A conexão dedicada do pool para esta transação.
   */
  constructor(client, connection) {
    this.client = client;
    this.connection = connection;
    this.grammar = client.grammar;
    this.schemaGrammar = client.schemaGrammar;
    this.clientType = client.clientType;

    // Expõe o SchemaBuilder, assim como o cliente principal.
    this.schema = new SchemaBuilder(this);
    
    // Expõe as funções de banco de dados.
    this.fn = client.fn;
  }

  /**
   * Inicia uma instância do QueryBuilder para uma tabela específica,
   * garantindo que a consulta seja executada nesta transação.
   * @param {string} tableName - O nome da tabela.
   * @returns {QueryBuilder}
   */
  table(tableName) {
    // Passa a si mesma (a transação) como o executor da consulta.
    return new QueryBuilder(this, this.grammar).from(tableName);
  }

  /**
   * Executa uma consulta SQL crua dentro desta transação.
   * @param {string} sql - A string SQL.
   * @param {Array} [bindings=[]] - Os parâmetros da consulta.
   * @returns {Promise<any>} O resultado da consulta.
   */
  async query(sql, bindings = []) {
    // A lógica de execução é a mesma do cliente, mas usa a conexão da transação.
    const { sql: finalSql, bindings: finalBindings } = parameterHandler.prepare(
      this.clientType,
      sql,
      bindings
    );

    try {
      // Delega a execução para o método de query do cliente principal,
      // mas passando a conexão da transação para ser usada.
      return await this.client._executeQuery(finalSql, finalBindings, this.connection);
    } catch (err) {
      // O erro já será um QueryError lançado por _executeQuery.
      // Apenas o relançamos para ser capturado pelo bloco de transação.
      throw err;
    }
  }

  /**
   * Confirma a transação.
   * Este método é chamado pelo EasyDBGClient.
   * @returns {Promise<void>}
   */
  async commit() {
    try {
      await this.connection.commit();
    } catch (err) {
      throw new TransactionError(err, 'Falha ao confirmar a transação (COMMIT).');
    }
  }

  /**
   * Reverte a transação.
   * Este método é chamado pelo EasyDBGClient.
   * @returns {Promise<void>}
   */
  async rollback() {
    try {
      await this.connection.rollback();
    } catch (err) {
      throw new TransactionError(err, 'Falha ao reverter a transação (ROLLBACK).');
    }
  }

  /**
   * Libera a conexão de volta para o pool.
   * Este método é chamado pelo EasyDBGClient após commit ou rollback.
   */
  release() {
    if (this.connection && typeof this.connection.release === 'function') {
      this.connection.release();
    }
  }

  // --- Métodos de Transação Aninhada (Desativados) ---

  /**
   * Impede o início de uma transação dentro de outra.
   */
  transaction() {
    throw new TransactionError('Não é possível iniciar uma transação aninhada.');
  }
  beginTransaction() {
    throw new TransactionError('Não é possível iniciar uma transação aninhada.');
  }
}

module.exports = Transaction;
