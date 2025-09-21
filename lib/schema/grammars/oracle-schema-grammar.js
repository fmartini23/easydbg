// lib/schema/grammars/oracle-schema-grammar.js

'use strict';

/**
 * @class OracleSchemaGrammar
 *
 * Compila as definições de esquema do TableBuilder para a sintaxe DDL do Oracle Database.
 */
class OracleSchemaGrammar {
  constructor() {
    this.wrapper = '"'; // Oracle usa aspas duplas para preservar a capitalização
  }

  /**
   * Compila um comando 'create table'.
   * No Oracle, a criação de uma tabela com auto-incremento pode exigir múltiplos comandos.
   * @param {TableBuilder} tableBuilder - A instância do TableBuilder com as definições.
   * @returns {string[]} Um array de comandos SQL.
   */
  compileCreateTable(tableBuilder) {
    const tableName = this.wrapTable(tableBuilder.tableName);
    const columns = this._getColumns(tableBuilder).join(', ');

    const createTableSql = `create table ${tableName} (${columns})`;
    let commands = [createTableSql];

    // Para colunas de auto-incremento, precisamos criar uma sequência e um trigger.
    const incrementsColumn = tableBuilder._columns.find(c => c.type === 'increments' || c.type === 'bigIncrements');
    if (incrementsColumn) {
      const sequenceName = this._getSequenceName(tableBuilder.tableName);
      commands.push(this._compileCreateSequence(sequenceName));
      commands.push(this._compileCreateTrigger(tableBuilder.tableName, incrementsColumn.name, sequenceName));
    }

    return commands;
  }

  /**
   * Compila um comando 'drop table'.
   * @param {string} tableName - O nome da tabela.
   * @returns {string}
   */
  compileDropTable(tableName) {
    return `drop table ${this.wrapTable(tableName)} cascade constraints`;
  }

  /**
   * Compila um comando 'drop table if exists'.
   * Oracle não tem um 'IF EXISTS' direto, então usamos um bloco PL/SQL.
   * @param {string} tableName - O nome da tabela.
   * @returns {string}
   */
  compileDropTableIfExists(tableName) {
    const sequenceName = this._getSequenceName(tableName);
    // Este bloco anônimo tenta dropar a tabela e a sequência, ignorando erros se não existirem.
    return `
      begin
        execute immediate 'drop table ${this.wrapTable(tableName)} cascade constraints';
        execute immediate 'drop sequence ${this.wrap(sequenceName)}';
      exception
        when others then
          if sqlcode != -942 and sqlcode != -2289 then
            raise;
          end if;
      end;
    `;
  }

  /**
   * Compila um comando para verificar se uma tabela existe.
   * @param {string} tableName - O nome da tabela.
   * @returns {string}
   */
  compileHasTable(tableName) {
    return `select table_name from user_tables where table_name = '${tableName.toUpperCase()}'`;
  }

  /**
   * Compila um comando para renomear uma tabela.
   * @param {string} from - O nome atual da tabela.
   * @param {string} to - O novo nome da tabela.
   * @returns {string}
   */
  compileRenameTable(from, to) {
    return `alter table ${this.wrapTable(from)} rename to ${this.wrapTable(to)}`;
  }

  /**
   * @private
   * Itera sobre as definições de coluna do TableBuilder e as compila para SQL.
   */
  _getColumns(tableBuilder) {
    return tableBuilder._columns.map(column => {
      let sql = this.wrap(column.name);
      sql += ` ${this._getType(column)}`;
      sql += this._getModifiers(column);
      return sql;
    });
  }

  /**
   * @private
   * Converte um tipo de coluna genérico para o tipo específico do Oracle.
   */
  _getType(column) {
    switch (column.type) {
      case 'increments':
        return 'number(10, 0)';
      case 'bigIncrements':
        return 'number(20, 0)';
      case 'string':
        return `varchar2(${column.length} char)`; // 'char' é importante para semântica de caracteres
      case 'text':
        return 'clob';
      case 'integer':
        return 'number(10, 0)';
      case 'bigInteger':
        return 'number(20, 0)';
      case 'boolean':
        return 'number(1, 0)';
      case 'decimal':
        return `number(${column.precision}, ${column.scale})`;
      case 'timestamp':
      case 'timestamptz':
        return 'timestamp';
      default:
        throw new Error(`Tipo de coluna não suportado para Oracle: ${column.type}`);
    }
  }

  /**
   * @private
   * Compila os modificadores (constraints) para uma coluna.
   */
  _getModifiers(column) {
    let sql = '';
    if (column.defaultValue !== undefined) {
      sql += ` default ${this._formatDefaultValue(column.defaultValue)}`;
    }
    if (column.isNullable === false) sql += ' not null';
    if (column.isPrimary) sql += ' primary key';
    if (column.isUnique) sql += ' unique';
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
   * Gera um nome padronizado para a sequência de uma tabela.
   */
  _getSequenceName(tableName) {
    // Limita o nome para não exceder o limite de 30 caracteres do Oracle.
    return `${tableName.substring(0, 25)}_seq`.toUpperCase();
  }

  /**
   * @private
   * Compila o comando para criar uma sequência.
   */
  _compileCreateSequence(sequenceName) {
    return `create sequence ${this.wrap(sequenceName)}`;
  }

  /**
   * @private
   * Compila o comando para criar o trigger de auto-incremento.
   */
  _compileCreateTrigger(tableName, columnName, sequenceName) {
    const triggerName = `${tableName.substring(0, 21)}_bir`.toUpperCase(); // Before Insert Row
    return `
      create or replace trigger ${this.wrap(triggerName)}
      before insert on ${this.wrapTable(tableName)}
      for each row
      begin
        if :new.${this.wrap(columnName)} is null then
          :new.${this.wrap(columnName)} := ${this.wrap(sequenceName)}.nextval;
        end if;
      end;
    `;
  }

  // Métodos de helper para envolver identificadores
  wrap(value) { return `"${value}"`; }
  wrapTable(table) { return this.wrap(table); }
}

module.exports = OracleSchemaGrammar;
