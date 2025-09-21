// lib/client.js

'use strict';

// Builders
const QueryBuilder = require('./query/builder');
const SchemaBuilder = require('./schema/builder');
const Transaction = require('./transaction');

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

// Utils
const parameterHandler = require('./utils/parameter-handler');

/**
 * @class EasyDBGClient
 * A fachada principal para interagir com o banco de dados.
 */
class EasyDBGClient {
  constructor(config) {
    if (!config || !config.client || !config.connection) {
      throw new Error('Configuração inválida. É necessário especificar "client" e "connection".');
    }
    this.config = config;
    this.clientType = config.client.toLowerCase();
    this.pool = null;

    this.grammar = this._getGrammar('query');
    this.schemaGrammar = this._getGrammar('schema');
    this.schema = new SchemaBuilder(this);
    
    this.fn = { now: () => 'now()' };
  }

  /**
   * Inicia o pool de conexões com o banco de dados.
   */
  async connect() {
    if (this.pool) return;

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
          oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
          this.pool = await oracledb.createPool(this.config.connection);
          break;
        default:
          throw new Error(`Cliente de banco de dados não suportado: ${this.clientType}`);
      }
      // Testa a conexão para falhar rapidamente se as credenciais estiverem erradas.
      const connection = await this.pool.getConnection ? await this.pool.getConnection() : await this.pool.connect();
      if (connection.release) connection.release();

    } catch (err) {
      // Cria uma mensagem de erro mais amigável
      const friendlyMessage = this._getFriendlyConnectionErrorMessage(err);
      throw new ConnectionError(err, friendlyMessage);
    }
  }

  /**
   * Encerra o pool de conexões de forma segura.
   */
  async disconnect() {
    if (!this.pool) return;
    try {
      switch (this.clientType) {
        case 'postgres':
        case 'mysql':
          await this.pool.end();
          break;
        case 'mssql':
        case 'oracle':
          await this.pool.close();
          break;
      }
    } catch (error) {
      console.error(`Ocorreu um erro ao tentar desconectar: ${error.message}`);
    } finally {
      this.pool = null;
    }
  }

  /**
   * Inicia uma instância do QueryBuilder para uma tabela específica.
   */
  table(tableName) {
    return new QueryBuilder(this, this.grammar).from(tableName);
  }

  /**
   * Executa uma consulta SQL crua.
   */
  async query(sql, bindings = []) {
    if (!this.pool) await this.connect();
    return this._executeQuery(sql, bindings, this.pool);
  }

  /**
   * Executa um conjunto de operações dentro de uma transação gerenciada.
   */
  async transaction(callback) {
    if (!this.pool) await this.connect();

    const connection = await (this.pool.getConnection ? this.pool.getConnection() : this.pool.connect());
    
    try {
      await (connection.beginTransaction ? connection.beginTransaction() : connection.query('BEGIN'));
      
      const trx = new Transaction(this, connection);
      const result = await callback(trx);
      
      await trx.commit();
      return result;
    } catch (error) {
      const trx = new Transaction(this, connection);
      await trx.rollback();
      throw error; // Re-lança o erro original
    } finally {
      if (connection.release) connection.release();
    }
  }

  /**
   * @private
   * Método interno para execução de consultas, usado pelo `query()` e pela `Transaction`.
   */
  async _executeQuery(sql, bindings, connection) {
    const { sql: finalSql, bindings: finalBindings } = parameterHandler.prepare(this.clientType, sql, bindings);
    
    try {
      // Adaptação para a API de cada driver
      if (this.clientType === 'mssql') {
        const request = connection.request();
        finalBindings.forEach((val, i) => request.input(`param${i}`, val));
        const mssqlSql = finalSql.replace(/\?/g, (match, i) => `@param${i}`);
        const result = await request.query(mssqlSql);
        return result.recordset;
      }
      
      const [rows] = await connection.query(finalSql, finalBindings);
      return rows;
    } catch (err) {
      // Cria uma mensagem de erro mais amigável
      const friendlyMessage = this._getFriendlyQueryErrorMessage(err, finalSql);
      throw new QueryError(err, { sql: finalSql, bindings: finalBindings }, friendlyMessage);
    }
  }

  /**
   * @private
   * Gera uma mensagem de erro de conexão mais clara.
   */
  _getFriendlyConnectionErrorMessage(error) {
    const code = error.code;
    let hint = 'Verifique as credenciais (usuário, senha) e o endereço (host, porta) no seu arquivo de configuração.';

    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
      hint = `Não foi possível conectar ao host "${error.host || this.config.connection.host}". O servidor de banco de dados está rodando e acessível?`;
    } else if (code === 'ER_ACCESS_DENIED_ERROR' || error.message.includes('password authentication failed')) { // MySQL e Postgres
      hint = `Acesso negado para o usuário "${this.config.connection.user}". Verifique se o usuário e a senha estão corretos.`;
    } else if (code === 'ER_BAD_DB_ERROR') { // MySQL
      hint = `O banco de dados "${this.config.connection.database}" não existe.`;
    } else if (error.message.includes('database') && error.message.includes('does not exist')) { // Postgres
      hint = `O banco de dados "${this.config.connection.database}" não existe.`;
    } else if (code === 'ELOGIN') { // MSSQL
      hint = `Falha no login para o usuário "${this.config.connection.user}". Verifique as credenciais.`;
    }

    return `Falha na conexão com o banco de dados. Dica: ${hint}`;
  }

  /**
   * @private
   * Gera uma mensagem de erro de consulta mais clara.
   */
  _getFriendlyQueryErrorMessage(error, sql) {
    const code = error.code;
    let hint = `A consulta SQL falhou. SQL: ${sql}`;

    if (code === 'ER_NO_SUCH_TABLE' || error.message.includes('does not exist')) { // MySQL e Postgres
      const tableNameMatch = sql.match(/(?:from|into|update|join)\s+[`"\[]?(\w+)[`"\]]?/i);
      const tableName = tableNameMatch ? tableNameMatch[1] : 'desconhecida';
      hint = `A tabela "${tableName}" não foi encontrada no banco de dados. Você rodou as migrations?`;
    } else if (code === 'ER_BAD_FIELD_ERROR' || code === '42703') { // MySQL e Postgres (undefined column)
      const columnNameMatch = error.message.match(/(?:Unknown column|column)\s+'([^']+)'/);
      const columnName = columnNameMatch ? columnNameMatch[1] : 'desconhecida';
      hint = `A coluna "${columnName}" não foi encontrada em uma das tabelas da sua consulta.`;
    } else if (code === 'ER_DUP_ENTRY' || code === '23505') { // MySQL e Postgres (unique constraint)
      hint = 'A operação falhou porque violaria uma constraint de valor único (UNIQUE). Um registro com um dos valores informados já existe.';
    }

    return `Erro na consulta. Dica: ${hint}`;
  }

  /**
   * @private
   * Retorna a instância da gramática correta.
   */
  _getGrammar(type = 'query') {
    const grammars = {
      query: { postgres: PostgresGrammar, mysql: MySqlGrammar, mssql: MssqlGrammar, oracle: OracleGrammar },
      schema: { postgres: PostgresSchemaGrammar, mysql: MySqlSchemaGrammar, mssql: MssqlSchemaGrammar, oracle: OracleSchemaGrammar }
    };
    const GrammarClass = grammars[type][this.clientType];
    if (!GrammarClass) throw new Error(`Gramática do tipo "${type}" não encontrada para o cliente "${this.clientType}".`);
    return new GrammarClass();
  }
  
  getSchemaGrammar() {
    return this.schemaGrammar;
  }
}

module.exports = EasyDBGClient;
