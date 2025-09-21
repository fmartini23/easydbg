// lib/schema/grammars/mysql-schema-grammar.js

'use strict';

/**
 * @class MySqlSchemaGrammar
 *
 * Compila as definições de esquema do TableBuilder para a sintaxe DDL do MySQL.
 */
class MySqlSchemaGrammar {
  constructor() {
    this.wrapper = '`'; // MySQL usa crases
  }

  /**
   * Compila um comando 'create table'.
   * @param {TableBuilder} tableBuilder - A instância do TableBuilder com as definições.
   * @returns {string} O comando SQL para criar a tabela.
   */
  compileCreateTable(tableBuilder) {
    const tableName = this.wrapTable(tableBuilder.tableName);
    const columns = this._getColumns(tableBuilder).join(', ');

    let sql = `create table ${tableName} (${columns})`;

    // Adiciona configurações de nível de tabela (engine, charset, etc.)
    sql += this._compileTableOptions(tableBuilder);

    return sql;
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
    return `drop table if exists ${this.wrapTable(tableName)}`;
  }

  /**
   * Compila um comando para verificar se uma tabela existe.
   * @param {string} tableName - O nome da tabela.
   * @returns {string}
   */
  compileHasTable(tableName) {
    // A consulta ao information_schema é a forma padrão de verificar.
    // O '?' será substituído pelo nome do banco de dados pelo client.
    return `select * from information_schema.tables where table_schema = ? and table_name = '${tableName}'`;
  }

  /**
   * Compila um comando para renomear uma tabela.
   * @param {string} from - O nome atual da tabela.
   * @param {string} to - O novo nome da tabela.
   * @returns {string}
   */
  compileRenameTable(from, to) {
    return `rename table ${this.wrapTable(from)} to ${this.wrapTable(to)}`;
  }

  /**
   * @private
   * Itera sobre as definições de coluna do TableBuilder e as compila para SQL.
   */
  _getColumns(tableBuilder) {
    const columns = tableBuilder._columns.map(column => {
      let sql = this.wrap(column.name);
      sql += ` ${this._getType(column)}`;
      sql += this._getModifiers(column);
      return sql;
    });

    // Adiciona chaves primárias compostas, se houver.
    const primary = this._getCommand(tableBuilder, 'primary');
    if (primary) {
      columns.push(this._compilePrimary(primary));
    }

    return columns;
  }

  /**
   * @private
   * Converte um tipo de coluna genérico para o tipo específico do MySQL.
   */
  _getType(column) {
    switch (column.type) {
      case 'increments':
        return 'int unsigned';
      case 'bigIncrements':
        return 'bigint unsigned';
      case 'string':
        return `varchar(${column.length})`;
      case 'text':
        return 'text';
      case 'integer':
        return 'int';
      case 'bigInteger':
        return 'bigint';
      case 'boolean':
        return 'tinyint(1)';
      case 'decimal':
        return `decimal(${column.precision}, ${column.scale})`;
      case 'timestamp':
        return 'timestamp';
      case 'timestamptz': // MySQL não tem um tipo com timezone nativo
        return 'timestamp';
      default:
        throw new Error(`Tipo de coluna não suportado para MySQL: ${column.type}`);
    }
  }

  /**
   * @private
   * Compila os modificadores (constraints) para uma coluna.
   */
  _getModifiers(column) {
    let sql = '';
    if (column.isNullable === false) sql += ' not null';
    if (column.isPrimary && (column.type === 'increments' || column.type === 'bigIncrements')) {
      sql += ' auto_increment primary key';
    } else if (column.isPrimary) {
      sql += ' primary key';
    }
    if (column.isUnique) sql += ' unique';
    if (column.defaultValue !== undefined) {
      sql += ` default ${this._formatDefaultValue(column.defaultValue)}`;
    }
    // Lógica para ON UPDATE CURRENT_TIMESTAMP
    if (column.name === 'updated_at' && column.defaultValue.toString().includes('now()')) {
        sql += ' on update current_timestamp';
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
    if (value.toString().includes('now()')) {
        return 'current_timestamp';
    }
    return value;
  }

  /**
   * @private
   * Compila as opções de nível de tabela (engine, charset).
   */
  _compileTableOptions(tableBuilder) {
    const engine = tableBuilder.engine || 'InnoDB';
    const charset = tableBuilder.charset || 'utf8mb4';
    const collation = tableBuilder.collation || 'utf8mb4_unicode_ci';

    return ` engine=${engine} default character set ${charset} collate ${collation}`;
  }

  /**
   * @private
   * Compila uma constraint de chave primária composta.
   */
  _compilePrimary(command) {
    const columns = this.columnize(command.columns);
    return `primary key (${columns})`;
  }

  /**
   * @private
   * Encontra um comando específico no TableBuilder.
   */
  _getCommand(tableBuilder, type) {
    return tableBuilder._commands.find(c => c.type === type);
  }

  /**
   * Envolve um identificador com crases.
   */
  wrap(value) {
    return `\`${value}\``;
  }

  /**
   * Envolve um nome de tabela com crases.
   */
  wrapTable(table) {
    return this.wrap(table);
  }

  /**
   * Converte um array de nomes de colunas em uma string formatada.
   */
  columnize(columns) {
    return columns.map(c => this.wrap(c)).join(', ');
  }
}

module.exports = MySqlSchemaGrammar;
