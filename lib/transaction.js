// lib/transaction.js

'use strict';

const QueryBuilder = require('./query/builder');
const SchemaBuilder = require('./schema/builder');
const TransactionError = require('./errors/TransactionError');

/**
 * @class Transaction
 *
 * Representa uma transação de banco de dados ativa.
 *
 * Esta classe gerencia uma conexão dedicada do pool e fornece uma API de consulta
 * idêntica à do cliente principal. Ela também gerencia o estado de aninhamento
 * de transações através de savepoints.
 */
class Transaction {
  /**
   * @param {EasyDBGClient} client - A instância do cliente principal.
   * @param {object} connection - A conexão dedicada do pool para esta transação.
   */
  constructor(client, connection) {
    this.client = client;
    this.connection = connection;
    this.grammar = client.grammar;
    this.schemaGrammar = client.schemaGrammar;
    this.clientType = client.clientType;
    this.level = 0; // Nível de aninhamento da transação

    // Expõe o SchemaBuilder e as funções, espelhando a API do cliente.
    this.schema = new SchemaBuilder(this);
    this.fn = client.fn;
  }

  // --- Métodos da API Principal ---

  /**
   * Inicia uma instância do QueryBuilder para uma tabela específica,
   * garantindo que a consulta seja executada nesta transação.
   */
  table(tableName) {
    return new QueryBuilder(this, this.grammar).from(tableName);
  }

  /**
   * Executa uma consulta SQL crua dentro desta transação.
   */
  async query(sql, bindings = []) {
    // Delega a execução para o método privado do cliente, mas passando
    // a conexão específica desta transação.
    return this.client._executeQuery(sql, bindings, this.connection);
  }

  /**
   * Inicia uma transação aninhada (ou a transação principal se for o nível 0).
   * Delega a lógica para o cliente principal para gerenciar o aninhamento.
   */
  transaction(callback) {
    return this.client.transaction(callback, this);
  }

  // --- Métodos de Controle de Transação ---

  /**
   * Inicia a transação principal.
   */
  async begin() {
    await this.query('BEGIN');
  }

  /**
   * Confirma a transação principal.
   */
  async commit() {
    await this.query('COMMIT');
  }

  /**
   * Reverte a transação principal.
   */
  async rollback() {
    await this.query('ROLLBACK');
  }

  /**
   * Libera a conexão de volta para o pool.
   * Chamado pelo cliente após a transação ser concluída (commit ou rollback).
   */
  release() {
    if (this.connection && typeof this.connection.release === 'function') {
      this.connection.release();
    }
  }

  // --- MELHORIA: Métodos de Controle de Savepoint ---

  /**
   * Cria um novo savepoint na transação atual.
   * @param {string} name - O nome do savepoint.
   */
  async savepoint(name) {
    this.level++;
    await this.query(`SAVEPOINT ${name}`);
  }

  /**
   * Reverte a transação para um savepoint específico.
   * @param {string} name - O nome do savepoint para o qual reverter.
   */
  async rollbackTo(name) {
    await this.query(`ROLLBACK TO SAVEPOINT ${name}`);
    this.level--;
  }
}

module.exports = Transaction;
