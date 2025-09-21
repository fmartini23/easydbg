// lib/query/grammars/postgres-grammar.js

'use strict';

const BaseGrammar = require('./base-grammar');

/**
 * @class PostgresGrammar
 * @extends BaseGrammar
 *
 * Fornece a lógica de compilação de SQL específica para o PostgreSQL.
 *
 * Principais diferenças em relação à BaseGrammar:
 * - Usa placeholders posicionais ($1, $2, ...).
 * - Suporte robusto para a cláusula `RETURNING`.
 * - Usa a sintaxe padrão `LIMIT` e `OFFSET` para paginação.
 */
class PostgresGrammar extends BaseGrammar {
  constructor() {
    super();
    // PostgreSQL usa aspas duplas para identificadores, que já é o padrão da BaseGrammar.
  }

  /**
   * Compila uma consulta SELECT completa.
   * A ordem das cláusulas no PostgreSQL é SELECT, FROM, WHERE, ORDER BY, LIMIT, OFFSET.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder com os statements.
   * @returns {string} A string SQL compilada.
   */
  compileSelect(builder) {
    const statements = builder._statements;

    const parts = [
      this.compileSelectCore(statements.select),
      this.compileFrom(statements.from),
      // Adicionar joins aqui no futuro
      this.compileWheres(statements.where),
      // Adicionar group by aqui no futuro
      this.compileOrderBy(statements.orderBy),
      this.compileLimit(statements.limit),
      this.compileOffset(statements.offset),
    ];

    return this.concatenate(parts).trim();
  }

  /**
   * Compila a cláusula 'limit' para PostgreSQL.
   * @override
   * @param {number} limit - O número de linhas a serem retornadas.
   * @returns {string|null}
   */
  compileLimit(limit) {
    if (limit) {
      return `limit ${parseInt(limit, 10)}`;
    }
    return null;
  }

  /**
   * Compila a cláusula 'offset' para PostgreSQL.
   * @override
   * @param {number} offset - O número de linhas a serem puladas.
   * @returns {string|null}
   */
  compileOffset(offset) {
    if (offset) {
      return `offset ${parseInt(offset, 10)}`;
    }
    return null;
  }

  /**
   * Compila um statement INSERT para PostgreSQL.
   * Adiciona suporte para a cláusula `RETURNING`.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @param {object} data - Os dados a serem inseridos.
   * @returns {string}
   */
  compileInsert(builder, data) {
    const table = this.wrapTable(builder._statements.from);
    const columns = this.columnize(Object.keys(data));
    const placeholders = this.parameterize(data);

    let sql = `insert into ${table} (${columns}) values (${placeholders})`;

    // Adiciona a cláusula RETURNING se especificada no builder
    const returning = builder._statements.returning;
    if (returning) {
      sql += ` returning ${this.columnize(returning)}`;
    }

    return sql;
  }

  /**
   * Compila um statement UPDATE para PostgreSQL.
   * Adiciona suporte para a cláusula `RETURNING`.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @param {object} data - Os dados a serem atualizados.
   * @returns {string}
   */
  compileUpdate(builder, data) {
    const table = this.wrapTable(builder._statements.from);
    const columns = Object.keys(data).map(key => `${this.wrap(key)} = ?`).join(', ');
    const wheres = this.compileWheres(builder._statements.where);

    let sql = `update ${table} set ${columns} ${wheres}`;

    const returning = builder._statements.returning;
    if (returning) {
      sql += ` returning ${this.columnize(returning)}`;
    }

    return sql;
  }

  /**
   * Compila um statement DELETE para PostgreSQL.
   * Adiciona suporte para a cláusula `RETURNING`.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @returns {string}
   */
  compileDelete(builder) {
    const table = this.wrapTable(builder._statements.from);
    const wheres = this.compileWheres(builder._statements.where);

    let sql = `delete from ${table} ${wheres}`;

    const returning = builder._statements.returning;
    if (returning) {
      sql += ` returning ${this.columnize(returning)}`;
    }

    return sql;
  }

  /**
   * Substitui os placeholders '?' pelos placeholders posicionais '$n' do PostgreSQL.
   * Este método é chamado antes de enviar a query final para o driver.
   * @param {string} sql - A string SQL com placeholders '?'.
   * @returns {string} A string SQL com placeholders '$n'.
   */
  prepareBindings(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  /**
   * Concatena as partes de uma consulta SQL.
   * @private
   * @param {string[]} parts - As partes da consulta.
   * @returns {string}
   */
  concatenate(parts) {
    return parts.filter(part => part).join(' ');
  }
}

module.exports = PostgresGrammar;
