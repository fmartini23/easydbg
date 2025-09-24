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
const chalk = require('chalk'); // MELHORIA: Importado para o modo de depuração

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
      const connection = await (this.pool.getConnection ? this.pool.getConnection() : this.pool.connect());
      if (connection.release) connection.release();

    } catch (err) {
      const friendlyMessage = this._getFriendlyConnectionErrorMessage(err);
      throw new ConnectionError(friendlyMessage, { originalError: err });
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
   * MELHORIA: Agora suporta transações aninhadas usando Savepoints.
   */
  async transaction(callback, existingTrx = null) {
    if (existingTrx) {
      // Estamos dentro de uma transação, vamos criar um savepoint.
      const savepointName = `easydbg_sp_${existingTrx.level + 1}`;
      await existingTrx.savepoint(savepointName);
      try {
        const result = await callback(existingTrx);
        // Não fazemos commit aqui, apenas continuamos na transação principal.
        return result;
      } catch (error) {
        await existingTrx.rollbackTo(savepointName);
        throw error; // Re-lança o erro para a transação externa lidar.
      }
    }

    // Início de uma nova transação (nível 0).
    if (!this.pool) await this.connect();
    const connection = await (this.pool.getConnection ? this.pool.getConnection() : this.pool.connect());
    const trx = new Transaction(this, connection);
    
    try {
      await trx.begin();
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    } finally {
      trx.release();
    }
  }

  /**
   * @private
   * Método interno para execução de consultas, usado pelo `query()` e pela `Transaction`.
   */
  async _executeQuery(sql, bindings, connection) {
    const { sql: finalSql, bindings: finalBindings } = parameterHandler.prepare(this.clientType, sql, bindings);
    
    // MELHORIA: Modo de Depuração
    if (this.config.debug) {
      console.log(chalk.magenta.bold('easydbg:query -> ') + chalk.cyan(finalSql));
      if (finalBindings.length > 0) {
        console.log(chalk.magenta.bold('easydbg:bindings -> ') + chalk.yellow(JSON.stringify(finalBindings)));
      }
    }
    
    try {
      if (this.clientType === 'mssql') {
        const request = connection.request();
        finalBindings.forEach((val, i) => request.input(`param${i}`, val));
        const mssqlSql = finalSql.replace(/\?/g, `@param${i}`);
        const result = await request.query(mssqlSql);
        return result.recordset;
      }
      
      const [rows] = await connection.query(finalSql, finalBindings);
      return rows;
    } catch (err) {
      const friendlyMessage = this._getFriendlyQueryErrorMessage(err, finalSql);
      throw new QueryError(friendlyMessage, { sql: finalSql, bindings: finalBindings, originalError: err });
    }
  }

  /**
   * @private
   * Gera uma mensagem de erro de conexão mais clara.
   */
  _getFriendlyConnectionErrorMessage(error) {
    const originalError = error.originalError || error;
    const code = originalError.code;
    const connectionConfig = this.config.connection;
    let hint = `Verifique as credenciais (usuário: '${connectionConfig.user}') e o endereço (host: '${connectionConfig.server || connectionConfig.host}') no seu arquivo de configuração.`;

    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
      hint = `Não foi possível conectar ao host "${connectionConfig.server || connectionConfig.host}". O servidor de banco de dados está rodando e acessível pela rede?`;
    } else if (code === 'ELOGIN') { // MSSQL
      hint = `Falha no login para o usuário '${connectionConfig.user}'. Verifique se a senha está correta e se o usuário tem permissão para conectar.`;
    } else if (code === 'ER_ACCESS_DENIED_ERROR') { // MySQL
      hint = `Acesso negado para o usuário '${connectionConfig.user}'. Verifique o usuário e a senha.`;
    } else if (originalError.message && originalError.message.includes('password authentication failed')) { // Postgres
      hint = `Autenticação com senha falhou para o usuário '${connectionConfig.user}'. Verifique a senha.`;
    } else if (code === 'ER_BAD_DB_ERROR' || (originalError.message && originalError.message.includes('database') && originalError.message.includes('does not exist'))) {
      hint = `O banco de dados "${connectionConfig.database}" não existe no servidor.`;
    }

    return `Falha na conexão com o banco de dados. Dica: ${hint}`;
  }

  /**
   * @private
   * Gera uma mensagem de erro de consulta mais clara.
   */
  _getFriendlyQueryErrorMessage(error, sql) {
    const originalError = error.originalError || error;
    const code = originalError.code;
    let hint = `A consulta SQL falhou. SQL: ${sql}`;

    if (code === 'ER_NO_SUCH_TABLE' || (originalError.message && originalError.message.includes('does not exist'))) {
      const tableNameMatch = sql.match(/(?:from|into|update|join)\s+[`"\[]?(\w+)[`"\]]?/i);
      const tableName = tableNameMatch ? tableNameMatch[1] : 'desconhecida';
      hint = `A tabela "${tableName}" não foi encontrada. Você rodou as migrations?`;
    } else if (code === 'ER_BAD_FIELD_ERROR' || code === '42703' || (originalError.message && originalError.message.toLowerCase().includes('invalid column name'))) {
      const columnNameMatch = error.message.match(/(?:Unknown column|column|Invalid column name)\s+'([^']+)'/);
      const columnName = columnNameMatch ? columnNameMatch[1] : 'desconhecida';
      hint = `A coluna "${columnName}" não foi encontrada. Verifique se o nome da coluna está correto.`;
    } else if (code === 'ER_DUP_ENTRY' || code === '23505') {
      hint = 'A operação falhou porque violaria uma constraint de valor único (UNIQUE).';
    } else if (code === 'ER_PARSE_ERROR' || code === '42601') {
      hint = 'A consulta contém um erro de sintaxe SQL.';
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
