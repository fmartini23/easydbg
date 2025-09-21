// lib/query/grammars/oracle-grammar.js

'use strict';

const BaseGrammar = require('./base-grammar');

/**
 * @class OracleGrammar
 * @extends BaseGrammar
 *
 * Fornece a lógica de compilação de SQL específica para o Oracle Database.
 *
 * Principais diferenças em relação à BaseGrammar:
 * - Usa aspas duplas `"` para identificadores, mas o tratamento de maiúsculas/minúsculas é rigoroso.
 * - Implementa a sintaxe de paginação moderna (12c+) com `OFFSET ... FETCH`.
 * - Não possui um `LIMIT` simples para `UPDATE` ou `DELETE`.
 * - Usa a cláusula `RETURNING ... INTO ...` para obter o ID após um `INSERT`.
 */
class OracleGrammar extends BaseGrammar {
  constructor() {
    super();
    // Oracle usa aspas duplas, que já é o padrão da BaseGrammar.
  }

  /**
   * Compila uma consulta SELECT completa, adicionando a lógica de paginação do Oracle 12c+.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder com os statements.
   * @returns {string} A string SQL compilada.
   */
  compileSelect(builder) {
    const statements = builder._statements;

    // A sintaxe de paginação do Oracle requer uma cláusula ORDER BY.
    // Se não for fornecida, a consulta pode falhar ou retornar resultados inconsistentes.
    // Diferente do MSSQL, não adicionaremos uma ordenação padrão para forçar o usuário a ser explícito.
    if ((statements.offset || statements.limit) && statements.orderBy.length === 0) {
        // Lançar um erro ou um aviso pode ser uma boa prática aqui.
        console.warn('A paginação no Oracle sem uma cláusula ORDER BY pode resultar em uma ordem de linhas inconsistente.');
    }

    const parts = [
      this.compileSelectCore(statements.select),
      this.compileFrom(statements.from),
      // Adicionar joins aqui no futuro
      this.compileWheres(statements.where),
      // Adicionar group by aqui no futuro
      this.compileOrderBy(statements.orderBy),
      this.compileOffset(statements.offset),
      this.compileLimit(statements.limit),
    ];

    return parts.filter(part => part).join(' ');
  }

  /**
   * Compila a cláusula 'offset' para Oracle.
   * @param {number} offset - O número de linhas a serem puladas.
   * @returns {string|null}
   */
  compileOffset(offset) {
    if (offset) {
      return `offset ${parseInt(offset, 10)} rows`;
    }
    return null;
  }

  /**
   * Compila a cláusula 'limit' (FETCH) para Oracle.
   * @override
   * @param {number} limit - O número de linhas a serem retornadas.
   * @returns {string|null}
   */
  compileLimit(limit) {
    if (limit) {
      return `fetch next ${parseInt(limit, 10)} rows only`;
    }
    return null;
  }

  /**
   * Compila um statement INSERT para Oracle.
   * Esta implementação é básica. Uma versão avançada lidaria com a cláusula RETURNING.
   * @override
   * @param {string} table - O nome da tabela.
   * @param {object} data - Os dados a serem inseridos.
   * @returns {string}
   */
  compileInsert(table, data) {
    const columns = this.columnize(Object.keys(data));
    // No Oracle, os placeholders são nomeados (:1, :2, etc.)
    const placeholders = Object.keys(data).map((_, i) => `:${i + 1}`).join(', ');
    return `insert into ${this.wrapTable(table)} (${columns}) values (${placeholders})`;
  }

  /**
   * Compila um statement INSERT com a cláusula RETURNING.
   * Este é um método customizado para o Oracle.
   * @param {string} table - O nome da tabela.
   * @param {object} data - Os dados a serem inseridos.
   * @param {string} returningColumn - A coluna a ser retornada (ex: 'id').
   * @returns {string}
   */
  compileInsertWithReturning(table, data, returningColumn) {
    const insertSql = this.compileInsert(table, data);
    // O placeholder para o valor retornado é o último na lista de bindings.
    const returningPlaceholder = `:${Object.keys(data).length + 1}`;
    return `${insertSql} returning ${this.wrap(returningColumn)} into ${returningPlaceholder}`;
  }

  /**
   * Compila um statement UPDATE para Oracle.
   * Oracle não suporta `ORDER BY` ou `LIMIT` em um `UPDATE` padrão.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @param {object} data - Os dados a serem atualizados.
   * @returns {string}
   */
  compileUpdate(builder, data) {
    const table = this.wrapTable(builder._statements.from);
    // Placeholders nomeados para a parte SET
    const columns = Object.keys(data).map((key, i) => `${this.wrap(key)} = :${i + 1}`).join(', ');
    
    // A lógica de WHERE precisa ser ajustada para continuar a numeração dos placeholders.
    const whereClauses = (builder._statements.where || []).map((where, i) => {
        const placeholderIndex = Object.keys(data).length + i + 1;
        return `${this.wrap(where.column)} ${where.operator} :${placeholderIndex}`;
    }).join(' and ');

    const wheres = whereClauses ? `where ${whereClauses}` : '';

    return `update ${table} set ${columns} ${wheres}`;
  }
}

module.exports = OracleGrammar;
