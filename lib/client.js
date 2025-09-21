// lib/client.js

'use strict';

// Builders
const QueryBuilder = require('./query/builder');
const SchemaBuilder = require('./schema/builder');

// Grammars
const MySqlGrammar = require('./query/grammars/mysql-grammar');
const PostgresGrammar = require('./query/grammars/postgres-grammar');
const MssqlGrammar = require('./query/grammars/mssql-grammar');
const OracleGrammar = require('./query/grammars/oracle-grammar');
const MySqlSchemaGrammar = require('./schema/grammars/mysql-schema-grammar');
const PostgresSchemaGrammar = require('./schema/grammars/postgres-schema-grammar');
const MssqlSchemaGrammar = require('./schema/grammars/mssql-schema-grammar');
const OracleSchemaGrammar = require('./schema/grammars/oracle-schema-grammar');

// Errors
const ConnectionError = require('./errors/ConnectionError');
const QueryError = require('./errors/QueryError');
const TransactionError = require('./errors/TransactionError');

// Utils
const parameterHandler = require('./utils/parameter-handler');

/**
 * @class EasyDBGClient
 *
 * A fachada principal para interagir com o banco de dados.
 * Gerencia conexões, transações e serve como ponto de entrada para
 * o Query Builder e o Schema Builder.
 */
class EasyDBGClient {
  /**
   * Cria uma instância do EasyDBGClient.
   * @param {object} config - A configuração da conexão.
   * @param {string} config.client - O tipo de banco de dados (ex: 'postgres', 'mysql').
   * @param {object} config.connection - As credenciais e detalhes da conexão.
   */
  constructor(config) {
    if (!config || !config.client || !config.connection) {
      throw new Error('Configuração de cliente e conexão inválida.');
    }
    this.config = config;
    this.clientType = config.client.toLowerCase();
    this.pool = null;
    this.transactionConnection = null; // Conexão dedicada para transações

    // Carrega as gramáticas corretas
    this.grammar = this._getGrammar('query');
    this.schemaGrammar = this._getGrammar('schema');

    // Propriedade de acesso para o SchemaBuilder
    this.schema = new SchemaBuilder(this);
    
    // Propriedade para funções de banco (ex: db.fn.now())
    this.fn = {
        now: () => 'now()' // Função genérica, pode ser sobrescrita por gramáticas
    };
  }

  /**
   * Inicia o pool de conexões com o banco de dados.
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.pool) return; // Já conectado

    try {
      switch (this.clientType) {
        case 'postgres':
          const { Pool: PgPool } = require('pg');
          this.pool = new PgPool(this.config.connection);
          break;
        case 'mysql':
          const mysql2 = require('mysql2/promise');
          this.pool = mysql2.createPool(this.config.connection);
          break;
        case 'mssql':
          const mssql = require('mssql');
          this.pool = await mssql.connect(this.config.connection);
          break;
        case 'oracle':
          const oracledb = require('oracledb');
          // Configurações importantes para o Oracle
          oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
          this.pool = await oracledb.createPool(this.config.connection);
          break;
        default:
          throw new ConnectionError(new Error(`Cliente de banco de dados não suportado: ${this.clientType}`));
      }
    } catch (err) {
      throw new ConnectionError(err);
    }
  }

  /**
   * Encerra o pool de conexões.
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Inicia uma instância do QueryBuilder para uma tabela específica.
   * @param {string} tableName - O nome da tabela.
   * @returns {QueryBuilder}
   */
  table(tableName) {
    return new QueryBuilder(this, this.grammar).from(tableName);
  }

  /**
   * Executa uma consulta SQL crua.
   * Este é o método central de execução de consultas.
   * @param {string} sql - A string SQL.
   * @param {Array} [bindings=[]] - Os parâmetros da consulta.
   * @returns {Promise<any>} O resultado da consulta.
   */
  async query(sql, bindings = []) {
    if (!this.pool) await this.connect();

    const { sql: finalSql, bindings: finalBindings } = parameterHandler.prepare(this.clientType, sql, bindings);
    
    // Usa a conexão da transação se estiver ativa, senão usa o pool.
    const connection = this.transactionConnection || this.pool;

    try {
      // A API de cada driver é ligeiramente diferente.
      if (this.clientType === 'mssql') {
        const request = connection.request();
        finalBindings.forEach((val, i) => request.input(`param${i}`, val));
        const result = await request.query(finalSql.replace(/\?/g, (match, i) => `@param${i}`));
        return result.recordset;
      }
      
      const [rows] = await connection.query(finalSql, finalBindings);
      return rows;
    } catch (err) {
      throw new QueryError(err, { sql: finalSql, bindings: finalBindings });
    }
  }

  // --- Gerenciamento de Transações ---

  /**
   * Inicia uma nova transação.
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    if (this.transactionConnection) return; // Transação já iniciada
    if (!this.pool) await this.connect();

    this.transactionConnection = await this.pool.getConnection(); // Para mysql2
    await this.transactionConnection.beginTransaction();
  }

  /**
   * Confirma a transação atual.
   * @returns {Promise<void>}
   */
  async commit() {
    if (!this.transactionConnection) return;
    try {
      await this.transactionConnection.commit();
    } catch (err) {
      throw new TransactionError(err, 'Falha ao confirmar a transação (COMMIT).');
    } finally {
      this.transactionConnection.release();
      this.transactionConnection = null;
    }
  }

  /**
   * Reverte a transação atual.
   * @returns {Promise<void>}
   */
  async rollback() {
    if (!this.transactionConnection) return;
    try {
      await this.transactionConnection.rollback();
    } catch (err) {
      throw new TransactionError(err, 'Falha ao reverter a transação (ROLLBACK).');
    } finally {
      this.transactionConnection.release();
      this.transactionConnection = null;
    }
  }

  /**
   * Executa um conjunto de operações dentro de uma transação gerenciada.
   * @param {Function} callback - Uma função assíncrona que recebe o cliente como argumento.
   * @returns {Promise<any>} O resultado do callback.
   */
  async transaction(callback) {
    await this.beginTransaction();
    try {
      const result = await callback(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error; // Re-lança o erro original (seja QueryError ou outro)
    }
  }

  /**
   * @private
   * Retorna a instância da gramática correta com base no tipo de cliente.
   */
  _getGrammar(type = 'query') {
    const grammars = {
      query: {
        postgres: PostgresGrammar,
        mysql: MySqlGrammar,
        mssql: MssqlGrammar,
        oracle: OracleGrammar,
      },
      schema: {
        postgres: PostgresSchemaGrammar,
        mysql: MySqlSchemaGrammar,
        mssql: MssqlSchemaGrammar,
        oracle: OracleSchemaGrammar,
      }
    };
    const GrammarClass = grammars[type][this.clientType];
    if (!GrammarClass) {
      throw new Error(`Gramática do tipo "${type}" não encontrada para o cliente "${this.clientType}".`);
    }
    return new GrammarClass();
  }
  
  /**
   * Retorna a gramática de esquema. Usado pelo SchemaBuilder.
   * @returns {BaseSchemaGrammar}
   */
  getSchemaGrammar() {
      return this.schemaGrammar;
  }
}

module.exports = EasyDBGClient;
