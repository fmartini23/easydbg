// lib/schema/table-builder.js

'use strict';

/**
 * @class ColumnDefinition
 *
 * Uma classe auxiliar para permitir o encadeamento de modificadores de coluna.
 * Cada método de tipo de coluna no TableBuilder retorna uma instância desta classe.
 */
class ColumnDefinition {
  constructor(definition) {
    this._definition = definition;
  }

  notNullable() {
    this._definition.isNullable = false;
    return this;
  }

  unique() {
    this._definition.isUnique = true;
    return this;
  }

  primary() {
    this._definition.isPrimary = true;
    return this;
  }

  defaultTo(value) {
    this._definition.defaultValue = value;
    return this;
  }
}

/**
 * @class TableBuilder
 *
 * Fornece uma API fluente para definir as colunas e índices de uma tabela.
 *
 * Esta classe é instanciada pelo SchemaBuilder e passada para o callback do usuário.
 * Ela coleta as definições das colunas, que são então usadas pela SchemaGrammar
 * para compilar o SQL DDL final.
 */
class TableBuilder {
  /**
   * Cria uma instância do TableBuilder.
   * @param {string} tableName - O nome da tabela que está sendo construída.
   */
  constructor(tableName) {
    this.tableName = tableName;
    this._columns = []; // Array para armazenar as definições de cada coluna
    this._commands = []; // Array para comandos de nível de tabela (ex: índices)
  }

  /**
   * Adiciona uma nova coluna à definição da tabela.
   * @private
   * @param {string} type - O tipo de dado da coluna (ex: 'string', 'integer').
   * @param {string} name - O nome da coluna.
   * @param {object} [options={}] - Opções adicionais (ex: length para string).
   * @returns {ColumnDefinition}
   */
  _addColumn(type, name, options = {}) {
    const definition = {
      type,
      name,
      isNullable: true,
      isUnique: false,
      isPrimary: false,
      defaultValue: undefined,
      ...options,
    };
    this._columns.push(definition);
    return new ColumnDefinition(definition);
  }

  // --- Métodos de Tipo de Coluna ---

  /**
   * Cria uma coluna de auto-incremento (geralmente usada como chave primária).
   * @param {string} name - O nome da coluna (geralmente 'id').
   */
  increments(name = 'id') {
    return this._addColumn('increments', name).primary();
  }

  /**
   * Cria uma coluna do tipo VARCHAR.
   * @param {string} name - O nome da coluna.
   * @param {number} [length=255] - O comprimento máximo da string.
   */
  string(name, length = 255) {
    return this._addColumn('string', name, { length });
  }

  /**
   * Cria uma coluna do tipo TEXT.
   * @param {string} name - O nome da coluna.
   */
  text(name) {
    return this._addColumn('text', name);
  }

  /**
   * Cria uma coluna do tipo INTEGER.
   * @param {string} name - O nome da coluna.
   */
  integer(name) {
    return this._addColumn('integer', name);
  }

  /**
   * Cria uma coluna do tipo BIGINT.
   * @param {string} name - O nome da coluna.
   */
  bigInteger(name) {
    return this._addColumn('bigInteger', name);
  }

  /**
   * Cria uma coluna do tipo BOOLEAN.
   * @param {string} name - O nome da coluna.
   */
  boolean(name) {
    return this._addColumn('boolean', name);
  }

  /**
   * Cria uma coluna do tipo DECIMAL.
   * @param {string} name - O nome da coluna.
   * @param {number} [precision=8] - O número total de dígitos.
   * @param {number} [scale=2] - O número de dígitos após o ponto decimal.
   */
  decimal(name, precision = 8, scale = 2) {
    return this._addColumn('decimal', name, { precision, scale });
  }

  /**
   * Cria uma coluna do tipo TIMESTAMP.
   * @param {string} name - O nome da coluna.
   * @param {object} [options={}] - Opções específicas do banco (ex: useTz: true para Postgres).
   */
  timestamp(name, options = {}) {
    return this._addColumn('timestamp', name, options);
  }

  /**
   * Cria colunas 'created_at' e 'updated_at'.
   * @param {boolean} [useTimestamps=true] - Se deve usar TIMESTAMP (true) ou TIMESTAMPTZ (false).
   * @param {boolean} [defaultToNow=true] - Se deve definir o valor padrão como o tempo atual.
   */
  timestamps(useTimestamps = true, defaultToNow = true) {
    const type = useTimestamps ? 'timestamp' : 'timestamptz';
    this._addColumn(type, 'created_at').defaultTo(this.client.fn.now()).notNullable();
    this._addColumn(type, 'updated_at').defaultTo(this.client.fn.now()).notNullable();
  }

  // --- Métodos de Comando de Tabela ---

  /**
   * Adiciona um comando para criar um índice.
   * @param {string|string[]} columns - A(s) coluna(s) a serem incluídas no índice.
   * @param {string} [indexName] - O nome do índice.
   */
  index(columns, indexName) {
    this._commands.push({
      type: 'index',
      columns: Array.isArray(columns) ? columns : [columns],
      indexName,
    });
  }

  /**
   * Adiciona um comando para criar uma chave primária (simples ou composta).
   * @param {string|string[]} columns - A(s) coluna(s) que compõem a chave primária.
   * @param {string} [constraintName] - O nome da constraint.
   */
  primary(columns, constraintName) {
    this._commands.push({
      type: 'primary',
      columns: Array.isArray(columns) ? columns : [columns],
      constraintName,
    });
  }
}

module.exports = TableBuilder;
