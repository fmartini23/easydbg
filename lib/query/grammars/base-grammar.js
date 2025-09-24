// lib/query/grammars/base-grammar.js

'use strict';

/**
 * @class BaseGrammar
 *
 * Classe base para todas as gramáticas de Query Builder.
 * Contém a lógica de compilação SQL que é comum a todos os bancos de dados.
 * As gramáticas específicas de cada banco de dados estendem esta classe
 * para sobrescrever ou adicionar comportamentos específicos.
 */
class BaseGrammar {
  /**
   * Protege um identificador (nome de tabela ou coluna) com aspas duplas.
   * @param {string} value - O valor a ser protegido.
   * @returns {string} O valor protegido (ex: "users").
   */
  wrap(value) {
    if (value === '*') {
      return value;
    }
    // Remove quaisquer aspas duplas existentes para evitar duplicação e as adiciona novamente.
    return `"${value.replace(/"/g, '')}"`;
  }

  /**
   * Compila uma lista de colunas para a cláusula SELECT.
   * @param {string[]} columns - Array de nomes de colunas.
   * @returns {string} A string SQL para as colunas.
   */
  compileColumns(columns) {
    return columns.map(col => this.wrap(col)).join(', ');
  }

  /**
   * Compila a cláusula FROM.
   * @param {string} tableName - O nome da tabela.
   * @returns {string} A string SQL para a cláusula FROM.
   */
  compileFrom(tableName) {
    return `FROM ${this.wrap(tableName)}`;
  }

  /**
   * Compila a cláusula WHERE.
   * @param {object[]} wheres - Array de objetos where.
   * @returns {string} A string SQL para a cláusula WHERE.
   */
  compileWheres(wheres) {
    if (wheres.length === 0) return '';

    const compiled = wheres.map(where => {
      if (where.type === 'sub') {
        return `(${where.sql})`;
      }
      return `${this.wrap(where.column)} ${where.operator} ?`;
    });

    return `WHERE ${compiled.join(` ${wheres[0].boolean} `)}`;
  }

  /**
   * Compila a cláusula JOIN.
   * @param {object[]} joins - Array de objetos join.
   * @returns {string} A string SQL para a cláusula JOIN.
   */
  compileJoins(joins) {
    if (joins.length === 0) return '';

    return joins.map(join => {
      return `${join.type.toUpperCase()} JOIN ${this.wrap(join.table)} ON ${this.wrap(join.first)} ${join.operator} ${this.wrap(join.second)}`;
    }).join(' ');
  }

  /**
   * Compila a cláusula GROUP BY.
   * @param {string[]} groups - Array de colunas para agrupar.
   * @returns {string} A string SQL para a cláusula GROUP BY.
   */
  compileGroups(groups) {
    if (groups.length === 0) return '';
    return `GROUP BY ${groups.map(col => this.wrap(col)).join(', ')}`;
  }

  /**
   * Compila a cláusula HAVING.
   * @param {object[]} havings - Array de objetos having.
   * @returns {string} A string SQL para a cláusula HAVING.
   */
  compileHavings(havings) {
    if (havings.length === 0) return '';

    const compiled = havings.map(having => {
      return `${this.wrap(having.column)} ${having.operator} ?`;
    });

    return `HAVING ${compiled.join(` ${havings[0].boolean} `)}`;
  }

  /**
   * Compila a cláusula ORDER BY.
   * @param {object[]} orders - Array de objetos order.
   * @returns {string} A string SQL para a cláusula ORDER BY.
   */
  compileOrders(orders) {
    if (orders.length === 0) return '';
    return `ORDER BY ${orders.map(order => `${this.wrap(order.column)} ${order.direction.toUpperCase()}`).join(', ')}`;
  }

  /**
   * Compila a cláusula LIMIT.
   * @param {number} limit - O valor do limite.
   * @returns {string} A string SQL para a cláusula LIMIT.
   */
  compileLimit(limit) {
    return limit ? `LIMIT ${limit}` : '';
  }

  /**
   * Compila a cláusula OFFSET.
   * @param {number} offset - O valor do offset.
   * @returns {string} A string SQL para a cláusula OFFSET.
   */
  compileOffset(offset) {
    return offset ? `OFFSET ${offset}` : '';
  }

  /**
   * Compila uma consulta SELECT completa.
   * @param {object} statements - O objeto de estado do QueryBuilder.
   * @returns {string} A string SQL compilada.
   */
  compileSelect(statements) {
    let sql = 'SELECT ';

    if (statements.aggregate) {
      sql += `${statements.aggregate.func.toUpperCase()}(${this.wrap(statements.aggregate.column)}) AS aggregate`;
    } else {
      sql += this.compileColumns(statements.select);
    }

    sql += ` ${this.compileFrom(statements.from)}`;
    sql += ` ${this.compileJoins(statements.joins)}`;
    sql += ` ${this.compileWheres(statements.wheres)}`;
    sql += ` ${this.compileGroups(statements.groups)}`;
    sql += ` ${this.compileHavings(statements.havings)}`;
    sql += ` ${this.compileOrders(statements.orders)}`;
    sql += ` ${this.compileLimit(statements.limit)}`;
    sql += ` ${this.compileOffset(statements.offset)}`;

    return sql.trim();
  }

  /**
   * Compila uma consulta INSERT.
   * @param {string} tableName - O nome da tabela.
   * @param {object} data - Os dados a serem inseridos.
   * @returns {{sql: string, bindings: Array}}
   */
  compileInsert(tableName, data) {
    const columns = Object.keys(data).map(col => this.wrap(col)).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const bindings = Object.values(data);
    const sql = `INSERT INTO ${this.wrap(tableName)} (${columns}) VALUES (${placeholders})`;
    return { sql, bindings };
  }

  /**
   * Compila uma consulta UPDATE.
   * @param {object} statements - O objeto de estado do QueryBuilder.
   * @param {object} data - Os dados a serem atualizados.
   * @param {Array} whereBindings - Bindings da cláusula WHERE.
   * @returns {{sql: string, bindings: Array}}
   */
  compileUpdate(statements, data, whereBindings) {
    const setClauses = Object.keys(data).map(col => `${this.wrap(col)} = ?`).join(', ');
    const dataBindings = Object.values(data);
    const sql = `UPDATE ${this.wrap(statements.from)} SET ${setClauses} ${this.compileWheres(statements.wheres)}`;
    const bindings = [...dataBindings, ...whereBindings];
    return { sql, bindings };
  }

  /**
   * Compila uma consulta DELETE.
   * @param {object} statements - O objeto de estado do QueryBuilder.
   * @param {Array} whereBindings - Bindings da cláusula WHERE.
   * @returns {{sql: string, bindings: Array}}
   */
  compileDelete(statements, whereBindings) {
    const sql = `DELETE FROM ${this.wrap(statements.from)} ${this.compileWheres(statements.wheres)}`;
    const bindings = [...whereBindings];
    return { sql, bindings };
  }
}

module.exports = BaseGrammar;
