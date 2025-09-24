// lib/query/builder.js

'use strict';

/**
 * @class QueryBuilder
 * Fornece uma API fluente para construir e executar consultas SQL.
 * Esta classe acumula o estado da consulta e delega a compilação do SQL
 * para a gramática específica do banco de dados.
 */
class QueryBuilder {
  /**
   * @param {EasyDBGClient|Transaction} client - A instância do cliente ou transação que executará a consulta.
   * @param {BaseGrammar} grammar - A gramática que compilará a consulta para SQL.
   */
  constructor(client, grammar) {
    this.client = client;
    this.grammar = grammar;

    // O estado interno da consulta. Cada método adiciona informações aqui.
    this._statements = {
      select: ['*'],
      from: null,
      joins: [],
      wheres: [],
      groups: [],
      havings: [],
      orders: [],
      limit: null,
      offset: null,
      aggregate: null, // Para funções como count(), sum(), etc.
    };

    // Armazena os valores para os placeholders da consulta.
    this._bindings = {
      where: [],
      having: [],
    };
  }

  // --- Métodos de Construção da Query ---

  select(...columns) {
    this._statements.select = columns.length > 0 ? columns : ['*'];
    return this;
  }

  from(tableName) {
    this._statements.from = tableName;
    return this;
  }

  // --- MELHORIA: JOINs ---
  join(table, first, operator, second) {
    this._statements.joins.push({ type: 'inner', table, first, operator, second });
    return this;
  }

  leftJoin(table, first, operator, second) {
    this._statements.joins.push({ type: 'left', table, first, operator, second });
    return this;
  }

  rightJoin(table, first, operator, second) {
    this._statements.joins.push({ type: 'right', table, first, operator, second });
    return this;
  }

  where(column, operator, value) {
    // Suporte para where({ 'id': 1, 'active': true })
    if (typeof column === 'object') {
      Object.entries(column).forEach(([key, val]) => {
        this.where(key, '=', val);
      });
      return this;
    }

    // --- MELHORIA: Suporte a Subqueries ---
    if (column instanceof QueryBuilder) {
      const { sql, bindings } = column.toSql();
      this._statements.wheres.push({ type: 'sub', sql, boolean: 'and' });
      this._bindings.where.push(...bindings);
      return this;
    }

    this._statements.wheres.push({ column, operator, value, boolean: 'and' });
    this._bindings.where.push(value);
    return this;
  }

  // --- MELHORIA: Agrupamento ---
  groupBy(...columns) {
    this._statements.groups.push(...columns);
    return this;
  }

  having(column, operator, value) {
    this._statements.havings.push({ column, operator, value, boolean: 'and' });
    this._bindings.having.push(value);
    return this;
  }

  orderBy(column, direction = 'asc') {
    this._statements.orders.push({ column, direction });
    return this;
  }

  limit(value) {
    this._statements.limit = value;
    return this;
  }

  offset(value) {
    this._statements.offset = value;
    return this;
  }

  // --- Métodos de Execução (Finais) ---

  /**
   * Executa a consulta SELECT e retorna um array de resultados.
   * @returns {Promise<Array<object>>}
   */
  async get() {
    const { sql, bindings } = this.toSql();
    return this.client.query(sql, bindings);
  }

  /**
   * Executa a consulta com um limite de 1 e retorna o primeiro resultado ou null.
   * @returns {Promise<object|null>}
   */
  async first() {
    this.limit(1);
    const results = await this.get();
    return results[0] || null;
  }

  // --- MELHORIA: Funções de Agregação ---
  async aggregate(func, column) {
    this._statements.aggregate = { func, column };
    const { sql, bindings } = this.toSql();
    const result = await this.client.query(sql, bindings);
    if (!result || result.length === 0) return 0;
    // O resultado da agregação é geralmente retornado em uma coluna chamada 'aggregate'.
    const value = result[0].aggregate;
    return Number(value);
  }

  count(column = '*') { return this.aggregate('count', column); }
  sum(column) { return this.aggregate('sum', column); }
  avg(column) { return this.aggregate('avg', column); }
  min(column) { return this.aggregate('min', column); }
  max(column) { return this.aggregate('max', column); }

  /**
   * Executa uma consulta INSERT.
   * @param {object|Array<object>} data - Os dados a serem inseridos.
   * @returns {Promise<any>}
   */
  async insert(data) {
    const { sql, bindings } = this.grammar.compileInsert(this._statements.from, data);
    return this.client.query(sql, bindings);
  }

  /**
   * Executa uma consulta UPDATE.
   * @param {object} data - Os dados a serem atualizados.
   * @returns {Promise<any>}
   */
  async update(data) {
    const allBindings = [...this._bindings.where, ...this._bindings.having];
    const { sql, bindings } = this.grammar.compileUpdate(this._statements, data, allBindings);
    return this.client.query(sql, bindings);
  }

  /**
   * Executa uma consulta DELETE.
   * @returns {Promise<any>}
   */
  async delete() {
    const allBindings = [...this._bindings.where, ...this._bindings.having];
    const { sql, bindings } = this.grammar.compileDelete(this._statements, allBindings);
    return this.client.query(sql, bindings);
  }

  /**
   * Compila a consulta para SQL e bindings, sem executá-la.
   * @returns {{sql: string, bindings: Array}}
   */
  toSql() {
    const sql = this.grammar.compileSelect(this._statements);
    const bindings = [...this._bindings.where, ...this._bindings.having];
    return { sql, bindings };
  }
}

module.exports = QueryBuilder;
