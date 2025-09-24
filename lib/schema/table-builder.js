// lib/schema/table-builder.js

'use strict';

/**
 * @class ColumnDefinition
 * Uma classe auxiliar que permite encadear modificadores a uma definição de coluna.
 */
class ColumnDefinition {
  constructor(attributes) {
    this._attributes = attributes;
  }
  notNullable() { this._attributes.isNullable = false; return this; }
  unique() { this._attributes.isUnique = true; return this; }
  primary() { this._attributes.isPrimary = true; return this; }
  defaultTo(value) { this._attributes.defaultValue = value; return this; }
}

/**
 * @class ForeignKeyBuilder
 * Uma classe auxiliar para construir constraints de chave estrangeira de forma fluente.
 */
class ForeignKeyBuilder {
  constructor(command) {
    this._command = command;
  }
  references(column) { this._command.references = column; return this; }
  on(table) { this._command.onTable = table; return this; }
  onDelete(action) { this._command.onDelete = action; return this; } // ex: 'CASCADE', 'SET NULL'
  onUpdate(action) { this._command.onUpdate = action; return this; } // ex: 'CASCADE'
}

/**
 * @class TableBuilder
 *
 * Constrói a definição de uma tabela (colunas e constraints) de forma programática.
 * Esta classe é usada nos callbacks de `db.schema.createTable()` e `db.schema.alterTable()`.
 * Ela coleta as definições e as armazena para serem compiladas pela SchemaGrammar.
 */
class TableBuilder {
  /**
   * @param {string} type - O tipo de operação ('create' ou 'alter').
   * @param {string} tableName - O nome da tabela.
   */
  constructor(type, tableName) {
    this.type = type;
    this.tableName = tableName;
    this._columns = [];   // Definições de novas colunas
    this._commands = [];  // Comandos de nível de tabela (índices, chaves estrangeiras, etc.)
  }

  /**
   * Adiciona uma nova definição de coluna à pilha.
   * @private
   */
  _addColumn(type, name, options = {}) {
    const attributes = { type, name, isNullable: true, ...options };
    this._columns.push(attributes);
    return new ColumnDefinition(attributes);
  }

  /**
   * Adiciona um novo comando de nível de tabela à pilha.
   * @private
   */
  _addCommand(type, attributes = {}) {
    const command = { type, ...attributes };
    this._commands.push(command);
    return command;
  }

  // --- Tipos de Coluna ---

  increments(name = 'id') { return this._addColumn('increments', name).primary(); }
  bigIncrements(name = 'id') { return this._addColumn('bigIncrements', name).primary(); }
  string(name, length = 255) { return this._addColumn('string', name, { length }); }
  text(name) { return this._addColumn('text', name); }
  integer(name) { return this._addColumn('integer', name); }
  bigInteger(name) { return this._addColumn('bigInteger', name); }
  boolean(name) { return this._addColumn('boolean', name); }
  decimal(name, precision = 8, scale = 2) { return this._addColumn('decimal', name, { precision, scale }); }
  timestamp(name, useTz = false) { return this._addColumn(useTz ? 'timestamptz' : 'timestamp', name); }
  json(name) { return this._addColumn('json', name); }
  jsonb(name) { return this._addColumn('jsonb', name); }

  /**
   * Atalho para criar colunas 'created_at' e 'updated_at'.
   * @param {boolean} useTimestamps - Se true, usa o tipo TIMESTAMP (ou DATETIME).
   * @param {boolean} defaultToNow - Se true, define o valor padrão como o tempo atual.
   */
  timestamps(useTimestamps = true, defaultToNow = true) {
    if (useTimestamps) {
      const createdAt = this.timestamp('created_at');
      const updatedAt = this.timestamp('updated_at');
      if (defaultToNow) {
        createdAt.defaultTo(this.client.fn.now());
        updatedAt.defaultTo(this.client.fn.now());
      }
    }
  }

  // --- Comandos de Nível de Tabela ---

  /**
   * Cria um índice em uma ou mais colunas.
   * @param {string|string[]} columns - A(s) coluna(s) a serem indexadas.
   * @param {string} [indexName] - O nome do índice.
   */
  index(columns, indexName) {
    this._addCommand('index', { columns: Array.isArray(columns) ? columns : [columns], indexName });
  }

  /**
   * Cria uma constraint de chave primária composta.
   * @param {string|string[]} columns - As colunas da chave primária.
   * @param {string} [constraintName] - O nome da constraint.
   */
  primary(columns, constraintName) {
    this._addCommand('primary', { columns: Array.isArray(columns) ? columns : [columns], constraintName });
  }

  /**
   * Cria uma constraint de chave estrangeira.
   * @param {string|string[]} columns - A(s) coluna(s) nesta tabela.
   * @returns {ForeignKeyBuilder}
   */
  foreign(columns) {
    const command = this._addCommand('foreign', { columns: Array.isArray(columns) ? columns : [columns] });
    return new ForeignKeyBuilder(command);
  }

  // --- Comandos de Alteração (usados com alterTable) ---

  dropColumn(column) {
    this._addCommand('dropColumn', { column });
  }

  renameColumn(from, to) {
    this._addCommand('renameColumn', { from, to });
  }

  dropForeign(columns) {
    this._addCommand('dropForeign', { columns: Array.isArray(columns) ? columns : [columns] });
  }

  dropIndex(columns) {
    this._addCommand('dropIndex', { columns: Array.isArray(columns) ? columns : [columns] });
  }
}

module.exports = TableBuilder;
