// lib/query/grammars/base-grammar.js

'use strict';

/**
 * @class BaseGrammar
 *
 * Fornece a lógica de compilação de SQL padrão (ANSI SQL) e a estrutura
 * base para todas as outras gramáticas específicas de banco de dados.
 *
 * As gramáticas filhas (ex: PostgresGrammar) herdam desta classe e
 * sobrescrevem apenas os métodos cuja sintaxe difere do padrão.
 */
class BaseGrammar {
  constructor() {
    // Caractere usado para envolver identificadores (nomes de tabelas/colunas).
    // Aspas duplas é o padrão SQL, mas MySQL usa crases (`).
    this.wrapper = '"';
  }

  /**
   * Compila uma consulta SELECT completa a partir de suas partes.
   * @param {QueryBuilder} builder - A instância do Query Builder com os statements.
   * @returns {string} A string SQL compilada.
   */
  compileSelect(builder) {
    const statements = builder._statements;

    // Orquestra a compilação, chamando métodos para cada parte da consulta.
    const parts = [
      this.compileSelectCore(statements.select),
      this.compileFrom(statements.from),
      this.compileWheres(statements.where),
      this.compileOrderBy(statements.orderBy),
      this.compileLimit(statements.limit),
    ];

    // Filtra partes vazias e as une com espaços.
    return parts.filter(part => part).join(' ');
  }

  /**
   * Compila a cláusula 'select'.
   * @param {string[]} columns - Array de colunas.
   * @returns {string}
   */
  compileSelectCore(columns) {
    return `select ${this.columnize(columns)}`;
  }

  /**
   * Compila a cláusula 'from'.
   * @param {string} table - O nome da tabela.
   * @returns {string}
   */
  compileFrom(table) {
    return `from ${this.wrapTable(table)}`;
  }

  /**
   * Compila todas as cláusulas 'where'.
   * @param {object[]} wheres - Array de objetos 'where'.
   * @returns {string|null}
   */
  compileWheres(wheres) {
    if (!wheres || wheres.length === 0) {
      return null;
    }

    const whereClauses = wheres.map((where, index) => {
      // O placeholder '?' será substituído pelo driver ou por outra gramática.
      const clause = `${this.wrap(where.column)} ${where.operator} ?`;
      // Por enquanto, só suportamos 'and'.
      return index === 0 ? clause : `and ${clause}`;
    }).join(' ');

    return `where ${whereClauses}`;
  }

  /**
   * Compila a cláusula 'order by'.
   * @param {object[]} orders - Array de objetos de ordenação.
   * @returns {string|null}
   */
  compileOrderBy(orders) {
    if (!orders || orders.length === 0) {
      return null;
    }
    const orderByClauses = orders.map(order => `${this.wrap(order.column)} ${order.direction}`).join(', ');
    return `order by ${orderByClauses}`;
  }

  /**
   * Compila a cláusula 'limit'. O padrão SQL é 'FETCH FIRST n ROWS ONLY'.
   * A maioria dos bancos usa 'LIMIT n', então as gramáticas filhas sobrescreverão isso.
   * @param {number} limit - O número de linhas a serem retornadas.
   * @returns {string|null}
   */
  compileLimit(limit) {
    if (limit) {
      return `fetch first ${limit} rows only`;
    }
    return null;
  }

  /**
   * Compila um statement INSERT.
   * @param {string} table - O nome da tabela.
   * @param {object} data - Os dados a serem inseridos.
   * @returns {string}
   */
  compileInsert(table, data) {
    const columns = this.columnize(Object.keys(data));
    const placeholders = this.parameterize(data);
    return `insert into ${this.wrapTable(table)} (${columns}) values (${placeholders})`;
  }

  /**
   * Compila um statement UPDATE.
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @param {object} data - Os dados a serem atualizados.
   * @returns {string}
   */
  compileUpdate(builder, data) {
    const table = this.wrapTable(builder._statements.from);
    const columns = Object.keys(data).map(key => `${this.wrap(key)} = ?`).join(', ');
    const wheres = this.compileWheres(builder._statements.where);

    return `update ${table} set ${columns} ${wheres}`;
  }

  /**
   * Compila um statement DELETE.
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @returns {string}
   */
  compileDelete(builder) {
    const table = this.wrapTable(builder._statements.from);
    const wheres = this.compileWheres(builder._statements.where);
    return `delete from ${table} ${wheres}`;
  }

  /**
   * Converte um array de nomes de colunas em uma string formatada e protegida.
   * @param {string[]} columns
   * @returns {string}
   */
  columnize(columns) {
    return columns.map(c => this.wrap(c)).join(', ');
  }

  /**
   * Converte um objeto ou array em uma string de placeholders ('?').
   * @param {object|Array} values
   * @returns {string}
   */
  parameterize(values) {
    const data = Array.isArray(values) ? values : Object.values(values);
    return data.map(() => '?').join(', ');
  }

  /**
   * Envolve um identificador (coluna) com o caractere de proteção.
   * Suporta "tabela.coluna".
   * @param {string} value
   * @returns {string}
   */
  wrap(value) {
    if (value === '*') return value;
    const parts = value.split('.');
    return parts.map(part => `${this.wrapper}${part}${this.wrapper}`).join('.');
  }

  /**
   * Envolve um nome de tabela com o caractere de proteção.
   * @param {string} table
   * @returns {string}
   */
  wrapTable(table) {
    return this.wrap(table);
  }
}

module.exports = BaseGrammar;
