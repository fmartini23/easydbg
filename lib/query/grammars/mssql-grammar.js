// lib/query/grammars/mssql-grammar.js

'use strict';

const BaseGrammar = require('./base-grammar');

/**
 * @class MssqlGrammar
 *
 * A gramática específica para Microsoft SQL Server.
 * Sobrescreve a lógica de compilação para paginação (LIMIT/OFFSET)
 * e a forma de proteger identificadores.
 */
class MssqlGrammar extends BaseGrammar {
  /**
   * Compila uma consulta SELECT completa para MSSQL.
   * A principal diferença é a sintaxe `OFFSET ... FETCH NEXT ...` para paginação.
   * @param {object} statements - O objeto de estado do QueryBuilder.
   * @returns {string} A string SQL compilada.
   */
  compileSelect(statements) {
    // Se não houver paginação, podemos usar a lógica da gramática base.
    if (!statements.limit && !statements.offset) {
      return super.compileSelect(statements);
    }

    // Se houver paginação, precisamos construir a query com a sintaxe do MSSQL.
    // Primeiro, compilamos a parte principal da query usando a lógica da classe pai.
    let sql = super.compileSelect(statements);

    // A cláusula ORDER BY é OBRIGATÓRIA para usar OFFSET no MSSQL.
    // Se não for fornecida, ordenamos pela primeira coluna para evitar um erro de sintaxe.
    if (!statements.orders || statements.orders.length === 0) {
      // Tenta pegar a primeira coluna do select, ou usa '(SELECT NULL)' como último recurso.
      const firstColumn = statements.select[0] !== '*' ? statements.select[0] : '(SELECT NULL)';
      sql += ` ORDER BY ${this.wrap(firstColumn)}`;
      console.warn('Aviso: A paginação no MSSQL requer uma cláusula ORDER BY. Uma ordenação padrão foi adicionada para evitar erros.');
    }

    const offset = statements.offset || 0;
    sql += ` OFFSET ${offset} ROWS`;

    if (statements.limit) {
      sql += ` FETCH NEXT ${statements.limit} ROWS ONLY`;
    }

    return sql;
  }

  /**
   * Protege um identificador (nome de tabela ou coluna) para MSSQL.
   * @param {string} value - O valor a ser protegido.
   * @returns {string} O valor protegido com colchetes (ex: [users]).
   */
  wrap(value) {
    if (value === '*') {
      return value;
    }
    // Remove quaisquer colchetes existentes para evitar duplicação e os adiciona novamente.
    return `[${value.replace(/\[|\]/g, '')}]`;
  }
}

module.exports = MssqlGrammar;
