// lib/utils/parameter-handler.js

'use strict';

/**
 * @module ParameterHandler
 *
 * Este módulo é responsável por preparar e formatar os parâmetros (bindings)
 * de uma consulta SQL de acordo com a sintaxe de placeholder exigida pelo
 * driver do banco de dados específico.
 *
 * O Query Builder e as Grammars geram SQL com placeholders '?' por padrão.
 * Este handler converte esses placeholders para o formato correto ($1, :1, etc.)
 * antes da execução da consulta.
 */

/**
 * Prepara a string SQL e os bindings para um dialeto específico.
 *
 * @param {string} clientType - O tipo de cliente de banco de dados (ex: 'postgres', 'oracle', 'mysql').
 * @param {string} sql - A string SQL compilada com placeholders '?'.
 * @param {Array} bindings - O array de valores a serem vinculados à consulta.
 * @returns {{sql: string, bindings: Array}} Um objeto contendo o SQL formatado e os bindings.
 */
function prepare(clientType, sql, bindings) {
  switch (clientType.toLowerCase()) {
    case 'postgres':
      return preparePostgres(sql, bindings);

    case 'oracle':
      return prepareOracle(sql, bindings);

    // MySQL, MSSQL e SQLite usam '?' como placeholder, então não precisam de formatação.
    case 'mysql':
    case 'mssql':
    default:
      return { sql, bindings };
  }
}

/**
 * Formata a consulta para o PostgreSQL, substituindo '?' por '$1', '$2', etc.
 *
 * @private
 * @param {string} sql - A string SQL com placeholders '?'.
 * @param {Array} bindings - O array de valores.
 * @returns {{sql: string, bindings: Array}}
 */
function preparePostgres(sql, bindings) {
  let index = 0;
  const newSql = sql.replace(/\?/g, () => {
    index++;
    return `$${index}`;
  });
  return { sql: newSql, bindings };
}

/**
 * Formata a consulta para o Oracle, substituindo '?' por ':1', ':2', etc.
 *
 * @private
 * @param {string} sql - A string SQL com placeholders '?'.
 * @param {Array} bindings - O array de valores.
 * @returns {{sql: string, bindings: Array}}
 */
function prepareOracle(sql, bindings) {
  let index = 0;
  const newSql = sql.replace(/\?/g, () => {
    index++;
    return `:${index}`;
  });
  return { sql: newSql, bindings };
}

module.exports = {
  prepare,
};
