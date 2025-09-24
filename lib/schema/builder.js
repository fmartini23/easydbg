// lib/schema/builder.js

'use strict';

const TableBuilder = require('./table-builder');

/**
 * @class SchemaBuilder
 *
 * Fornece uma API fluente e agnóstica de banco de dados para manipular
 * o esquema (operações DDL como criar, alterar e remover tabelas).
 *
 * Ele atua como um orquestrador, coletando as definições do usuário e
 * delegando a compilação do SQL para a gramática de esquema apropriada.
 */
class SchemaBuilder {
  /**
   * @param {EasyDBGClient|Transaction} client - A instância do cliente ou transação que executará os comandos.
   */
  constructor(client) {
    this.client = client;
    this.grammar = client.getSchemaGrammar();
  }

  /**
   * Cria uma nova tabela no banco de dados.
   * @param {string} tableName - O nome da tabela a ser criada.
   * @param {Function} callback - Uma função que recebe uma instância do TableBuilder para definir as colunas.
   * @returns {Promise<void>}
   */
  async createTable(tableName, callback) {
    const tableBuilder = new TableBuilder('create', tableName);
    callback(tableBuilder);

    const sqlCommands = this.grammar.compileCreateTable(tableBuilder);
    await this._runSql(sqlCommands);
  }

  /**
   * Modifica uma tabela existente.
   * @param {string} tableName - O nome da tabela a ser modificada.
   * @param {Function} callback - Uma função que recebe uma instância do TableBuilder para definir as alterações.
   * @returns {Promise<void>}
   */
  async alterTable(tableName, callback) {
    const tableBuilder = new TableBuilder('alter', tableName);
    callback(tableBuilder);

    const sqlCommands = this.grammar.compileAlterTable(tableBuilder);
    await this._runSql(sqlCommands);
  }

  /**
   * Remove uma tabela do banco de dados.
   * @param {string} tableName - O nome da tabela a ser removida.
   * @returns {Promise<void>}
   */
  async dropTable(tableName) {
    const sql = this.grammar.compileDropTable(tableName);
    await this._runSql(sql);
  }

  /**
   * Remove uma tabela do banco de dados somente se ela existir.
   * @param {string} tableName - O nome da tabela a ser removida.
   * @returns {Promise<void>}
   */
  async dropTableIfExists(tableName) {
    const sql = this.grammar.compileDropTableIfExists(tableName);
    await this._runSql(sql);
  }

  /**
   * Verifica se uma tabela existe no banco de dados.
   * @param {string} tableName - O nome da tabela a ser verificada.
   * @returns {Promise<boolean>}
   */
  async hasTable(tableName) {
    const sql = this.grammar.compileHasTable(tableName);
    const result = await this.client.query(sql);
    return result.length > 0;
  }

  /**
   * Renomeia uma tabela.
   * @param {string} from - O nome atual da tabela.
   * @param {string} to - O novo nome da tabela.
   * @returns {Promise<void>}
   */
  async renameTable(from, to) {
    const sql = this.grammar.compileRenameTable(from, to);
    await this._runSql(sql);
  }

  /**
   * @private
   * Executa um ou mais comandos SQL.
   * Lida com o caso de a gramática retornar uma string única ou um array de strings.
   * @param {string|string[]} sqlCommands - O(s) comando(s) SQL a serem executados.
   */
  async _runSql(sqlCommands) {
    const commands = Array.isArray(sqlCommands) ? sqlCommands : [sqlCommands];

    for (const sql of commands) {
      if (sql) { // Garante que não tentemos executar um comando vazio/nulo
        await this.client.query(sql);
      }
    }
  }
}

module.exports = SchemaBuilder;
