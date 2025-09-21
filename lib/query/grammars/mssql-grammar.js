// lib/query/grammars/mssql-grammar.js

'use strict';

const BaseGrammar = require('./base-grammar');

/**
 * @class MssqlGrammar
 * @extends BaseGrammar
 *
 * Fornece a lógica de compilação de SQL específica para o Microsoft SQL Server.
 *
 * Principais diferenças em relação à BaseGrammar:
 * - Usa colchetes `[]` como caractere de proteção padrão para identificadores.
 * - Implementa a sintaxe de paginação com `OFFSET ... FETCH`.
 * - Não suporta `returning` em inserts por padrão de forma simples.
 * - Usa uma sintaxe de `UPDATE` com `FROM` para joins.
 */
class MssqlGrammar extends BaseGrammar {
  constructor() {
    super();
    // O padrão mais seguro para MSSQL é usar colchetes para envolver identificadores.
    this.wrapper = '[';
    this.closingWrapper = ']'; // Adicionamos um wrapper de fechamento
  }

  /**
   * Envolve um identificador com os colchetes de proteção do MSSQL.
   * @override
   * @param {string} value
   * @returns {string}
   */
  wrap(value) {
    if (value === '*') return value;
    const parts = value.split('.');
    // Usa o wrapper de abertura e fechamento
    return parts.map(part => `${this.wrapper}${part}${this.closingWrapper}`).join('.');
  }

  /**
   * Compila uma consulta SELECT completa, adicionando a lógica de paginação.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder com os statements.
   * @returns {string} A string SQL compilada.
   */
  compileSelect(builder) {
    const statements = builder._statements;

    // Se não houver `orderBy`, a paginação com `OFFSET` não funciona no MSSQL.
    // Adicionamos uma ordenação padrão para garantir que a consulta seja válida.
    if ((statements.offset || statements.limit) && statements.orderBy.length === 0) {
      statements.orderBy.push({ column: '(SELECT NULL)', direction: 'ASC' });
    }

    // Orquestra a compilação, chamando os métodos da classe base e os sobrescritos.
    const parts = [
      this.compileSelectCore(statements.select),
      this.compileFrom(statements.from),
      // Adicionar joins aqui no futuro
      this.compileWheres(statements.where),
      // Adicionar group by aqui no futuro
      this.compileOrderBy(statements.orderBy),
      this.compileOffset(statements.offset), // MSSQL usa OFFSET/FETCH
      this.compileLimit(statements.limit),   // que são compilados juntos.
    ];

    return parts.filter(part => part).join(' ');
  }

  /**
   * Compila a cláusula 'limit' (FETCH) para MSSQL.
   * Este método é chamado após `compileOffset`.
   * @override
   * @param {number} limit - O número de linhas a serem retornadas.
   * @returns {string|null}
   */
  compileLimit(limit) {
    if (limit) {
      // A sintaxe é 'FETCH NEXT n ROWS ONLY'.
      return `fetch next ${limit} rows only`;
    }
    return null;
  }

  /**
   * Compila a cláusula 'offset' para MSSQL.
   * @override
   * @param {number} offset - O número de linhas a serem puladas.
   * @returns {string|null}
   */
  compileOffset(offset) {
    if (offset) {
      // A sintaxe é 'OFFSET n ROWS'.
      return `offset ${offset} rows`;
    }
    return null;
  }

  /**
   * Compila um statement UPDATE para MSSQL.
   * A sintaxe do MSSQL para updates com joins ou a partir de outras tabelas é diferente.
   * Esta implementação é mais robusta para o MSSQL.
   * @override
   * @param {QueryBuilder} builder - A instância do Query Builder.
   * @param {object} data - Os dados a serem atualizados.
   * @returns {string}
   */
  compileUpdate(builder, data) {
    const table = this.wrapTable(builder._statements.from);
    const columns = Object.keys(data).map(key => `${this.wrap(key)} = ?`).join(', ');
    const wheres = this.compileWheres(builder._statements.where);

    // A sintaxe `UPDATE ... SET ... FROM ... WHERE` é comum no MSSQL,
    // mas para um update simples, a sintaxe da BaseGrammar é suficiente.
    // No entanto, vamos manter a estrutura para futuras expansões com joins.
    // Por enquanto, a sintaxe é `UPDATE table SET col = ? WHERE ...`
    return `update ${table} set ${columns} ${wheres}`;
  }

  /**
   * Compila um statement DELETE para MSSQL.
   * A gramática base já é compatível, mas mantemos o método para consistência
   * e possíveis futuras otimizações.
   * @override
   * @param {QueryBuilder} builder
   * @returns {string}
   */
  compileDelete(builder) {
    const table = this.wrapTable(builder._statements.from);
    const wheres = this.compileWheres(builder._statements.where);
    return `delete from ${table} ${wheres}`;
  }
}

module.exports = MssqlGrammar;
