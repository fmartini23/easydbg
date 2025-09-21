// lib/query/builder.js

'use strict';

/**
 * @class QueryBuilder
 *
 * Fornece uma API fluente e conveniente para construir e executar consultas SQL.
 *
 * Esta classe não compila SQL diretamente. Em vez disso, ela coleta os "statements"
 * (select, where, from, etc.) e, quando um método terminal é chamado (ex: get(), insert()),
 * ela usa a Grammar apropriada para compilar o SQL e o Client para executá-lo.
 */
class QueryBuilder {
  /**
   * Cria uma instância do QueryBuilder.
   * @param {EasyDBGClient} client - A instância do cliente de banco de dados, usada para executar a consulta.
   * @param {BaseGrammar} grammar - A gramática específica do banco, usada para compilar o SQL.
   */
  constructor(client, grammar) {
    this.client = client;
    this.grammar = grammar;

    // Objeto interno para armazenar todas as partes da consulta.
    this._statements = {
      select: ['*'],
      from: '',
      where: [],
      orderBy: [],
      limit: null,
      offset: null,
      returning: null, // Específico para gramáticas que suportam (ex: Postgres)
    };
  }

  // --- Métodos de Construção da Query ---

  /**
   * Especifica a tabela para a consulta.
   * @param {string} tableName - O nome da tabela.
   * @returns {this}
   */
  from(tableName) {
    this._statements.from = tableName;
    return this;
  }

  /**
   * Alias para o método from().
   * @param {string} tableName - O nome da tabela.
   * @returns {this}
   */
  table(tableName) {
    return this.from(tableName);
  }

  /**
   * Adiciona uma cláusula 'select' à consulta.
   * @param {...string} columns - As colunas a serem selecionadas. Se vazio, seleciona '*'.
   * @returns {this}
   */
  select(...columns) {
    this._statements.select = columns.length > 0 ? columns : ['*'];
    return this;
  }

  /**
   * Adiciona uma cláusula 'where' básica à consulta.
   * @param {string|object} column - O nome da coluna, ou um objeto de condições.
   * @param {string} [operator='='] - O operador da comparação.
   * @param {*} [value] - O valor a ser comparado.
   * @returns {this}
   */
  where(column, operator, value) {
    // Suporte para where({ id: 1, status: 'ativo' })
    if (typeof column === 'object') {
      Object.entries(column).forEach(([key, val]) => {
        this._statements.where.push({ column: key, operator: '=', value: val, type: 'and' });
      });
      return this;
    }

    // Suporte para where('id', 1) -> where('id', '=', 1)
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    this._statements.where.push({ column, operator, value, type: 'and' });
    return this;
  }

  /**
   * Adiciona uma cláusula 'order by' à consulta.
   * @param {string} column - A coluna pela qual ordenar.
   * @param {string} [direction='asc'] - A direção da ordenação ('asc' ou 'desc').
   * @returns {this}
   */
  orderBy(column, direction = 'asc') {
    this._statements.orderBy.push({ column, direction: direction.toLowerCase() });
    return this;
  }

  /**
   * Adiciona uma cláusula 'limit' à consulta.
   * @param {number} value - O número máximo de registros a serem retornados.
   * @returns {this}
   */
  limit(value) {
    this._statements.limit = value > 0 ? value : null;
    return this;
  }

  /**
   * Adiciona uma cláusula 'offset' à consulta.
   * @param {number} value - O número de registros a serem pulados.
   * @returns {this}
   */
  offset(value) {
    this._statements.offset = value > 0 ? value : null;
    return this;
  }

  /**
   * Especifica as colunas a serem retornadas por um statement (usado por Postgres, etc.).
   * @param {...string} columns - As colunas a serem retornadas.
   * @returns {this}
   */
  returning(...columns) {
    this._statements.returning = columns;
    return this;
  }

  // --- Métodos Terminais (Execução) ---

  /**
   * Executa a consulta como um 'select' e retorna todos os resultados.
   * @returns {Promise<Array<object>>}
   */
  async get() {
    const sql = this.grammar.compileSelect(this);
    const bindings = this._getBindingsFor('select');
    return this.client.query(sql, bindings);
  }

  /**
   * Executa a consulta e retorna o primeiro resultado.
   * @returns {Promise<object|null>}
   */
  async first() {
    this.limit(1);
    const results = await this.get();
    return results[0] || null;
  }

  /**
   * Executa um 'insert' com os dados fornecidos.
   * @param {object|object[]} data - Um objeto ou um array de objetos a serem inseridos.
   * @returns {Promise<any>} O resultado da operação de inserção.
   */
  async insert(data) {
    if (!data) return;
    const sql = this.grammar.compileInsert(this, data);
    const bindings = Array.isArray(data) ? data.flatMap(Object.values) : Object.values(data);
    return this.client.query(sql, bindings);
  }

  /**
   * Executa um 'update' com os dados fornecidos.
   * @param {object} data - Um objeto com as colunas e valores a serem atualizados.
   * @returns {Promise<any>} O resultado da operação de atualização.
   */
  async update(data) {
    if (!data || Object.keys(data).length === 0) return 0;
    const sql = this.grammar.compileUpdate(this, data);
    const bindings = this._getBindingsFor('update', data);
    return this.client.query(sql, bindings);
  }

  /**
   * Executa um 'delete'.
   * @returns {Promise<any>} O resultado da operação de exclusão.
   */
  async delete() {
    const sql = this.grammar.compileDelete(this);
    const bindings = this._getBindingsFor('delete');
    return this.client.query(sql, bindings);
  }

  /**
   * @private
   * Coleta e ordena os bindings (parâmetros) para a consulta SQL final.
   * @param {string} method - O tipo de consulta ('select', 'update', 'delete').
   * @param {object} [updateData] - Os dados para a operação de update.
   * @returns {Array}
   */
  _getBindingsFor(method, updateData = null) {
    let bindings = [];
    if (method === 'update') {
      bindings = [...Object.values(updateData)];
    }
    bindings = [...bindings, ...this._statements.where.map(w => w.value)];
    return bindings;
  }
}

module.exports = QueryBuilder;
