// lib/schema/grammars/mssql-schema-grammar.js

'use strict';

/**
 * @class MssqlSchemaGrammar
 *
 * Compila as definições de esquema do TableBuilder para a sintaxe DDL do Microsoft SQL Server.
 */
class MssqlSchemaGrammar {
  constructor() {
    this.wrapper = '[';
    this.closingWrapper = ']';
  }

  /**
   * Compila um comando 'create table'.
   * @param {TableBuilder} tableBuilder - A instância do TableBuilder com as definições.
   * @returns {string[]} Um array de comandos SQL para criar a tabela e seus índices.
   */
  compileCreateTable(tableBuilder) {
    const tableName = this.wrapTable(tableBuilder.tableName);
    const columns = this._getColumns(tableBuilder).join(', ');

    const sql = `create table ${tableName} (${columns})`;

    // Comandos adicionais, como índices, são compilados separadamente.
    const commands = [sql, ...this._compileCommands(tableBuilder)];
    return commands.filter(c => c); // Filtra comandos vazios
  }

  /**
   * Compila um comando 'drop table'.
   * @param {string} tableName - O nome da tabela.
   * @returns {string}
   */
  compileDropTable(tableName) {
    return `drop table ${this.wrapTable(tableName)}`;
  }

  /**
   * Compila um comando 'drop table if exists'.
   * @param {string} tableName - O nome da tabela.
   * @returns {string}
   */
  compileDropTableIfExists(tableName) {
    const wrappedTable = this.wrapTable(tableName);
    return `if object_id(N'${tableName}', 'U') is not null drop table ${wrappedTable}`;
  }

  /**
   * Compila um comando para verificar se uma tabela existe.
   * @param {string} tableName - O nome da tabela.
   * @returns {string}
   */
  compileHasTable(tableName) {
    return `select * from sys.objects where object_id = object_id(N'${tableName}') and type in (N'U')`;
  }

  /**
   * Compila um comando para renomear uma tabela.
   * @param {string} from - O nome atual da tabela.
   * @param {string} to - O novo nome da tabela.
   * @returns {string}
   */
  compileRenameTable(from, to) {
    return `sp_rename ${this.wrapValue(from)}, ${this.wrapValue(to)}`;
  }

  /**
   * @private
   * Itera sobre as definições de coluna do TableBuilder e as compila para SQL.
   */
  _getColumns(tableBuilder) {
    return tableBuilder._columns.map(column => {
      let sql = this.wrap(column.name);
      sql += ` ${this._getType(column)}`; // Adiciona o tipo de dado
      sql += this._getModifiers(column); // Adiciona constraints (NOT NULL, etc.)
      return sql;
    });
  }

  /**
   * @private
   * Converte um tipo de coluna genérico para o tipo específico do MSSQL.
   */
  _getType(column) {
    switch (column.type) {
      case 'increments':
        return 'int identity(1,1)';
      case 'bigIncrements':
        return 'bigint identity(1,1)';
      case 'string':
        return `nvarchar(${column.length})`;
      case 'text':
        return 'nvarchar(max)';
      case 'integer':
        return 'int';
      case 'bigInteger':
        return 'bigint';
      case 'boolean':
        return 'bit';
      case 'decimal':
        return `decimal(${column.precision}, ${column.scale})`;
      case 'timestamp':
      case 'timestamptz': // MSSQL não tem um tipo com timezone nativo como Postgres
        return 'datetime2';
      default:
        throw new Error(`Tipo de coluna não suportado para MSSQL: ${column.type}`);
    }
  }

  /**
   * @private
   * Compila os modificadores (constraints) para uma coluna.
   */
  _getModifiers(column) {
    let sql = '';
    if (column.isNullable === false) sql += ' not null';
    if (column.isPrimary) sql += ' primary key';
    if (column.isUnique) sql += ' unique';
    if (column.defaultValue !== undefined) {
      sql += ` default ${this._formatDefaultValue(column.defaultValue)}`;
    }
    return sql;
  }

  /**
   * @private
   * Formata o valor padrão para ser inserido na string SQL.
   */
  _formatDefaultValue(value) {
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (value.toString().toLowerCase().includes('now()')) {
        return 'getdate()';
    }
    return value;
  }

  /**
   * @private
   * Compila comandos de nível de tabela, como índices.
   */
  _compileCommands(tableBuilder) {
    return tableBuilder._commands.map(command => {
      if (command.type === 'index') {
        const columns = this.columnize(command.columns);
        const indexName = this.wrap(command.indexName || `${tableBuilder.tableName}_${command.columns.join('_')}_index`);
        return `create index ${indexName} on ${this.wrapTable(tableBuilder.tableName)} (${columns})`;
      }
      // Outros comandos (primary, unique composto) podem ser adicionados aqui.
    }).filter(c => c);
  }

  // --- Métodos de Helper para Envolver Identificadores ---
  wrap(value) { return `${this.wrapper}${value}${this.closingWrapper}`; }
  wrapTable(table) { return this.wrap(table); }
  wrapValue(value) { return `'${value}'`; }
  columnize(columns) { return columns.map(c => this.wrap(c)).join(', '); }
}

module.exports = MssqlSchemaGrammar;
