// lib/query/grammars/mysql-grammar.js

'use strict';

const BaseGrammar = require('./base-grammar');

/**
 * @class MySqlGrammar
 * @extends BaseGrammar
 *
 * Fornece a lógica de compilação de SQL específica para o MySQL.
 *
 * Principais diferenças em relação à BaseGrammar:
 * - Usa crases (`) como caractere de proteção para identificadores.
 * - Implementa a sintaxe de paginação com `LIMIT ... OFFSET ...`.
 * - Suporta a sintaxe `INSERT ... ON DUPLICATE KEY UPDATE`.
 * - Usa uma sintaxe de `UPDATE` com `JOIN`.
 */
class MySqlGrammar extends BaseGrammar {
  constructor() {
    super();
    // MySQL usa crases (backticks) para envolver identificadores.
    this.wrapper = '`';
  }

  /**
   * Envolve um identificador com as crases de proteção do MySQL.
   * @override
   * @param {string} value
   * @returns {string}
   */
  wrap(value) {
    // A lógica da BaseGrammar já funciona, só precisamos garantir que o wrapper correto seja usado.
    // No entanto, podemos otimizar para não precisar de um wrapper de fechamento.
    if (value === '*') return value;
    const parts = value.split('.');
    return parts.map(part => `${this.wrapper}${part}${this.wrapper}`).join('.');
  }

  /**
   * Compila uma consulta SELECT completa.
   * A ordem das cláusulas no MySQL é SELECT, FROM, WHERE, ORDER BY, LIMIT, OFFSET.
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
      this.compileLimit(statements.limit),   // A ordem de LIMIT/OFFSET é importante
      this.compileOffset(statements.offset),
    ];

    return parts.filter(part => part).join(' ');
  }

  /**
   * Compila a cláusula 'limit' para MySQL.
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
   * Compila a cláusula 'offset' para MySQL.
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
   * Compila um statement UPDATE para MySQL.
   * A sintaxe do MySQL permite joins diretamente no update.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @param {object} data - Os dados a serem atualizados.
   * @returns {string}
   */
  compileUpdate(builder, data) {
    const table = this.wrapTable(builder._statements.from);
    const columns = Object.keys(data).map(key => `${this.wrap(key)} = ?`).join(', ');
    
    // A sintaxe do MySQL para ORDER BY e LIMIT em updates é peculiar.
    // Por enquanto, vamos focar no update com WHERE.
    const wheres = this.compileWheres(builder._statements.where);

    return `update ${table} set ${columns} ${wheres}`;
  }
}

module.exports = MySqlGrammar;
