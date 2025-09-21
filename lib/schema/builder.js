// lib/schema/builder.js

'use strict';

const TableBuilder = require('./table-builder');
const QueryError = require('../errors/QueryError');

/**
 * @class SchemaBuilder
 *
 * Fornece uma API para manipular o esquema do banco de dados (tabelas, colunas, etc.).
 *
 * Funciona como uma fachada que delega a compilação do SQL DDL para uma
 * gramática de esquema específica e executa as consultas através do cliente.
 */
class SchemaBuilder {
  /**
   * Cria uma instância do SchemaBuilder.
   * @param {EasyDBGClient} client - A instância do cliente de banco de dados.
   */
  constructor(client) {
    this.client = client;
    // A gramática de esquema será obtida do cliente, que a conhece.
    this.grammar = client.getSchemaGrammar();
  }

  /**
   * Cria uma nova tabela no banco de dados.
   * @param {string} tableName - O nome da tabela a ser criada.
   * @param {Function} callback - Uma função que recebe um TableBuilder para definir as colunas.
   * @returns {Promise<void>}
   */
  async createTable(tableName, callback) {
    const tableBuilder = new TableBuilder(tableName);

    // Executa o callback do usuário para que ele possa definir as colunas.
    callback(tableBuilder);

    // Compila e executa as queries SQL para criar a tabela.
    const sqlStatements = this.grammar.compileCreateTable(tableBuilder);

    // As gramáticas podem retornar uma ou mais strings SQL.
    for (const sql of Array.isArray(sqlStatements) ? sqlStatements : [sqlStatements]) {
      try {
        await this.client.query(sql);
      } catch (err) {
        // Embrulha o erro em um QueryError para consistência.
        throw new QueryError(err, { sql });
      }
    }
  }

  /**
   * Remove uma tabela do banco de dados.
   * @param {string} tableName - O nome da tabela a ser removida.
   * @returns {Promise<void>}
   */
  async dropTable(tableName) {
    const sql = this.grammar.compileDropTable(tableName);
    await this.client.query(sql);
  }

  /**
   * Remove uma tabela do banco de dados se ela existir.
   * @param {string} tableName - O nome da tabela a ser removida.
   * @returns {Promise<void>}
   */
  async dropTableIfExists(tableName) {
    const sql = this.grammar.compileDropTableIfExists(tableName);
    await this.client.query(sql);
  }

  /**
   * Verifica se uma tabela existe no banco de dados.
   * @param {string} tableName - O nome da tabela a ser verificada.
   * @returns {Promise<boolean>}
   */
  async hasTable(tableName) {
    const sql = this.grammar.compileHasTable(tableName);
    try {
      const result = await this.client.query(sql);
      // A gramática deve garantir que o resultado seja consistente.
      // Geralmente, retorna um array com um objeto se a tabela existir.
      return result.length > 0;
    } catch (err) {
      // Se a consulta falhar por algum motivo, assume que a tabela não existe ou há um problema.
      return false;
    }
  }

  /**
   * Renomeia uma tabela.
   * @param {string} from - O nome atual da tabela.
   * @param {string} to - O novo nome da tabela.
   * @returns {Promise<void>}
   */
  async renameTable(from, to) {
    const sql = this.grammar.compileRenameTable(from, to);
    await this.client.query(sql);
  }

  /**
   * Modifica uma tabela existente.
   * (Funcionalidade avançada a ser implementada no futuro)
   * @param {string} tableName - O nome da tabela a ser modificada.
   * @param {Function} callback - Uma função que recebe um TableBuilder para adicionar/remover colunas.
   * @returns {Promise<void>}
   */
  async table(tableName, callback) {
    // Esta funcionalidade é mais complexa, pois envolve a geração de
    // statements 'ALTER TABLE'.
    console.warn('A funcionalidade "table" (ALTER TABLE) ainda não foi implementada.');
    // const tableBuilder = new TableBuilder(tableName);
    // callback(tableBuilder);
    // const sql = this.grammar.compileAlterTable(tableBuilder);
    // await this.client.query(sql);
  }
}

module.exports = SchemaBuilder;
